import { useCallback, useMemo } from "react";
import { ethers, type Eip1193Provider, BrowserProvider, Contract  } from "ethers";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";
import { CREDENCEA_ABI, CONTRACT_ADDRESS, CONTRACT_CONFIGURED } from "@/lib/contract";
import type { Certificate, CertificateMetadata, InstitutionInfo, IssueFormData } from "@/types";
import { uploadMetadataToIPFS, fetchMetadata, uploadImageToIPFS } from "@/lib/ipfs";

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

async function fetchCertificateByTokenId(contract: Contract, tokenId: bigint): Promise<Certificate | null> {
  const record = await contract.getCertificate(tokenId);
  if (!record.exists) return null;

  let displayId = `#${tokenId}`;
  try {
    displayId = await contract.getCertDisplayId(tokenId);
  } catch {
    displayId = formatCertDisplayId(record.issuerAbbrev || "CC", tokenId);
  }

  const cert: Certificate = {
    tokenId,
    displayId,
    issuer: record.issuer,
    issuerName: record.issuerName,
    issuerAbbrev: record.issuerAbbrev,
    issuerThemeColor: record.issuerThemeColor || "#0ea5e9",
    issuerAccentColor: record.issuerAccentColor || "#0284c7",
    recipient: record.recipient,
    metadataURI: record.metadataURI,
    revoked: record.revoked,
    exists: record.exists,
    issuedAt: record.issuedAt,
  };

  try {
    cert.metadata = await fetchMetadata(record.metadataURI);
  } catch {
    // Best-effort metadata fetch keeps the table usable even if IPFS is slow.
  }

  return cert;
}

async function fetchInstitutionByAddress(contract: Contract, address: string): Promise<InstitutionInfo> {
  const institution = await contract.getInstitution(address);
  return {
    address,
    active: institution.active,
    name: institution.name,
    abbrev: institution.abbrev,
    themeColor: institution.themeColor || "#0ea5e9",
    accentColor: institution.accentColor || "#0284c7",
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

// ─── Institution hooks ─────────────────────────────────────────────────────

export function useAddInstitution() {
  const provider = useProvider();
  const getSigner = useSigner(provider);
  return useCallback(async (
    address: string, name: string, abbrev: string,
    themeColor: string, accentColor: string, dailyCap = 0
  ) => {
    const signer = await getSigner();
    const contract = new Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
    const tx = await contract.addInstitution(address, name, abbrev, themeColor, accentColor, dailyCap);
    await tx.wait();
    return tx;
  }, [getSigner]);
}

export function useRemoveInstitution() {
  const provider = useProvider();
  const getSigner = useSigner(provider);
  return useCallback(async (address: string) => {
    const signer = await getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
    const tx = await contract.removeInstitution(address);
    await tx.wait();
    return tx;
  }, [getSigner]);
}

export function useUpdateTheme() {
  const provider = useProvider();
  const getSigner = useSigner(provider);
  return useCallback(async (themeColor: string, accentColor: string) => {
    const signer = await getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
    const tx = await contract.updateTheme(themeColor, accentColor);
    await tx.wait();
    return tx;
  }, [getSigner]);
}

export function useReplaceInstitutionWallet() {
  const provider = useProvider();
  const getSigner = useSigner(provider);
  return useCallback(async (oldWallet: string, newWallet: string) => {
    const signer = await getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
    const tx = await contract.replaceInstitutionWallet(oldWallet, newWallet);
    await tx.wait();
    return tx;
  }, [getSigner]);
}

export function useIsInstitution() {
  const contract = useReadContract();
  return useCallback(async (address: string): Promise<boolean> => {
    if (!contract) return false;
    const inst = await contract.institutions(address);
    return inst.active;
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
    const signer = await getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
    const tx = await contract.requestRecovery(oldWallet, newWallet);
    await tx.wait();
    return tx;
  }, [getSigner]);
}

export function useExecuteRecovery() {
  const provider = useProvider();
  const getSigner = useSigner(provider);
  return useCallback(async (oldWallet: string, tokenIds: bigint[]) => {
    const signer = await getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
    const tx = await contract.executeRecovery(oldWallet, tokenIds);
    await tx.wait();
    return tx;
  }, [getSigner]);
}

// ─── Issuance ──────────────────────────────────────────────────────────────

// export function useIssueCertificate() {
//   const provider = useProvider();
//   const getSigner = useSigner(provider);
//   return useCallback(async (
//     formData: IssueFormData,
//     onStatus: (s: string) => void
//   ): Promise<bigint> => {
//     const signer = await getSigner();
//     const contract = new ethers.Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
//     const signerAddress = await signer.getAddress();
//     const inst = await contract.institutions(signerAddress);

//     const metadata: CertificateMetadata = {
//       name: formData.studentName,
//       degree: formData.degree,
//       major: formData.major,
//       institution: inst.name || signerAddress,
//       graduationYear: formData.graduationYear,
//       grade: formData.grade,
//       issuedAt: new Date().toISOString(),
//       description: formData.description,
//     };

//     onStatus("Uploading metadata to IPFS...");
//     const metadataURI = await uploadMetadataToIPFS(metadata);

//     onStatus("Sending transaction...");
//     const tx = await contract.issueCertificate(formData.recipientAddress, metadataURI);
//     onStatus("Waiting for confirmation...");
//     const receipt = await tx.wait();

//     const iface = new ethers.Interface(CREDENCEA_ABI);
//     for (const log of receipt.logs) {
//       try {
//         const parsed = iface.parseLog(log);
//         if (parsed?.name === "CertificateIssued") return parsed.args.tokenId as bigint;
//       } catch { /* skip */ }
//     }
//     return 0n;
//   }, [getSigner]);
// }

export function useIssueCertificate() {
  const provider = useProvider();
  const getSigner = useSigner(provider);
  return useCallback(async (
    formData: IssueFormData,
    onStatus: (s: string) => void
  ): Promise<bigint> => {
    const signer = await getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
    const signerAddress = await signer.getAddress();
    const inst = await contract.institutions(signerAddress);
 

    const metadata: CertificateMetadata = {
      name: formData.studentName,
      degree: formData.degree,
      major: formData.major,
      institution: inst.name || signerAddress,
      graduationYear: formData.graduationYear,
      grade: formData.grade,
      issuedAt: new Date().toISOString(),
      description: formData.description,
    };

    const nextTokenId = (await contract.totalSupply()) + 1n;
    const displayId = formatCertDisplayId(inst.abbrev || "CC", nextTokenId);
    const verifyUrl = `${window.location.origin}/certificate/${nextTokenId}`;
 
    // Step 1: render certificate to PNG
    onStatus("Rendering certificate image...");
    const { renderCertificateToBlob } = await import("@/lib/renderCertificate");
    const certBlob = await renderCertificateToBlob(
      metadata,
      inst.name || signerAddress,
      inst.abbrev || "CC",
      displayId,
      verifyUrl,
      inst.themeColor || "#0e2a5c",
      inst.accentColor || "#0284c7"
    );
 
    // Step 2: upload PNG to IPFS
    onStatus("Uploading certificate image to IPFS...");
    const filename = `Credencea_${inst.abbrev || "CC"}_${formData.studentName.replace(/\s+/g, "_")}_${Date.now()}.png`;
    const imageURI = await uploadImageToIPFS(certBlob, filename);
 
    // Step 3: upload OpenSea-compatible metadata JSON pointing to the image
    onStatus("Uploading metadata to IPFS...");
    const metadataURI = await uploadMetadataToIPFS(metadata, imageURI);
 
    onStatus("Sending transaction...");
    const tx = await contract.issueCertificate(formData.recipientAddress, metadataURI);
    onStatus("Waiting for confirmation...");
    const receipt = await tx.wait();
 
    const iface = new ethers.Interface(CREDENCEA_ABI);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed?.name === "CertificateIssued") return parsed.args.tokenId as bigint;
      } catch { /* skip */ }
    }
    return 0n;
  }, [getSigner]);
}

// ─── Revocation ────────────────────────────────────────────────────────────

export function useRevokeCertificate() {
  const provider = useProvider();
  const getSigner = useSigner(provider);
  return useCallback(async (tokenId: bigint) => {
    const signer = await getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
    const tx = await contract.revokeCertificate(tokenId);
    await tx.wait();
    return tx;
  }, [getSigner]);
}

export function useForceRevoke() {
  const provider = useProvider();
  const getSigner = useSigner(provider);
  return useCallback(async (tokenId: bigint) => {
    const signer = await getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
    const tx = await contract.forceRevoke(tokenId);
    await tx.wait();
    return tx;
  }, [getSigner]);
}

export function usePauseContract() {
  const provider = useProvider();
  const getSigner = useSigner(provider);
  return useCallback(async (pause: boolean) => {
    const signer = await getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CREDENCEA_ABI, signer);
    const tx = pause ? await contract.pause() : await contract.unpause();
    await tx.wait();
    return tx;
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
          .map((log) => hasEventArgs(log) ? log.args?.tokenId as bigint | undefined : undefined)
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
