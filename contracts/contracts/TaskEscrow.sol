// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title TaskEscrow
 * @notice USDC escrow for CanFly A2A task payments.
 *         Buyer deposits USDC tied to a task ID. Seller completes work,
 *         then buyer confirms (releases funds) or rejects (refunds).
 *         SLA deadline auto-refunds if seller doesn't deliver on time.
 *
 *         Lifecycle:
 *           deposit()  → buyer locks USDC
 *           complete() → seller marks delivery
 *           confirm()  → buyer approves → USDC released to seller
 *           reject()   → buyer rejects within dispute window → refund
 *           refund()   → anyone after SLA deadline if not completed
 *
 *         Based on BaseMail PaymentEscrow.sol
 */
contract TaskEscrow {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public owner;

    uint256 public constant MIN_AMOUNT = 100_000; // 0.10 USDC (6 decimals)
    uint256 public constant DEFAULT_DISPUTE_WINDOW = 24 hours;

    enum Status {
        None,
        Deposited,
        Completed,   // seller marked complete, dispute window open
        Released,
        Refunded,
        Rejected
    }

    struct Task {
        address buyer;
        address seller;
        uint256 amount;
        uint256 slaDeadline;      // seller must complete by this time
        uint256 disputeDeadline;  // buyer must confirm/reject by this time (set on complete)
        uint256 disputeWindow;    // duration of dispute window in seconds
        Status status;
    }

    mapping(bytes32 => Task) public tasks;

    event Deposited(bytes32 indexed taskId, address indexed buyer, address indexed seller, uint256 amount, uint256 slaDeadline);
    event Completed(bytes32 indexed taskId, uint256 disputeDeadline);
    event Released(bytes32 indexed taskId, address indexed seller, uint256 amount);
    event Refunded(bytes32 indexed taskId, address indexed buyer, uint256 amount);
    event Rejected(bytes32 indexed taskId, address indexed buyer, uint256 amount);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _usdc) {
        require(_usdc != address(0), "Zero USDC address");
        usdc = IERC20(_usdc);
        owner = msg.sender;
    }

    /// @notice Buyer deposits USDC into escrow for a task
    /// @param taskId      Unique task identifier
    /// @param seller      Seller wallet address
    /// @param amount      USDC amount (6 decimals)
    /// @param slaDeadline Unix timestamp — seller must complete by this time
    function deposit(
        bytes32 taskId,
        address seller,
        uint256 amount,
        uint256 slaDeadline
    ) external {
        return depositWithWindow(taskId, seller, amount, slaDeadline, DEFAULT_DISPUTE_WINDOW);
    }

    /// @notice Buyer deposits USDC with custom dispute window
    /// @param taskId         Unique task identifier
    /// @param seller         Seller wallet address
    /// @param amount         USDC amount (6 decimals)
    /// @param slaDeadline    Unix timestamp — seller must complete by this time
    /// @param disputeWindow  Duration in seconds for buyer to confirm/reject after completion
    function depositWithWindow(
        bytes32 taskId,
        address seller,
        uint256 amount,
        uint256 slaDeadline,
        uint256 disputeWindow
    ) public {
        require(amount >= MIN_AMOUNT, "Below minimum 0.10 USDC");
        require(slaDeadline > block.timestamp, "SLA deadline must be in the future");
        require(seller != address(0), "Zero seller address");
        require(seller != msg.sender, "Buyer cannot be seller");
        require(disputeWindow > 0, "Dispute window must be > 0");
        require(tasks[taskId].status == Status.None, "Task ID already used");

        tasks[taskId] = Task({
            buyer: msg.sender,
            seller: seller,
            amount: amount,
            slaDeadline: slaDeadline,
            disputeDeadline: 0,
            disputeWindow: disputeWindow,
            status: Status.Deposited
        });

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        emit Deposited(taskId, msg.sender, seller, amount, slaDeadline);
    }

    /// @notice Seller marks task as completed, starting the dispute window
    /// @param taskId Task identifier
    function complete(bytes32 taskId) external {
        Task storage t = tasks[taskId];
        require(t.status == Status.Deposited, "Task not in deposited state");
        require(msg.sender == t.seller || msg.sender == owner, "Not seller or owner");
        require(block.timestamp <= t.slaDeadline, "SLA deadline passed");

        t.status = Status.Completed;
        t.disputeDeadline = block.timestamp + t.disputeWindow;

        emit Completed(taskId, t.disputeDeadline);
    }

    /// @notice Buyer confirms delivery — releases USDC to seller
    /// @param taskId Task identifier
    function confirm(bytes32 taskId) external {
        Task storage t = tasks[taskId];
        require(t.status == Status.Completed, "Task not completed");
        require(msg.sender == t.buyer || msg.sender == owner, "Not buyer or owner");

        t.status = Status.Released;
        usdc.safeTransfer(t.seller, t.amount);
        emit Released(taskId, t.seller, t.amount);
    }

    /// @notice Buyer rejects delivery within dispute window — refunds buyer
    /// @param taskId Task identifier
    function reject(bytes32 taskId) external {
        Task storage t = tasks[taskId];
        require(t.status == Status.Completed, "Task not completed");
        require(msg.sender == t.buyer || msg.sender == owner, "Not buyer or owner");
        require(block.timestamp <= t.disputeDeadline, "Dispute window closed");

        t.status = Status.Rejected;
        usdc.safeTransfer(t.buyer, t.amount);
        emit Rejected(taskId, t.buyer, t.amount);
    }

    /// @notice Release funds after dispute window expires without rejection
    /// @dev Anyone can call this to finalize — seller gets paid
    /// @param taskId Task identifier
    function releaseAfterDispute(bytes32 taskId) external {
        Task storage t = tasks[taskId];
        require(t.status == Status.Completed, "Task not completed");
        require(block.timestamp > t.disputeDeadline, "Dispute window still open");

        t.status = Status.Released;
        usdc.safeTransfer(t.seller, t.amount);
        emit Released(taskId, t.seller, t.amount);
    }

    /// @notice Refund buyer if SLA deadline passed and seller didn't complete
    /// @param taskId Task identifier
    function refund(bytes32 taskId) external {
        Task storage t = tasks[taskId];
        require(t.status == Status.Deposited, "Not in deposited state");
        require(block.timestamp > t.slaDeadline, "SLA deadline not passed");
        require(
            msg.sender == t.buyer || msg.sender == owner,
            "Not buyer or owner"
        );

        t.status = Status.Refunded;
        usdc.safeTransfer(t.buyer, t.amount);
        emit Refunded(taskId, t.buyer, t.amount);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        emit OwnerChanged(owner, newOwner);
        owner = newOwner;
    }

    /// @notice View task details
    function getTask(bytes32 taskId) external view returns (
        address buyer,
        address seller,
        uint256 amount,
        uint256 slaDeadline,
        uint256 disputeDeadline,
        uint256 disputeWindow,
        Status status
    ) {
        Task memory t = tasks[taskId];
        return (t.buyer, t.seller, t.amount, t.slaDeadline, t.disputeDeadline, t.disputeWindow, t.status);
    }
}
