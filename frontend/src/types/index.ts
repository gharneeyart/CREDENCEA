export interface Certificate {
  tokenId: bigint;
  displayId: string;          // e.g. "MIT-0042"
  issuer: string;
  issuerName: string;
  issuerAbbrev: string;
  issuerThemeColor: string;   // e.g. "#7c3aed"
  issuerAccentColor: string;  // e.g. "#a78bfa"
  recipient: string;
  metadataURI: string;
  revoked: boolean;
  exists: boolean;
  issuedAt: bigint;
  metadata?: CertificateMetadata;
}

export interface CertificateMetadata {
  name: string;
  degree: string;
  major: string;
  institution: string;
  graduationYear: string;
  grade: string;
  issuedAt: string;
  description?: string;
  image?: string;
}

export interface InstitutionInfo {
  address: string;
  active: boolean;
  name: string;
  abbrev: string;
  themeColor: string;
  accentColor: string;
  addedAt: bigint;
  dailyCap: bigint;
  dailyIssuedCount: bigint;
}

export interface IssueFormData {
  recipientAddress: string;
  studentName: string;
  degree: string;
  major: string;
  graduationYear: string;
  grade: string;
  description: string;
}

export type TxStatus = "idle" | "uploading" | "pending" | "success" | "error";
