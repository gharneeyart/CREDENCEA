import { findApplicationById, readApplications, writeApplications, type InstitutionApplication } from "../_lib/onboardingStore";
import { readJsonBody, sendJson } from "../_lib/http";
import { verifyApprovalReview, verifyRejectionReview } from "../_lib/reviewAuth";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  try {
    const body = await readJsonBody(req);
    const applicationId = String(body.applicationId ?? "").trim();
    const status = String(body.status ?? "").trim();
    const note = String(body.note ?? "").trim();
    const txHash = body.txHash ? String(body.txHash).trim() : undefined;

    if (!applicationId) {
      return sendJson(res, 400, { error: "Application ID is required." });
    }

    if (status !== "approved" && status !== "rejected") {
      return sendJson(res, 400, { error: "Review status must be approved or rejected." });
    }

    const current = await findApplicationById(applicationId);
    if (!current) {
      return sendJson(res, 404, { error: "Application not found." });
    }

    if (current.status !== "pending") {
      return sendJson(res, 409, { error: "Only pending applications can be reviewed." });
    }

    let reviewMeta: { reviewedBy: string; dailyCap?: number };

    if (status === "approved") {
      const approvalReview = await verifyApprovalReview(current, txHash);
      reviewMeta = {
        reviewedBy: approvalReview.owner,
        dailyCap: approvalReview.dailyCap,
      };
    } else {
      reviewMeta = {
        reviewedBy: await verifyRejectionReview({
          applicationId,
          status: "rejected",
          note,
          reviewerAddress: body.reviewerAddress ? String(body.reviewerAddress) : undefined,
          reviewTimestamp: body.reviewTimestamp ? String(body.reviewTimestamp) : undefined,
          signature: body.signature ? String(body.signature) : undefined,
        }),
      };
    }

    const applications = await readApplications();
    const updated: InstitutionApplication = {
      ...current,
      status,
      reviewedAt: new Date().toISOString(),
      reviewNote: note || undefined,
      reviewedBy: reviewMeta.reviewedBy,
      txHash,
      dailyCap: reviewMeta.dailyCap ?? current.dailyCap,
    };

    await writeApplications(applications.map((application) => (
      application.id === applicationId ? updated : application
    )));

    return sendJson(res, 200, { data: updated });
  } catch (error) {
    return sendJson(res, 400, {
      error: error instanceof Error ? error.message : "Unable to review application.",
    });
  }
}
