import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Credencea with account:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  const Credencea = await ethers.getContractFactory("Credencea");
  const credencea = await Credencea.deploy();
  await credencea.waitForDeployment();
  const address = await credencea.getAddress();

  console.log("\nCredencea deployed to:", address);
  console.log("\nCopy to frontend/.env:");
  console.log(`VITE_CONTRACT_ADDRESS=${address}`);
  console.log(`VITE_CHAIN_ID=11155111`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
