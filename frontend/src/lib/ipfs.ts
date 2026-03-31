import type { CertificateMetadata } from "@/types";

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string;

/**
 * Uploads certificate metadata JSON to IPFS via Pinata.
 * Returns the ipfs:// URI for storing on-chain.
 */
export async function uploadMetadataToIPFS(
  metadata: CertificateMetadata
): Promise<string> {
  if (!PINATA_JWT) {
    throw new Error("VITE_PINATA_JWT is not set in .env");
  }

  const body = JSON.stringify({
    pinataContent: metadata,
    pinataMetadata: {
      name: `Credencea_${metadata.institution}_${metadata.name}_${Date.now()}`,
    },
    pinataOptions: {
      cidVersion: 1,
    },
  });

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${PINATA_JWT}`,
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata upload failed: ${err}`);
  }

  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

/**
 * Resolves an ipfs:// URI to an HTTP URL via the configured gateway.
 */
export function resolveIPFS(uri: string): string {
  const gateway =
    import.meta.env.VITE_IPFS_GATEWAY ?? "https://gateway.pinata.cloud/ipfs/";
  if (uri.startsWith("ipfs://")) {
    return gateway + uri.slice(7);
  }
  return uri;
}

/**
 * Fetches and parses JSON metadata from an IPFS URI.
 */
export async function fetchMetadata(uri: string): Promise<CertificateMetadata> {
  const url = resolveIPFS(uri);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch metadata from ${url}`);
  return res.json();
}
