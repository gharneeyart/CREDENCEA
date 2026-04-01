import { useCallback, useMemo } from "react";
import { ethers, type Eip1193Provider, BrowserProvider, Contract  } from "ethers";
import { useAppKitProvider, useAppKitAccount } from "@reown/appkit/react";
import { CREDENCEA_ABI, CONTRACT_ADDRESS, CONTRACT_CONFIGURED } from "@/lib/contract";
import type { Certificate, CertificateMetadata, IssueFormData } from "@/types";
import { uploadMetadataToIPFS, fetchMetadata } from "@/lib/ipfs";


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

    onStatus("Uploading metadata to IPFS...");
    const metadataURI = await uploadMetadataToIPFS(metadata);

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
    const r = await contract.getCertificate(tokenId);
    if (!r.exists) return null;

    let displayId = `#${tokenId}`;
    try {
      displayId = await contract.getCertDisplayId(tokenId);
    } catch { /* best-effort */ }

    const cert: Certificate = {
      tokenId,
      displayId,
      issuer: r.issuer,
      issuerName: r.issuerName,
      issuerAbbrev: r.issuerAbbrev,
      issuerThemeColor: r.issuerThemeColor || "#0ea5e9",
      issuerAccentColor: r.issuerAccentColor || "#0284c7",
      recipient: r.recipient,
      metadataURI: r.metadataURI,
      revoked: r.revoked,
      exists: r.exists,
      issuedAt: r.issuedAt,
    };

    try { cert.metadata = await fetchMetadata(r.metadataURI); } catch { /* best-effort */ }
    return cert;
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
