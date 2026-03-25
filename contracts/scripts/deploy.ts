import { ethers } from "hardhat";

// Base mainnet USDC
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TaskEscrow with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
  const escrow = await TaskEscrow.deploy(USDC_BASE);
  await escrow.waitForDeployment();

  const address = await escrow.getAddress();
  console.log("TaskEscrow deployed to:", address);
  console.log("\nNext steps:");
  console.log(`1. Add TASK_ESCROW_CONTRACT=${address} to .env`);
  console.log(`2. Verify on BaseScan: npx hardhat verify --network baseMainnet ${address} ${USDC_BASE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
