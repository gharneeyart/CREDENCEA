import { promises as fs } from "node:fs";
import path from "node:path";

export type InstitutionApplicationStatus = "pending" | "approved" | "rejected";

export type InstitutionApplication = {
  id: string;
  name: string;
  abbrev: string;
  website: string;
  country: string;
  institutionType: "university" | "college" | "professional-body" | "polytechnic" | "training-institute" | "other";
  walletAddress: string;
  themeColor: string;
  accentColor: string;
  status: InstitutionApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  dailyCap?: number;
  txHash?: string;
  reviewNote?: string;
  reviewedBy?: string;
};

const STORE_KEY = "credencea:onboarding:applications";
const STORE_FILE = process.env.ONBOARDING_STORE_FILE ?? path.join("/tmp", "credencea-onboarding.json");

function sortApplications(applications: InstitutionApplication[]) {
  return [...applications].sort((left, right) => (
    new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime()
  ));
}

function hasKvConfig() {
  return Boolean(process.env.CREDENCEA_REST_API_KV_REST_API_URL && process.env.CREDENCEA_REST_API_KV_REST_API_TOKEN);
}

async function runKvCommand(command: unknown[]) {
  const response = await fetch(process.env.CREDENCEA_REST_API_KV_REST_API_URL!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CREDENCEA_REST_API_KV_REST_API_TOKEN!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    throw new Error("Failed to reach the onboarding data store.");
  }

  return response.json() as Promise<{ result: string | null }>;
}

async function readFromKv() {
  const payload = await runKvCommand(["GET", STORE_KEY]);
  if (!payload.result) return [];

  try {
    const parsed = JSON.parse(payload.result);
    return Array.isArray(parsed) ? sortApplications(parsed as InstitutionApplication[]) : [];
  } catch {
    return [];
  }
}

async function writeToKv(applications: InstitutionApplication[]) {
  await runKvCommand(["SET", STORE_KEY, JSON.stringify(sortApplications(applications))]);
}

async function ensureFileExists() {
  const directory = path.dirname(STORE_FILE);
  await fs.mkdir(directory, { recursive: true });

  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(STORE_FILE, "[]", "utf8");
  }
}

async function readFromFile() {
  await ensureFileExists();

  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortApplications(parsed as InstitutionApplication[]) : [];
  } catch {
    return [];
  }
}

async function writeToFile(applications: InstitutionApplication[]) {
  await ensureFileExists();
  await fs.writeFile(STORE_FILE, JSON.stringify(sortApplications(applications), null, 2), "utf8");
}

export async function readApplications() {
  return hasKvConfig() ? readFromKv() : readFromFile();
}

export async function writeApplications(applications: InstitutionApplication[]) {
  if (hasKvConfig()) {
    await writeToKv(applications);
    return;
  }

  await writeToFile(applications);
}

export async function findApplicationById(applicationId: string) {
  const applications = await readApplications();
  return applications.find((application) => application.id === applicationId) ?? null;
}
