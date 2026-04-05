import { ethers, type Signer } from "ethers";
import type {
  InstitutionApplication,
  InstitutionApplicationInput,
  InstitutionApplicationLookup,
  ReviewApplicationInput,
} from "@/types/onboarding";

const API_BASE = "/api/onboard";
const LOCAL_STORAGE_KEY = "credencea:onboarding-applications";

class ApiUnavailableError extends Error {
  constructor(message = "Onboarding API unavailable.") {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

function sortApplications(applications: InstitutionApplication[]) {
  return [...applications].sort((left, right) => (
    new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()
  ));
}

function loadLocalApplications(): InstitutionApplication[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortApplications(parsed as InstitutionApplication[]) : [];
  } catch {
    return [];
  }
}

function saveLocalApplications(applications: InstitutionApplication[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sortApplications(applications)));
}

function isUnavailableError(error: unknown) {
  return error instanceof ApiUnavailableError;
}

async function parseApiResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    throw new ApiUnavailableError();
  }

  const payload = await response.json() as { data?: T; error?: string };

  if (!response.ok) {
    throw new Error(payload.error || "Request failed.");
  }

  if (typeof payload.data === "undefined") {
    throw new ApiUnavailableError();
  }

  return payload.data;
}

async function apiRequest<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(input, init);
    return await parseApiResponse<T>(response);
  } catch (error) {
    if (error instanceof Error && error.name === "TypeError") {
      throw new ApiUnavailableError();
    }

    throw error;
  }
}

function buildLocalApplication(input: InstitutionApplicationInput): InstitutionApplication {
  return {
    ...input,
    id: globalThis.crypto?.randomUUID?.() ?? `local-${Date.now()}`,
    abbrev: input.abbrev.trim().toUpperCase(),
    walletAddress: ethers.getAddress(input.walletAddress.trim()),
    website: input.website.trim(),
    country: input.country.trim(),
    name: input.name.trim(),
    status: "pending",
    submittedAt: new Date().toISOString(),
  };
}

function filterByWallet(applications: InstitutionApplication[], walletAddress: string) {
  const normalisedWallet = walletAddress.trim().toLowerCase();
  return applications.filter((application) => application.walletAddress.toLowerCase() === normalisedWallet);
}

export async function submitInstitutionApplication(input: InstitutionApplicationInput) {
  try {
    return await apiRequest<InstitutionApplication>(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch (error) {
    if (!isUnavailableError(error)) throw error;

    const applications = loadLocalApplications();
    const created = buildLocalApplication(input);
    saveLocalApplications([created, ...applications]);
    return created;
  }
}

export async function fetchInstitutionApplicationStatus(walletAddress: string): Promise<InstitutionApplicationLookup> {
  try {
    const query = new URLSearchParams({ wallet: walletAddress.trim() });
    return await apiRequest<InstitutionApplicationLookup>(`${API_BASE}?${query.toString()}`);
  } catch (error) {
    if (!isUnavailableError(error)) throw error;

    return {
      walletAddress: walletAddress.trim(),
      applications: filterByWallet(loadLocalApplications(), walletAddress),
    };
  }
}

export async function fetchInstitutionApplications(status?: string): Promise<InstitutionApplication[]> {
  try {
    const query = status ? `?status=${encodeURIComponent(status)}` : "";
    return await apiRequest<InstitutionApplication[]>(`${API_BASE}${query}`);
  } catch (error) {
    if (!isUnavailableError(error)) throw error;

    const applications = loadLocalApplications();
    return status ? applications.filter((application) => application.status === status) : applications;
  }
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

async function buildRejectionProof(
  signer: Signer,
  payload: { applicationId: string; status: "rejected"; note: string }
) {
  const timestamp = new Date().toISOString();
  const signerAddress = await signer.getAddress();
  const message = buildRejectionMessage({ ...payload, timestamp });
  const signature = await signer.signMessage(message);

  return {
    reviewerAddress: signerAddress,
    reviewTimestamp: timestamp,
    signature,
  };
}

export async function reviewInstitutionApplication(
  review: ReviewApplicationInput,
  options?: { signer?: Signer }
) {
  try {
    const rejectionProof = review.status === "rejected" && options?.signer
      ? await buildRejectionProof(options.signer, {
          applicationId: review.applicationId,
          status: "rejected",
          note: review.note?.trim() ?? "",
        })
      : undefined;

    return await apiRequest<InstitutionApplication>(`${API_BASE}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...review,
        note: review.note?.trim() ?? "",
        ...rejectionProof,
      }),
    });
  } catch (error) {
    if (!isUnavailableError(error)) throw error;

    const applications = loadLocalApplications();
    const current = applications.find((application) => application.id === review.applicationId);

    if (!current) {
      throw new Error("Application not found.");
    }

    if (current.status !== "pending") {
      throw new Error("Only pending applications can be reviewed.");
    }

    const updated: InstitutionApplication = {
      ...current,
      status: review.status,
      reviewedAt: new Date().toISOString(),
      reviewNote: review.note?.trim() || undefined,
      txHash: review.txHash,
    };

    saveLocalApplications(applications.map((application) => (
      application.id === review.applicationId ? updated : application
    )));

    return updated;
  }
}

export function formatInstitutionTypeLabel(type: InstitutionApplication["institutionType"]) {
  switch (type) {
    case "professional-body":
      return "Professional body";
    case "training-institute":
      return "Training institute";
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).replace("-", " ");
  }
}

export function formatApplicationDate(value?: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function normaliseInstitutionApplicationInput(input: InstitutionApplicationInput): InstitutionApplicationInput {
  return {
    ...input,
    name: input.name.trim(),
    abbrev: input.abbrev.trim().toUpperCase(),
    website: input.website.trim(),
    country: input.country.trim(),
    walletAddress: ethers.getAddress(input.walletAddress.trim()),
    themeColor: input.themeColor,
    accentColor: input.accentColor,
  };
}
