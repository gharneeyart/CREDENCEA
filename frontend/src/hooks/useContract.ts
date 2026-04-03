import { useCallback, useMemo } from "react";
import { BrowserProvider, Contract, ethers, type Eip1193Provider } from "ethers";
import { useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import { CREDENCEA_ABI, CONTRACT_ADDRESS, CONTRACT_CONFIGURED } from "@/lib/contract";
import { toDisplayError } from "@/lib/errors";
import { fetchMetadata, uploadImageToIPFS, uploadMetadataToIPFS } from "@/lib/ipfs";
import type {
  BulkIssueProgress,
  BulkIssueResult,
  BulkIssueRow,
  Certificate,
  CertificateMetadata,
  InstitutionInfo,
  IssueFormData,
} from "@/types";

const FALLBACK_THEME = "#0ea5e9";
const FALLBACK_ACCENT = "#0284c7";
const MAX_BATCH_SIZE = 50;

type InstitutionBranding = {
  name: string;
  abbrev: string;
  themeColor: string;
  accentColor: string;
};

function useProvider() {
  const { walletProvider } = useAppKitProvider<Eip1193Provider>("eip155");
  return useMemo(() => {
    if (!walletProvider) return null;
    return new BrowserProvider(walletProvider);
  }, [walletProvider]);
}

function useSigner(provider: BrowserProvider | null) {
  return useCallback(async () => {
    if (!provider) throw new Error("Wallet not connected");
    if (!CONTRACT_CONFIGURED) throw new Error("Contract address not set — add VITE_CONTRACT_ADDRESS to .env");
    return provider.getSigner();
  }, [provider]);
}

function formatCertDisplayId(abbrev: string, tokenId: bigint): string {
  return `${abbrev}-${tokenId.toString().padStart(4, "0")}`;
}

function compareBigIntsDesc(a: bigint, b: bigint): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}

function hasEventArgs(log: unknown): log is { args: Record<string, unknown> } {
  return typeof log === "object" && log !== null && "args" in log;
}

function buildCertificateMetadata(
  data: Pick<IssueFormData, "studentName" | "degree" | "major" | "graduationYear" | "grade" | "description">,
  institutionName: string
): CertificateMetadata {
  return {
    name: data.studentName,
    degree: data.degree,
    major: data.major,
    institution: institutionName,
    graduationYear: data.graduationYear,
    grade: data.grade,
    issuedAt: new Date().toISOString(),
    description: data.description,
  };
}

async function getInstitutionBranding(contract: Contract, signerAddress: string): Promise<InstitutionBranding> {
  const institution = await contract.institutions(signerAddress);
  return {
    name: institution.name || signerAddress,
    abbrev: institution.abbrev || "CC",
    themeColor: institution.themeColor || FALLBACK_THEME,
    accentColor: institution.accentColor || FALLBACK_ACCENT,
  };
}

async function prepareMetadataURI(
  data: Pick<IssueFormData, "studentName" | "degree" | "major" | "graduationYear" | "grade" | "description">,
  institution: InstitutionBranding,
  predictedTokenId: bigint,
  onStatus?: (status: string) => void
): Promise<string> {
  const metadata = buildCertificateMetadata(data, institution.name);
  const displayId = formatCertDisplayId(institution.abbrev, predictedTokenId);
  const verifyUrl = `${window.location.origin}/certificate/${predictedTokenId}`;

  onStatus?.("Rendering certificate image...");
  const { renderCertificateToBlob } = await import("@/lib/renderCertificate");
  const certificateBlob = await renderCertificateToBlob(
    metadata,
    institution.name,
    institution.abbrev,
    displayId,
    verifyUrl,
    institution.themeColor,
    institution.accentColor
  );

  onStatus?.("Uploading certificate image to IPFS...");
  const filename = `Credencea_${institution.abbrev}_${data.studentName.replace(/\s+/g, "_")}_${Date.now()}.png`;
  const imageURI = await uploadImageToIPFS(certificateBlob, filename);

  onStatus?.("Uploading metadata to IPFS...");
  return uploadMetadataToIPFS(metadata, imageURI);
}

function parseIssuedTokenIds(receipt: ethers.TransactionReceipt): bigint[] {
  const iface = new ethers.Interface(CREDENCEA_ABI);
  const tokenIds: bigint[] = [];

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      if (parsed?.name === "CertificateIssued") {
        tokenIds.push(parsed.args.tokenId as bigint);
      }
    } catch {
      // Ignore unrelated logs.
    }
  }

  return tokenIds;
}

async function fetchCertificateByTokenId(contract: Contract, tokenId: bigint): Promise<Certificate | null> {
  const record = await contract.getCertificate(tokenId);
  if (!record.exists) return null;

  let displayId = `#${tokenId}`;
  try {
    displayId = await contract.getCertDisplayId(tokenId);
  } catch {
    displayId = formatCertDisplayId(record.issuerAbbrev || "CC", tokenId);
  }

  const certificate: Certificate = {
    tokenId,
    displayId,
    issuer: record.issuer,
    issuerName: record.issuerName,
    issuerAbbrev: record.issuerAbbrev,
    issuerThemeColor: record.issuerThemeColor || FALLBACK_THEME,
    issuerAccentColor: record.issuerAccentColor || FALLBACK_ACCENT,
    recipient: record.recipient,
    metadataURI: record.metadataURI,
    revoked: record.revoked,
    exists: record.exists,
    issuedAt: record.issuedAt,
  };

  try {
    certificate.metadata = await fetchMetadata(record.metadataURI);
  } catch {
    // Best-effort metadata fetch keeps the table usable even if IPFS is slow.
  }

  return certificate;
}

async function fetchInstitutionByAddress(contract: Contract, address: string): Promise<InstitutionInfo> {
  const institution = await contract.getInstitution(address);
  return {
    address,
    active: institution.active,
    name: institution.name,
    abbrev: institution.abbrev,
    themeColor: institution.themeColor || FALLBACK_THEME,
    accentColor: institution.accentColor || FALLBACK_ACCENT,
    addedAt: institution.addedAt,
    dailyCap: institution.dailyCap,
    dailyIssuedCount: institution.dailyIssuedCount,
  };
}

function useReadContract() {
  const provider = useProvider();
  return useMemo(() => {
    if (!provider || !CONTRACT_CONFIGURED) return null;
    return new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, provider);
  }, [provider]);
}

function makeProgressSnapshot(
  total: number,
  prepared: number,
  finalized: number,
  currentBatch: number,
  totalBatches: number,
  phase: BulkIssueProgress["phase"],
  message: string
): BulkIssueProgress {
  return {
    total,
    prepared,
    finalized,
    currentBatch,
    totalBatches,
    phase,
    message,
  };
}

// ─── Institution hooks ─────────────────────────────────────────────────────

export function useAddInstitution() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (
    address: string,
    name: string,
    abbrev: string,
    themeColor: string,
    accentColor: string,
    dailyCap = 0
  ) => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const tx = await contract.addInstitution(address, name, abbrev, themeColor, accentColor, dailyCap);
      await tx.wait();
      return tx;
    } catch (error) {
      throw toDisplayError(error, "Failed to add institution.");
    }
  }, [getSigner]);
}

export function useRemoveInstitution() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (address: string) => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const tx = await contract.removeInstitution(address);
      await tx.wait();
      return tx;
    } catch (error) {
      throw toDisplayError(error, "Failed to remove institution.");
    }
  }, [getSigner]);
}

export function useUpdateTheme() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (themeColor: string, accentColor: string) => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const tx = await contract.updateTheme(themeColor, accentColor);
      await tx.wait();
      return tx;
    } catch (error) {
      throw toDisplayError(error, "Failed to update institution theme.");
    }
  }, [getSigner]);
}

export function useReplaceInstitutionWallet() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (oldWallet: string, newWallet: string) => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const tx = await contract.replaceInstitutionWallet(oldWallet, newWallet);
      await tx.wait();
      return tx;
    } catch (error) {
      throw toDisplayError(error, "Failed to replace institution wallet.");
    }
  }, [getSigner]);
}

export function useIsInstitution() {
  const contract = useReadContract();

  return useCallback(async (address: string): Promise<boolean> => {
    if (!contract) return false;
    const institution = await contract.institutions(address);
    return institution.active;
  }, [contract]);
}

export function useIsOwner() {
  const contract = useReadContract();
  const { address } = useAppKitAccount();

  return useCallback(async (): Promise<boolean> => {
    if (!contract || !address) return false;
    const owner: string = await contract.owner();
    return owner.toLowerCase() === address.toLowerCase();
  }, [contract, address]);
}

// ─── Recovery ──────────────────────────────────────────────────────────────

export function useRequestRecovery() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (oldWallet: string, newWallet: string) => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const tx = await contract.requestRecovery(oldWallet, newWallet);
      await tx.wait();
      return tx;
    } catch (error) {
      throw toDisplayError(error, "Failed to request wallet recovery.");
    }
  }, [getSigner]);
}

export function useExecuteRecovery() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (oldWallet: string, tokenIds: bigint[]) => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const tx = await contract.executeRecovery(oldWallet, tokenIds);
      await tx.wait();
      return tx;
    } catch (error) {
      throw toDisplayError(error, "Failed to execute wallet recovery.");
    }
  }, [getSigner]);
}

export function useIssueCertificate() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (
    formData: IssueFormData,
    onStatus: (status: string) => void
  ): Promise<bigint> => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const signerAddress = await signer.getAddress();
      const institution = await getInstitutionBranding(contract, signerAddress);
      const nextTokenId = (await contract.totalSupply()) + 1n;
      const metadataURI = await prepareMetadataURI(formData, institution, nextTokenId, onStatus);

      onStatus("Sending transaction...");
      const tx = await contract.issueCertificate(formData.recipientAddress, metadataURI);
      onStatus("Waiting for confirmation...");
      const receipt = await tx.wait();

      return parseIssuedTokenIds(receipt)[0] ?? 0n;
    } catch (error) {
      throw toDisplayError(error, "Certificate issuance failed.");
    }
  }, [getSigner]);
}

export function useIssueBatchCertificates() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (
    rows: BulkIssueRow[],
    onProgress: (progress: BulkIssueProgress) => void
  ): Promise<BulkIssueResult[]> => {
    if (rows.length === 0) return [];

    const total = rows.length;
    const totalBatches = Math.ceil(rows.length / MAX_BATCH_SIZE);
    let prepared = 0;
    let finalized = 0;
    let plannedMintCount = 0;
    const results: BulkIssueResult[] = [];

    const emit = (
      phase: BulkIssueProgress["phase"],
      message: string,
      currentBatch: number
    ) => onProgress(makeProgressSnapshot(total, prepared, finalized, currentBatch, totalBatches, phase, message));

    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const signerAddress = await signer.getAddress();
      const institution = await getInstitutionBranding(contract, signerAddress);
      const startingSupply = await contract.totalSupply();
      let aborted = false;

      for (let batchStart = 0; batchStart < rows.length; batchStart += MAX_BATCH_SIZE) {
        const batchRows = rows.slice(batchStart, batchStart + MAX_BATCH_SIZE);
        const currentBatch = Math.floor(batchStart / MAX_BATCH_SIZE) + 1;
        const preparedEntries: Array<{ row: BulkIssueRow; metadataURI: string }> = [];

        for (const row of batchRows) {
          emit("preparing", `Preparing row ${row.rowNumber} of ${total}...`, currentBatch);

          try {
            const predictedTokenId = startingSupply + BigInt(plannedMintCount + 1);
            const metadataURI = await prepareMetadataURI(row, institution, predictedTokenId, (status) => {
              emit("preparing", `Row ${row.rowNumber}: ${status}`, currentBatch);
            });

            preparedEntries.push({ row, metadataURI });
            plannedMintCount += 1;
            prepared += 1;
            emit("preparing", `Prepared ${prepared} of ${total} certificates.`, currentBatch);
          } catch (error) {
            results.push({
              rowNumber: row.rowNumber,
              studentName: row.studentName,
              recipientAddress: row.recipientAddress,
              status: "failed",
              error: toDisplayError(error, "Failed to prepare certificate assets.").message,
            });
            finalized += 1;
            emit("error", `Skipped row ${row.rowNumber}.`, currentBatch);
          }
        }

        if (preparedEntries.length === 0) continue;

        emit("issuing", `Submitting batch ${currentBatch} of ${totalBatches}...`, currentBatch);

        try {
          const tx = await contract.issueBatch(
            preparedEntries.map((entry) => entry.row.recipientAddress),
            preparedEntries.map((entry) => entry.metadataURI)
          );
          emit("issuing", `Waiting for confirmation for batch ${currentBatch}...`, currentBatch);
          const receipt = await tx.wait();
          const tokenIds = parseIssuedTokenIds(receipt);

          preparedEntries.forEach((entry, index) => {
            const tokenId = tokenIds[index];
            results.push({
              rowNumber: entry.row.rowNumber,
              studentName: entry.row.studentName,
              recipientAddress: entry.row.recipientAddress,
              status: tokenId !== undefined ? "success" : "failed",
              tokenId,
              error: tokenId === undefined ? "Transaction confirmed, but the token ID could not be read from the receipt." : undefined,
            });
            finalized += 1;
          });

          emit("issuing", `Confirmed batch ${currentBatch} of ${totalBatches}.`, currentBatch);
        } catch (error) {
          const message = toDisplayError(error, "Batch issuance failed.").message;
          preparedEntries.forEach((entry) => {
            results.push({
              rowNumber: entry.row.rowNumber,
              studentName: entry.row.studentName,
              recipientAddress: entry.row.recipientAddress,
              status: "failed",
              error: message,
            });
            finalized += 1;
          });
          aborted = true;
          emit("error", `Batch ${currentBatch} failed.`, currentBatch);
          break;
        }
      }

      if (aborted) {
        const attemptedRows = new Set(results.map((result) => result.rowNumber));
        rows.forEach((row) => {
          if (attemptedRows.has(row.rowNumber)) return;
          results.push({
            rowNumber: row.rowNumber,
            studentName: row.studentName,
            recipientAddress: row.recipientAddress,
            status: "failed",
            error: "Not attempted because a previous batch failed.",
          });
          finalized += 1;
        });
      }

      results.sort((left, right) => left.rowNumber - right.rowNumber);
      const successCount = results.filter((result) => result.status === "success").length;
      const failureCount = results.length - successCount;

      emit(
        failureCount > 0 ? "error" : "success",
        failureCount > 0
          ? `Finished with ${successCount} success${successCount === 1 ? "" : "es"} and ${failureCount} failure${failureCount === 1 ? "" : "s"}.`
          : `Successfully issued ${successCount} certificate${successCount === 1 ? "" : "s"}.`,
        totalBatches
      );

      return results;
    } catch (error) {
      throw toDisplayError(error, "Bulk issuance failed.");
    }
  }, [getSigner]);
}

// ─── Revocation ────────────────────────────────────────────────────────────

export function useRevokeCertificate() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (tokenId: bigint) => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const tx = await contract.revokeCertificate(tokenId);
      await tx.wait();
      return tx;
    } catch (error) {
      throw toDisplayError(error, "Failed to revoke certificate.");
    }
  }, [getSigner]);
}

export function useForceRevoke() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (tokenId: bigint) => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const tx = await contract.forceRevoke(tokenId);
      await tx.wait();
      return tx;
    } catch (error) {
      throw toDisplayError(error, "Failed to force revoke certificate.");
    }
  }, [getSigner]);
}

export function usePauseContract() {
  const provider = useProvider();
  const getSigner = useSigner(provider);

  return useCallback(async (pause: boolean) => {
    try {
      const signer = await getSigner();
      const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
      const tx = pause ? await contract.pause() : await contract.unpause();
      await tx.wait();
      return tx;
    } catch (error) {
      throw toDisplayError(error, pause ? "Failed to pause contract." : "Failed to unpause contract.");
    }
  }, [getSigner]);
}

// ─── Read queries ──────────────────────────────────────────────────────────

export function useFetchCertificate() {
  const contract = useReadContract();

  return useCallback(async (tokenId: bigint): Promise<Certificate | null> => {
    if (!contract) throw new Error("Provider not available");
    return fetchCertificateByTokenId(contract, tokenId);
  }, [contract]);
}

export function useFetchInstitutions() {
  const contract = useReadContract();

  return useCallback(async (): Promise<InstitutionInfo[]> => {
    if (!contract) throw new Error("Provider not available");

    const [addedLogs, replacedLogs] = await Promise.all([
      contract.queryFilter(contract.filters.InstitutionAdded(), 0, "latest"),
      contract.queryFilter(contract.filters.InstitutionWalletReplaced(), 0, "latest"),
    ]);

    const addresses = new Set<string>();

    for (const log of addedLogs) {
      if (!hasEventArgs(log)) continue;
      const institutionAddress = log.args?.institution as string | undefined;
      if (institutionAddress) addresses.add(institutionAddress);
    }

    for (const log of replacedLogs) {
      if (!hasEventArgs(log)) continue;
      const oldWallet = log.args?.oldWallet as string | undefined;
      const newWallet = log.args?.newWallet as string | undefined;
      if (oldWallet) addresses.add(oldWallet);
      if (newWallet) addresses.add(newWallet);
    }

    const institutions = await Promise.all(
      Array.from(addresses).map((institutionAddress) => fetchInstitutionByAddress(contract, institutionAddress))
    );

    return institutions
      .filter((institution) => institution.name || institution.active)
      .sort((left, right) => {
        if (left.active !== right.active) return left.active ? -1 : 1;
        return compareBigIntsDesc(left.addedAt, right.addedAt);
      });
  }, [contract]);
}

export function useFetchIssuedCertificatesByInstitution() {
  const contract = useReadContract();

  return useCallback(async (institutionAddress: string): Promise<Certificate[]> => {
    if (!contract) throw new Error("Provider not available");
    if (!institutionAddress) return [];

    const logs = await contract.queryFilter(
      contract.filters.CertificateIssued(null, institutionAddress, null),
      0,
      "latest"
    );

    const tokenIds = Array.from(
      new Set(
        logs
          .map((log) => (hasEventArgs(log) ? log.args?.tokenId as bigint | undefined : undefined))
          .filter((tokenId): tokenId is bigint => tokenId !== undefined)
          .map((tokenId) => tokenId.toString())
      )
    )
      .map((tokenId) => BigInt(tokenId))
      .sort(compareBigIntsDesc);

    const certificates = await Promise.all(
      tokenIds.map((tokenId) => fetchCertificateByTokenId(contract, tokenId))
    );

    return certificates.filter((certificate): certificate is Certificate => certificate !== null);
  }, [contract]);
}

export function useFetchCertsByRecipient() {
  const contract = useReadContract();

  return useCallback(async (address: string): Promise<bigint[]> => {
    if (!contract) throw new Error("Provider not available");
    return contract.getTokensByRecipient(address);
  }, [contract]);
}

export function useTotalSupply() {
  const contract = useReadContract();

  return useCallback(async (): Promise<bigint> => {
    if (!contract) throw new Error("Provider not available");
    return contract.totalSupply();
  }, [contract]);
}

export function useContractPaused() {
  const contract = useReadContract();

  return useCallback(async (): Promise<boolean> => {
    if (!contract) return false;
    return contract.paused();
  }, [contract]);
}
