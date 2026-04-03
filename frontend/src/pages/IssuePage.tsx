import { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import toast from "react-hot-toast";
import { Award, Loader2, CheckCircle2, ExternalLink, AlertTriangle } from "lucide-react";
import { useIssueCertificate, useIsInstitution, useRevokeCertificate, useFetchIssuedCertificatesByInstitution } from "@/hooks/useContract";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import type { IssueFormData, TxStatus } from "@/types";
import { shortAddress, DEGREES, formatIssuedDate } from "@/helpers";
import { cn } from "@/lib/utils";
import { Field } from "@/components/ui/Field";
import { Gate } from "@/components/ui/Gate";



const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 12 }, (_, i) => String(CURRENT_YEAR - i));
const defaultForm: IssueFormData = {
  recipientAddress: "", studentName: "", degree: "",
  major: "", graduationYear: String(CURRENT_YEAR), grade: "", description: "",
};
const inp = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition";

export default function IssuePage() {
  const { isConnected, address } = useAppKitAccount();
  const isInstitutionFn = useIsInstitution();
  const issueCertificate = useIssueCertificate();
  const revokeFn = useRevokeCertificate();
  const fetchIssuedCertificates = useFetchIssuedCertificatesByInstitution();
  const navigate = useNavigate();
  const [form, setForm] = useState<IssueFormData>(defaultForm);
  const [status, setStatus] = useState<TxStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [mintedId, setMintedId] = useState<bigint | null>(null);
  const [revokeId, setRevokeId] = useState("");
  const [revoking, setRevoking] = useState(false);

  const { data: isInstitution, isLoading: checkingRole } = useQuery({
    queryKey: ["isInstitution", address],
    queryFn: () => isInstitutionFn(address!),
    enabled: !!address && isConnected,
  });
  const {
    data: issuedCertificates = [],
    isLoading: loadingIssuedCertificates,
    refetch: refetchIssuedCertificates,
  } = useQuery({
    queryKey: ["issuedCertificatesByInstitution", address],
    queryFn: () => fetchIssuedCertificates(address!),
    enabled: !!address && isConnected && !!isInstitution,
    refetchInterval: 30_000,
  });

  const set = (f: keyof IssueFormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return toast.error("Connect your wallet first");
    if (!isInstitution) return toast.error("Not a whitelisted institution");
    if (!form.recipientAddress.match(/^0x[a-fA-F0-9]{40}$/))
      return toast.error("Invalid recipient wallet address");
    setStatus("uploading"); setMintedId(null);
    try {
      const tokenId = await issueCertificate(form, msg => {
        setStatusMsg(msg);
        setStatus(msg.includes("IPFS") ? "uploading" : "pending");
      });
      await refetchIssuedCertificates();
      setStatus("success"); setMintedId(tokenId); setForm(defaultForm);
      toast.success(`Certificate ${tokenId} issued!`);
    } catch (err: unknown) {
      setStatus("error");
      toast.error((err instanceof Error ? err.message : "Transaction failed").slice(0, 90));
    }
  };

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeId.match(/^\d+$/)) return toast.error("Enter a valid token ID");
    if (!confirm(`Revoke token #${revokeId}? This cannot be undone.`)) return;
    setRevoking(true);
    try {
      await revokeFn(BigInt(revokeId));
      await refetchIssuedCertificates();
      toast.success(`Certificate #${revokeId} revoked`);
      setRevokeId("");
    } catch (err: unknown) {
      toast.error((err instanceof Error ? err.message : "Failed").slice(0, 90));
    } finally { setRevoking(false); }
  };

  if (!isConnected) return <Gate icon={Award} title="Connect your wallet" desc="Connect your institution wallet to issue certificates." />;
  if (checkingRole) return <div className="flex items-center justify-center min-h-96"><Loader2 className="w-5 h-5 text-sky-500 animate-spin" /></div>;
  if (!isInstitution) return <Gate icon={AlertTriangle} title="Not an authorised institution" desc="Your wallet has not been whitelisted. Ask the contract owner to add your address." warn />;

  return (
    <div className="w-11/12 mx-auto px-4 sm:px-6 py-12 space-y-8">
      {/* Issue form */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
            <Award className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-sky-600 uppercase tracking-wide">Issue Certificate</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Mint a soulbound credential</h1>
        <p className="text-slate-500 text-sm">Metadata uploads to IPFS, then the token is minted on-chain to the student's wallet.</p>
      </div>

      {status === "success" && mintedId !== null && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-green-800 font-semibold text-sm">Certificate issued successfully</p>
            <p className="text-green-700 text-sm mt-0.5">Token #{mintedId.toString()} minted.</p>
            <button onClick={() => navigate(`/certificate/${mintedId}`)}
              className="mt-2 flex items-center gap-1 text-sm text-green-700 hover:text-green-900 font-medium">
              <ExternalLink className="w-3.5 h-3.5" />View certificate
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white rounded-2xl border border-slate-200 p-6">
        <Field label="Student wallet address" required>
          <input type="text" placeholder="0x…" value={form.recipientAddress}
            onChange={set("recipientAddress")} required className={inp} />
        </Field>
        <Field label="Student full name" required>
          <input type="text" placeholder="Jane Smith" value={form.studentName}
            onChange={set("studentName")} required className={inp} />
        </Field>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Degree" required>
            <select value={form.degree} onChange={set("degree")} required className={inp}>
              <option value="">Select degree…</option>
              {DEGREES.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Major / Field of study" required>
            <input type="text" placeholder="Computer Science" value={form.major}
              onChange={set("major")} required className={inp} />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <Field label="Graduation year" required>
            <select value={form.graduationYear} onChange={set("graduationYear")} required className={inp}>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="Grade / Result" required>
            <input type="text" placeholder="3.9 GPA / First Class / Distinction"
              value={form.grade} onChange={set("grade")} required className={inp} />
          </Field>
        </div>
        <Field label="Additional notes (optional)">
          <textarea rows={3} placeholder="Honours, specialisation, awards…"
            value={form.description} onChange={set("description")}
            className={cn(inp, "resize-none")} />
        </Field>
        {(status === "uploading" || status === "pending") && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 flex items-center gap-2.5 text-sm text-sky-700">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />{statusMsg || "Processing…"}
          </div>
        )}
        <button type="submit" disabled={status === "uploading" || status === "pending"}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors">
          {(status === "uploading" || status === "pending")
            ? <><Loader2 className="w-4 h-4 animate-spin" />{statusMsg || "Processing…"}</>
            : <><Award className="w-4 h-4" />Issue Certificate</>}
        </button>
      </form>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Certificates Issued By Your Institution</h2>
          <p className="text-slate-400 text-xs mt-1">Latest on-chain certificates minted from this wallet.</p>
        </div>
        {loadingIssuedCertificates ? (
          <div className="px-6 py-10 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
            Loading issued certificates...
          </div>
        ) : issuedCertificates.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-400 text-sm">No certificates issued from this institution yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-left">
                  <th className="px-6 py-3 font-medium">Certificate</th>
                  <th className="px-6 py-3 font-medium">Student</th>
                  <th className="px-6 py-3 font-medium">Recipient</th>
                  <th className="px-6 py-3 font-medium">Issued</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {issuedCertificates.map((certificate) => (
                  <tr key={certificate.tokenId.toString()} className="align-top">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{certificate.displayId}</div>
                      <div className="text-slate-500 mt-1">{certificate.metadata?.degree || "Degree unavailable"}</div>
                      <div className="text-xs text-slate-400 mt-1">{certificate.metadata?.major || "Major unavailable"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{certificate.metadata?.name || shortAddress(certificate.recipient)}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {certificate.metadata?.graduationYear || "—"} • {certificate.metadata?.grade || "—"}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-slate-600 break-all max-w-[200px]">{certificate.recipient}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatIssuedDate(certificate.issuedAt, certificate.metadata?.issuedAt)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                        certificate.revoked ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", certificate.revoked ? "bg-red-500" : "bg-green-500")} />
                        {certificate.revoked ? "Revoked" : "Valid"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/certificate/${certificate.tokenId}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-medium transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revoke panel — institutions only */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 text-sm mb-1">Revoke a Certificate</h2>
        <p className="text-slate-400 text-xs mb-4">Only you (the issuing institution) can revoke certificates you issued. Revocation is only possible within 30 days of issuance unless the contract owner grants an override.</p>
        <form onSubmit={handleRevoke} className="flex gap-2">
          <input type="text" placeholder="Token ID (e.g. 42)" value={revokeId}
            onChange={e => setRevokeId(e.target.value)}
            className={cn(inp, "flex-1")} />
          <button type="submit" disabled={revoking || !revokeId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 disabled:opacity-40 text-white font-semibold text-sm transition-colors">
            {revoking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {revoking ? "Revoking…" : "Revoke"}
          </button>
        </form>
      </div>
    </div>
  );
}








