import type { CertificateMetadata } from "@/types";

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT as string;
const GATEWAY = import.meta.env.VITE_IPFS_GATEWAY ;

// ─── Image upload ─────────────────────────────────────────────────────────────

/**
 * Uploads a PNG Blob to Pinata as a file.
 * Returns the ipfs:// URI of the uploaded image.
 */
export async function uploadImageToIPFS(
  blob: Blob,
  filename: string
): Promise<string> {
  if (!PINATA_JWT) throw new Error("VITE_PINATA_JWT is not set in .env");

  const formData = new FormData();
  formData.append("file", blob, filename);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: filename })
  );
  formData.append(
    "pinataOptions",
    JSON.stringify({ cidVersion: 1 })
  );

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata image upload failed: ${err}`);
  }

  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

// ─── Metadata upload (OpenSea-compatible NFT standard) ────────────────────────

/**
 * Builds and uploads an OpenSea-compatible metadata JSON to Pinata.
 *
 * OpenSea metadata standard:
 *   https://docs.opensea.io/docs/metadata-standards
 *
 * The `image` field points to the certificate PNG already uploaded to IPFS.
 * `attributes` are structured for OpenSea trait display and on-chain filtering.
 *
 * Returns the ipfs:// URI of the metadata JSON (this is what gets stored on-chain).
 */
export async function uploadMetadataToIPFS(
  metadata: CertificateMetadata,
  imageURI: string
): Promise<string> {
  if (!PINATA_JWT) throw new Error("VITE_PINATA_JWT is not set in .env");

  // OpenSea-compatible NFT metadata
  const nftMetadata = {
    // Core OpenSea fields
    name: `${metadata.degree} — ${metadata.name}`,
    description: `Academic certificate issued to ${metadata.name} by ${metadata.institution}. Degree: ${metadata.degree} in ${metadata.major}. Graduated ${metadata.graduationYear} with ${metadata.grade}.${metadata.description ? ` ${metadata.description}` : ""}`,
    image: imageURI,               // ipfs:// URI of the certificate PNG
    external_url: "",              // filled in by frontend if needed

    // OpenSea attributes (shown as traits on NFT marketplaces)
    attributes: [
      { trait_type: "Student Name",       value: metadata.name },
      { trait_type: "Degree",             value: metadata.degree },
      { trait_type: "Major",              value: metadata.major },
      { trait_type: "Institution",        value: metadata.institution },
      { trait_type: "Graduation Year",    value: metadata.graduationYear },
      { trait_type: "Grade",              value: metadata.grade },
      { trait_type: "Issue Date",         value: metadata.issuedAt },
      { trait_type: "Certificate Type",   value: "Academic Degree" },
      { trait_type: "Blockchain",         value: "Ethereum" },
      { trait_type: "Token Standard",     value: "ERC-5192 Soulbound" },
    ],

    // Raw metadata fields for our own resolver
    certchain: {
      name:           metadata.name,
      degree:         metadata.degree,
      major:          metadata.major,
      institution:    metadata.institution,
      graduationYear: metadata.graduationYear,
      grade:          metadata.grade,
      issuedAt:       metadata.issuedAt,
      description:    metadata.description ?? "",
    },
  };

  const body = JSON.stringify({
    pinataContent: nftMetadata,
    pinataMetadata: {
      name: `CertChain_${metadata.institution}_${metadata.name}_${Date.now()}`,
    },
    pinataOptions: { cidVersion: 1 },
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
    throw new Error(`Pinata metadata upload failed: ${err}`);
  }

  const data = await res.json();
  return `ipfs://${data.IpfsHash}`;
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

export function resolveIPFS(uri: string): string {
  if (uri.startsWith("ipfs://")) return GATEWAY + uri.slice(7);
  return uri;
}

// ─── Metadata fetcher ────────────────────────────────────────────────────────

/**
 * Fetches NFT metadata from IPFS and normalises it into CertificateMetadata.
 * Handles both the new OpenSea-format (with certchain field) and old flat format.
 */
export async function fetchMetadata(uri: string): Promise<CertificateMetadata> {
  const url = resolveIPFS(uri);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch metadata from ${url}`);
  const json = await res.json();

  // New format — has certchain sub-object
  if (json.certchain) {
    return {
      ...json.certchain,
      image: json.image,
    } as CertificateMetadata;
  }

  // Legacy flat format (pre-image support)
  return json as CertificateMetadata;
}