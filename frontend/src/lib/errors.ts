import { ethers } from "ethers";
import { CREDENCEA_ABI } from "@/lib/contract";

const contractInterface = new ethers.Interface(CREDENCEA_ABI);

type ErrorWithDetails = {
  code?: string | number;
  message?: string;
  shortMessage?: string;
  reason?: string;
  data?: unknown;
  error?: unknown;
  info?: {
    error?: {
      code?: number;
      message?: string;
      data?: unknown;
    };
  };
};

function isHexData(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("0x");
}

function getRevertData(error: unknown): string | null {
  const current = error as ErrorWithDetails | undefined;
  if (!current) return null;

  if (isHexData(current.data)) return current.data;
  if (isHexData(current.info?.error?.data)) return current.info.error.data;
  if (current.error) return getRevertData(current.error);

  return null;
}

function formatDateFromSeconds(value: bigint): string {
  return new Date(Number(value) * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDecodedContractError(error: ethers.ErrorDescription): string | null {
  switch (error.name) {
    case "NotAnInstitution":
      return "This wallet is not a whitelisted institution.";
    case "AlreadyInstitution":
      return "This wallet is already registered as an institution.";
    case "SoulboundCannotTransfer":
      return "Certificates are soulbound and cannot be transferred.";
    case "TokenDoesNotExist":
      return "This certificate does not exist.";
    case "TokenAlreadyRevoked":
      return "This certificate has already been revoked.";
    case "NotTokenIssuer":
      return "Only the issuing institution can perform this action.";
    case "ZeroAddress":
      return "Wallet address cannot be the zero address.";
    case "EmptyString":
      return "A required field is empty.";
    case "URITooLong":
      return "The generated metadata URI is too long for the contract.";
    case "BatchTooLarge":
      return "Batch issuance is limited to 50 certificates per transaction.";
    case "DailyCapExceeded": {
      const [issued, cap] = error.args as unknown as [bigint, bigint];
      return `Daily issuance cap exceeded. ${issued.toString()} certificate(s) have already been issued today out of ${cap.toString()}.`;
    }
    case "RevocationWindowExpired": {
      const [issuedAt, window] = error.args as unknown as [bigint, bigint];
      const deadline = issuedAt + window;
      return `Revocation window expired. This certificate could only be revoked until ${formatDateFromSeconds(deadline)}.`;
    }
    case "NotPendingOwner":
      return "Only the pending owner can accept ownership.";
    case "ArrayLengthMismatch":
      return "Recipients and metadata counts do not match.";
    case "AbbrevTooLong":
      return "Institution abbreviations must be 8 characters or fewer.";
    case "AbbrevAlreadyTaken":
      return "That institution abbreviation is already in use.";
    case "RecoveryNotActive":
      return "There is no active wallet recovery request for this student.";
    case "RecoveryCooldownNotMet":
      return "Wallet recovery is still in cooldown. Wait 48 hours after the request.";
    case "NotTokenRecipient":
      return "This certificate does not belong to the specified student wallet.";
    case "SameAddress":
      return "The old and new wallet addresses must be different.";
    default:
      return null;
  }
}

function normalizeMessage(message: string): string {
  return message
    .replace(/^execution reverted(?::\s*)?/i, "")
    .replace(/^VM Exception while processing transaction:\s*/i, "")
    .replace(/^missing revert data(?:.*)$/i, "The transaction reverted without a readable reason.")
    .trim();
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  const details = error as ErrorWithDetails | undefined;

  if (details?.code === "ACTION_REJECTED" || details?.code === 4001) {
    return "Transaction rejected in wallet.";
  }

  const revertData = getRevertData(error);
  if (revertData) {
    try {
      const decoded = contractInterface.parseError(revertData);
      if (decoded) {
        const formatted = formatDecodedContractError(decoded);
        if (formatted) return formatted;
      }
    } catch {
      // Fall through to generic message handling.
    }
  }

  const candidate = [
    details?.reason,
    details?.shortMessage,
    details?.message,
    details?.info?.error?.message,
  ].find((value): value is string => typeof value === "string" && value.trim().length > 0);

  if (!candidate) return fallback;

  const normalized = normalizeMessage(candidate);
  return normalized || fallback;
}

export function toDisplayError(error: unknown, fallback?: string): Error {
  return new Error(getErrorMessage(error, fallback));
}
