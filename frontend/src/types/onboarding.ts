export type InstitutionApplicationStatus = "pending" | "approved" | "rejected";

export type InstitutionKind =
  | "university"
  | "college"
  | "professional-body"
  | "polytechnic"
  | "training-institute"
  | "other";

export interface InstitutionApplicationInput {
  name: string;
  abbrev: string;
  website: string;
  country: string;
  institutionType: InstitutionKind;
  walletAddress: string;
  themeColor: string;
  accentColor: string;
}

export interface InstitutionApplication extends InstitutionApplicationInput {
  id: string;
  status: InstitutionApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  dailyCap?: number;
  txHash?: string;
  reviewNote?: string;
  reviewedBy?: string;
}

export interface InstitutionApplicationLookup {
  walletAddress: string;
  applications: InstitutionApplication[];
}

export interface ReviewApplicationInput {
  applicationId: string;
  status: Extract<InstitutionApplicationStatus, "approved" | "rejected">;
  note?: string;
  txHash?: string;
}
