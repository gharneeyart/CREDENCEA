import { ethers } from "ethers";
import { readApplications, writeApplications, type InstitutionApplication } from "../_lib/onboardingStore";
import { readJsonBody, sendJson } from "../_lib/http";

const VALID_TYPES = new Set([
  "university",
  "college",
  "professional-body",
  "polytechnic",
  "training-institute",
  "other",
]);

function validateWebsite(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normaliseApplicationInput(input: Record<string, unknown>) {
  const name = String(input.name ?? "").trim();
  const abbrev = String(input.abbrev ?? "").trim().toUpperCase();
  const website = String(input.website ?? "").trim();
  const country = String(input.country ?? "").trim();
  const institutionType = String(input.institutionType ?? "").trim();
  const themeColor = String(input.themeColor ?? "").trim();
  const accentColor = String(input.accentColor ?? "").trim();
  const walletAddress = String(input.walletAddress ?? "").trim();

  if (!name) throw new Error("Institution name is required.");
  if (!abbrev) throw new Error("Institution abbreviation is required.");
  if (abbrev.length > 8) throw new Error("Institution abbreviation must be 8 characters or fewer.");
  if (!validateWebsite(website)) throw new Error("Enter a valid website URL, including https://.");
  if (!country) throw new Error("Country is required.");
  if (!VALID_TYPES.has(institutionType)) throw new Error("Choose a valid institution type.");
  if (!/^#[0-9a-fA-F]{6}$/.test(themeColor) || !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    throw new Error("Theme colours must be valid hex values.");
  }

  return {
    name,
    abbrev,
    website,
    country,
    institutionType: institutionType as InstitutionApplication["institutionType"],
    walletAddress: ethers.getAddress(walletAddress),
    themeColor,
    accentColor,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method === "GET") {
    const applications = await readApplications();
    const wallet = typeof req.query.wallet === "string" ? req.query.wallet.trim().toLowerCase() : "";
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";

    if (wallet) {
      return sendJson(res, 200, {
        data: {
          walletAddress: wallet,
          applications: applications.filter((application) => application.walletAddress.toLowerCase() === wallet),
        },
      });
    }

    return sendJson(res, 200, {
      data: status ? applications.filter((application) => application.status === status) : applications,
    });
  }

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const body = await readJsonBody(req);
    const input = normaliseApplicationInput(body);
    const applications = await readApplications();

    const existingActive = applications.find((application) => (
      application.walletAddress.toLowerCase() === input.walletAddress.toLowerCase()
      && application.status === "pending"
    ));

    if (existingActive) {
      return sendJson(res, 409, { error: "This wallet already has a pending application." });
    }

    const created: InstitutionApplication = {
      ...input,
      id: crypto.randomUUID(),
      status: "pending",
      submittedAt: new Date().toISOString(),
    };

    await writeApplications([created, ...applications]);
    return sendJson(res, 201, { data: created });
  } catch (error) {
    return sendJson(res, 400, {
      error: error instanceof Error ? error.message : "Unable to submit application.",
    });
  }
}
