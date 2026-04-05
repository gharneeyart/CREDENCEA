import { ethers } from "ethers";
import type { InstitutionApplication } from "./onboardingStore";

const REVIEW_WINDOW_MS = 5 * 60 * 1000;
const OWNER_ABI = ["function owner() view returns (address)"];
const INSTITUTION_ABI = [
  "function addInstitution(address institution, string name, string abbrev, string themeColor, string accentColor, uint256 dailyCap)",
];

function getRpcUrl() {
  return process.env.ONBOARDING_RPC_URL
    ?? process.env.SEPOLIA_RPC_URL
    ?? "https://ethereum-sepolia-rpc.publicnode.com";
}

function getContractAddress() {
  const address = process.env.VITE_CONTRACT_ADDRESS ?? process.env.CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("Missing contract address for onboarding review.");
  }

  return ethers.getAddress(address);
}

async function getCurrentOwner() {
  const provider = new ethers.JsonRpcProvider(getRpcUrl());
  const contract = new ethers.Contract(getContractAddress(), OWNER_ABI, provider);
  const owner = await contract.owner();
  return {
    owner: ethers.getAddress(owner),
    provider,
  };
}

function buildRejectionMessage(payload: {
  applicationId: string;
  status: "rejected";
  note: string;
  timestamp: string;
}) {
  return [
    "Credencea admin review",
    `Application: ${payload.applicationId}`,
    `Status: ${payload.status}`,
    `Note: ${payload.note || "-"}`,
    `Timestamp: ${payload.timestamp}`,
  ].join("\n");
}

export async function verifyRejectionReview(payload: {
  applicationId: string;
  status: "rejected";
  note?: string;
  reviewerAddress?: string;
  reviewTimestamp?: string;
  signature?: string;
}) {
  if (!payload.reviewerAddress || !payload.reviewTimestamp || !payload.signature) {
    throw new Error("Owner signature is required to reject an application.");
  }

  const timestamp = new Date(payload.reviewTimestamp).getTime();
  if (Number.isNaN(timestamp) || Math.abs(Date.now() - timestamp) > REVIEW_WINDOW_MS) {
    throw new Error("The rejection signature has expired. Please sign again.");
  }

  const reviewerAddress = ethers.getAddress(payload.reviewerAddress);
  const message = buildRejectionMessage({
    applicationId: payload.applicationId,
    status: "rejected",
    note: payload.note?.trim() ?? "",
    timestamp: payload.reviewTimestamp,
  });

  const recoveredAddress = ethers.verifyMessage(message, payload.signature);
  if (ethers.getAddress(recoveredAddress) !== reviewerAddress) {
    throw new Error("Invalid owner signature.");
  }

  const { owner } = await getCurrentOwner();
  if (owner !== reviewerAddress) {
    throw new Error("Only the contract owner can reject applications.");
  }

  return owner;
}

export async function verifyApprovalReview(application: InstitutionApplication, txHash?: string) {
  if (!txHash) {
    throw new Error("Approval requires the addInstitution transaction hash.");
  }

  const { owner, provider } = await getCurrentOwner();
  const [transaction, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);

  if (!transaction || !receipt) {
    throw new Error("Unable to find the approval transaction on-chain.");
  }

  if (receipt.status !== 1) {
    throw new Error("The approval transaction was not successful.");
  }

  if (!transaction.to || ethers.getAddress(transaction.to) !== getContractAddress()) {
    throw new Error("The approval transaction was not sent to the Credencea contract.");
  }

  if (ethers.getAddress(transaction.from) !== owner) {
    throw new Error("Only the current contract owner can approve institution applications.");
  }

  const iface = new ethers.Interface(INSTITUTION_ABI);
  const parsed = iface.parseTransaction({ data: transaction.data, value: transaction.value });

  if (!parsed || parsed.name !== "addInstitution") {
    throw new Error("The approval transaction is not an addInstitution call.");
  }

  const [institution, name, abbrev, themeColor, accentColor, dailyCap] = parsed.args;
  if (ethers.getAddress(institution) !== ethers.getAddress(application.walletAddress)) {
    throw new Error("Approval transaction wallet does not match the selected application.");
  }

  if (String(name).trim() !== application.name.trim()) {
    throw new Error("Approval transaction institution name does not match the application.");
  }

  if (String(abbrev).trim().toUpperCase() !== application.abbrev.trim().toUpperCase()) {
    throw new Error("Approval transaction abbreviation does not match the application.");
  }

  if (String(themeColor).trim().toLowerCase() !== application.themeColor.trim().toLowerCase()) {
    throw new Error("Approval transaction theme colour does not match the application.");
  }

  if (String(accentColor).trim().toLowerCase() !== application.accentColor.trim().toLowerCase()) {
    throw new Error("Approval transaction accent colour does not match the application.");
  }

  return {
    owner,
    dailyCap: Number(dailyCap),
  };
}
