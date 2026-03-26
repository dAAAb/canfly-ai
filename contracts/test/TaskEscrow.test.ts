import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { TaskEscrow } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TaskEscrow", function () {
  let escrow: TaskEscrow;
  let usdc: any; // MockERC20
  let owner: SignerWithAddress;
  let buyer: SignerWithAddress;
  let seller: SignerWithAddress;
  let other: SignerWithAddress;

  const TASK_ID = ethers.id("task-001");
  const AMOUNT = 10_000_000n; // 10 USDC
  const ONE_DAY = 86400;
  const ONE_HOUR = 3600;

  async function deployMockUSDC() {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const token = await MockERC20.deploy("USD Coin", "USDC", 6);
    return token;
  }

  beforeEach(async function () {
    [owner, buyer, seller, other] = await ethers.getSigners();

    usdc = await deployMockUSDC();
    escrow = (await (
      await ethers.getContractFactory("TaskEscrow")
    ).deploy(await usdc.getAddress())) as TaskEscrow;

    // Mint USDC to buyer and approve escrow
    await usdc.mint(buyer.address, 1_000_000_000n); // 1000 USDC
    await usdc.connect(buyer).approve(await escrow.getAddress(), ethers.MaxUint256);
  });

  describe("deposit", function () {
    it("should deposit USDC into escrow", async function () {
      const slaDeadline = (await time.latest()) + ONE_DAY;

      await expect(
        escrow.connect(buyer).deposit(TASK_ID, seller.address, AMOUNT, slaDeadline)
      )
        .to.emit(escrow, "Deposited")
        .withArgs(TASK_ID, buyer.address, seller.address, AMOUNT, slaDeadline);

      const task = await escrow.getTask(TASK_ID);
      expect(task.buyer).to.equal(buyer.address);
      expect(task.seller).to.equal(seller.address);
      expect(task.amount).to.equal(AMOUNT);
      expect(task.status).to.equal(1); // Deposited

      // USDC transferred to contract
      expect(await usdc.balanceOf(await escrow.getAddress())).to.equal(AMOUNT);
    });

    it("should reject amount below minimum", async function () {
      const slaDeadline = (await time.latest()) + ONE_DAY;
      await expect(
        escrow.connect(buyer).deposit(TASK_ID, seller.address, 5_000n, slaDeadline)
      ).to.be.revertedWith("Below minimum 0.01 USDC");
    });

    it("should reject expired SLA deadline", async function () {
      const pastDeadline = (await time.latest()) - 100;
      await expect(
        escrow.connect(buyer).deposit(TASK_ID, seller.address, AMOUNT, pastDeadline)
      ).to.be.revertedWith("SLA deadline must be in the future");
    });

    it("should reject zero seller address", async function () {
      const slaDeadline = (await time.latest()) + ONE_DAY;
      await expect(
        escrow.connect(buyer).deposit(TASK_ID, ethers.ZeroAddress, AMOUNT, slaDeadline)
      ).to.be.revertedWith("Zero seller address");
    });

    it("should reject buyer == seller", async function () {
      const slaDeadline = (await time.latest()) + ONE_DAY;
      await expect(
        escrow.connect(buyer).deposit(TASK_ID, buyer.address, AMOUNT, slaDeadline)
      ).to.be.revertedWith("Buyer cannot be seller");
    });

    it("should reject duplicate task ID", async function () {
      const slaDeadline = (await time.latest()) + ONE_DAY;
      await escrow.connect(buyer).deposit(TASK_ID, seller.address, AMOUNT, slaDeadline);
      await expect(
        escrow.connect(buyer).deposit(TASK_ID, seller.address, AMOUNT, slaDeadline)
      ).to.be.revertedWith("Task ID already used");
    });
  });

  describe("complete", function () {
    let slaDeadline: number;

    beforeEach(async function () {
      slaDeadline = (await time.latest()) + ONE_DAY;
      await escrow.connect(buyer).deposit(TASK_ID, seller.address, AMOUNT, slaDeadline);
    });

    it("should allow seller to mark complete", async function () {
      await expect(escrow.connect(seller).complete(TASK_ID))
        .to.emit(escrow, "Completed");

      const task = await escrow.getTask(TASK_ID);
      expect(task.status).to.equal(2); // Completed
      expect(task.disputeDeadline).to.be.gt(0);
    });

    it("should allow owner to mark complete", async function () {
      await expect(escrow.connect(owner).complete(TASK_ID))
        .to.emit(escrow, "Completed");
    });

    it("should reject non-seller/non-owner", async function () {
      await expect(
        escrow.connect(buyer).complete(TASK_ID)
      ).to.be.revertedWith("Not seller or owner");
    });

    it("should reject if SLA deadline passed", async function () {
      await time.increaseTo(slaDeadline + 1);
      await expect(
        escrow.connect(seller).complete(TASK_ID)
      ).to.be.revertedWith("SLA deadline passed");
    });
  });

  describe("confirm", function () {
    beforeEach(async function () {
      const slaDeadline = (await time.latest()) + ONE_DAY;
      await escrow.connect(buyer).deposit(TASK_ID, seller.address, AMOUNT, slaDeadline);
      await escrow.connect(seller).complete(TASK_ID);
    });

    it("should release funds to seller on confirm", async function () {
      const sellerBefore = await usdc.balanceOf(seller.address);

      await expect(escrow.connect(buyer).confirm(TASK_ID))
        .to.emit(escrow, "Released")
        .withArgs(TASK_ID, seller.address, AMOUNT);

      expect(await usdc.balanceOf(seller.address)).to.equal(sellerBefore + AMOUNT);

      const task = await escrow.getTask(TASK_ID);
      expect(task.status).to.equal(3); // Released
    });

    it("should reject non-buyer", async function () {
      await expect(
        escrow.connect(other).confirm(TASK_ID)
      ).to.be.revertedWith("Not buyer or owner");
    });
  });

  describe("reject", function () {
    beforeEach(async function () {
      const slaDeadline = (await time.latest()) + ONE_DAY;
      await escrow.connect(buyer).deposit(TASK_ID, seller.address, AMOUNT, slaDeadline);
      await escrow.connect(seller).complete(TASK_ID);
    });

    it("should refund buyer on reject", async function () {
      const buyerBefore = await usdc.balanceOf(buyer.address);

      await expect(escrow.connect(buyer).reject(TASK_ID))
        .to.emit(escrow, "Rejected")
        .withArgs(TASK_ID, buyer.address, AMOUNT);

      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + AMOUNT);

      const task = await escrow.getTask(TASK_ID);
      expect(task.status).to.equal(5); // Rejected
    });

    it("should reject after dispute window", async function () {
      const task = await escrow.getTask(TASK_ID);
      await time.increaseTo(Number(task.disputeDeadline) + 1);
      await expect(
        escrow.connect(buyer).reject(TASK_ID)
      ).to.be.revertedWith("Dispute window closed");
    });

    it("should reject non-buyer", async function () {
      await expect(
        escrow.connect(other).reject(TASK_ID)
      ).to.be.revertedWith("Not buyer or owner");
    });
  });

  describe("releaseAfterDispute", function () {
    beforeEach(async function () {
      const slaDeadline = (await time.latest()) + ONE_DAY;
      await escrow.connect(buyer).deposit(TASK_ID, seller.address, AMOUNT, slaDeadline);
      await escrow.connect(seller).complete(TASK_ID);
    });

    it("should release to seller after dispute window expires", async function () {
      const task = await escrow.getTask(TASK_ID);
      await time.increaseTo(Number(task.disputeDeadline) + 1);

      const sellerBefore = await usdc.balanceOf(seller.address);
      await expect(escrow.connect(other).releaseAfterDispute(TASK_ID))
        .to.emit(escrow, "Released")
        .withArgs(TASK_ID, seller.address, AMOUNT);

      expect(await usdc.balanceOf(seller.address)).to.equal(sellerBefore + AMOUNT);
    });

    it("should reject before dispute window expires", async function () {
      await expect(
        escrow.connect(other).releaseAfterDispute(TASK_ID)
      ).to.be.revertedWith("Dispute window still open");
    });
  });

  describe("refund (SLA timeout)", function () {
    let slaDeadline: number;

    beforeEach(async function () {
      slaDeadline = (await time.latest()) + ONE_HOUR;
      await escrow.connect(buyer).deposit(TASK_ID, seller.address, AMOUNT, slaDeadline);
    });

    it("should refund buyer after SLA deadline", async function () {
      await time.increaseTo(slaDeadline + 1);
      const buyerBefore = await usdc.balanceOf(buyer.address);

      await expect(escrow.connect(buyer).refund(TASK_ID))
        .to.emit(escrow, "Refunded")
        .withArgs(TASK_ID, buyer.address, AMOUNT);

      expect(await usdc.balanceOf(buyer.address)).to.equal(buyerBefore + AMOUNT);
    });

    it("should reject refund before SLA deadline", async function () {
      await expect(
        escrow.connect(buyer).refund(TASK_ID)
      ).to.be.revertedWith("SLA deadline not passed");
    });

    it("should reject refund if already completed", async function () {
      await escrow.connect(seller).complete(TASK_ID);
      await time.increaseTo(slaDeadline + 1);
      await expect(
        escrow.connect(buyer).refund(TASK_ID)
      ).to.be.revertedWith("Not in deposited state");
    });

    it("should reject refund from non-buyer/non-owner", async function () {
      await time.increaseTo(slaDeadline + 1);
      await expect(
        escrow.connect(other).refund(TASK_ID)
      ).to.be.revertedWith("Not buyer or owner");
    });
  });

  describe("depositWithWindow", function () {
    it("should allow custom dispute window", async function () {
      const slaDeadline = (await time.latest()) + ONE_DAY;
      const customWindow = ONE_HOUR * 48; // 48 hours

      await escrow.connect(buyer).depositWithWindow(
        TASK_ID, seller.address, AMOUNT, slaDeadline, customWindow
      );

      const task = await escrow.getTask(TASK_ID);
      expect(task.disputeWindow).to.equal(customWindow);
    });
  });

  describe("transferOwnership", function () {
    it("should transfer ownership", async function () {
      await expect(escrow.connect(owner).transferOwnership(other.address))
        .to.emit(escrow, "OwnerChanged")
        .withArgs(owner.address, other.address);
    });

    it("should reject non-owner", async function () {
      await expect(
        escrow.connect(buyer).transferOwnership(other.address)
      ).to.be.revertedWith("Not owner");
    });

    it("should reject zero address", async function () {
      await expect(
        escrow.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero address");
    });
  });
});
