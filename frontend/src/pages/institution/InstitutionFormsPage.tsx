import { useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Award, CheckCircle2, ExternalLink, Loader2, ShieldAlert } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { DEGREES } from "@/helpers";
import { useIssueCertificate, useRevokeCertificate } from "@/hooks/useContract";
import { cn } from "@/lib/utils";
import type { IssueFormData, TxStatus } from "@/types";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 12 }, (_, index) => String(currentYear - index));
const defaultForm: IssueFormData = {
  recipientAddress: "",
  studentName: "",
  degree: "",
  major: "",
  graduationYear: String(currentYear),
  grade: "",
  description: "",
};
const inputClassName = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400";

export default function InstitutionFormsPage() {
  const navigate = useNavigate();
  const issueCertificateFn = useIssueCertificate();
  const revokeCertificateFn = useRevokeCertificate();

  const [form, setForm] = useState<IssueFormData>(defaultForm);
  const [status, setStatus] = useState<TxStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [mintedId, setMintedId] = useState<bigint | null>(null);
  const [revokeId, setRevokeId] = useState("");
  const [revoking, setRevoking] = useState(false);

  const updateField = (field: keyof IssueFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((previous) => ({ ...previous, [field]: event.target.value }));
    };

  const handleIssue = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!/^0x[a-fA-F0-9]{40}$/.test(form.recipientAddress)) {
      return toast.error("Enter a valid student wallet address.");
    }

    setStatus("uploading");
    setStatusMessage("Preparing certificate...");
    setMintedId(null);

    try {
      const tokenId = await issueCertificateFn(form, (message) => {
        setStatusMessage(message);
        setStatus(message.includes("IPFS") || message.includes("Rendering") ? "uploading" : "pending");
      });

      setForm(defaultForm);
      setMintedId(tokenId);
      setStatus("success");
      setStatusMessage("Certificate issued successfully.");
      toast.success(`Certificate #${tokenId.toString()} issued`);
    } catch (error) {
      setStatus("error");
      toast.error(error instanceof Error ? error.message : "Certificate issuance failed.");
    }
  };

  const handleRevoke = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!/^\d+$/.test(revokeId)) return toast.error("Enter a valid token ID.");
    if (!confirm(`Revoke token #${revokeId}? This cannot be undone.`)) return;

    setRevoking(true);
    try {
      await revokeCertificateFn(BigInt(revokeId));
      setRevokeId("");
      toast.success(`Certificate #${revokeId} revoked`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke certificate.");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      {status === "success" && mintedId !== null ? (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Certificate issued successfully</p>
              <p className="mt-1 text-sm text-emerald-700">Token #{mintedId.toString()} has been minted to the student wallet.</p>
              <button
                onClick={() => navigate(`/certificate/${mintedId.toString()}`)}
                className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 transition-colors hover:text-emerald-900"
              >
                <ExternalLink className="h-4 w-4" />
                View certificate
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <form onSubmit={handleIssue} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Issue a certificate</h2>
              <p className="text-sm text-slate-500">Create the certificate image, upload metadata to IPFS, then mint the soulbound token on-chain.</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <Field label="Student wallet address" required>
              <input type="text" value={form.recipientAddress} onChange={updateField("recipientAddress")} placeholder="0x..." className={inputClassName} />
            </Field>
            <Field label="Student full name" required>
              <input type="text" value={form.studentName} onChange={updateField("studentName")} placeholder="Jane Smith" className={inputClassName} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Degree" required>
                <select value={form.degree} onChange={updateField("degree")} className={inputClassName}>
                  <option value="">Select degree...</option>
                  {DEGREES.map((degree) => (
                    <option key={degree} value={degree}>
                      {degree}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Major / field of study" required>
                <input type="text" value={form.major} onChange={updateField("major")} placeholder="Computer Science" className={inputClassName} />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Graduation year" required>
                <select value={form.graduationYear} onChange={updateField("graduationYear")} className={inputClassName}>
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Grade / result" required>
                <input type="text" value={form.grade} onChange={updateField("grade")} placeholder="First Class / Distinction / 3.9 GPA" className={inputClassName} />
              </Field>
            </div>
            <Field label="Additional notes">
              <textarea value={form.description} onChange={updateField("description")} rows={4} placeholder="Honours, specialisation, awards..." className={cn(inputClassName, "resize-none")} />
            </Field>

            {(status === "uploading" || status === "pending") ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{statusMessage || "Processing..."}</span>
                </div>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={status === "uploading" || status === "pending"}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              {(status === "uploading" || status === "pending") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
              {(status === "uploading" || status === "pending") ? statusMessage || "Processing..." : "Issue certificate"}
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Revoke a certificate</h2>
                <p className="text-sm text-slate-500">Only the issuing institution can revoke, and only within 30 days unless an owner override exists.</p>
              </div>
            </div>

            <form onSubmit={handleRevoke} className="mt-6 space-y-5">
              <Field label="Token ID" required>
                <input type="text" value={revokeId} onChange={(event) => setRevokeId(event.target.value)} placeholder="42" className={inputClassName} />
              </Field>
              <button
                type="submit"
                disabled={revoking || !revokeId}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                {revoking ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                {revoking ? "Revoking..." : "Revoke certificate"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
