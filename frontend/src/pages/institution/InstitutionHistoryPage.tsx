import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, History, Loader2, ShieldX } from "lucide-react";
import { Stat } from "@/components/ui/Stat";
import { formatIssuedDate, shortAddress } from "@/helpers";
import { useFetchIssuedCertificatesByInstitution } from "@/hooks/useContract";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

export default function InstitutionHistoryPage() {
  const { address } = useAppKitAccount();
  const fetchIssuedCertificatesFn = useFetchIssuedCertificatesByInstitution();
  const navigate = useNavigate();

  const { data: certificates = [], isLoading } = useQuery({
    queryKey: ["issuedCertificatesByInstitution", address],
    queryFn: () => fetchIssuedCertificatesFn(address!),
    enabled: Boolean(address),
    refetchInterval: 30_000,
  });

  const validCount = certificates.filter((certificate) => !certificate.revoked).length;
  const revokedCount = certificates.length - validCount;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total issued" value={String(certificates.length)} icon={History} color="text-emerald-600" />
        <Stat label="Valid" value={String(validCount)} icon={CheckCircle2} color="text-sky-500" />
        <Stat label="Revoked" value={String(revokedCount)} icon={ShieldX} color="text-red-500" />
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Certificate history</h2>
            <p className="mt-1 text-sm text-slate-500">Every certificate issued by this institution wallet, newest first.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Issuer wallet: <span className="font-mono text-slate-700">{shortAddress(address || "")}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Loading issued certificates...
          </div>
        ) : certificates.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">No certificates have been issued from this institution yet.</div>
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
                {certificates.map((certificate) => (
                  <tr key={certificate.tokenId.toString()} className="align-top">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-900">{certificate.displayId}</p>
                      <p className="mt-1 text-slate-600">{certificate.metadata?.degree || "Degree unavailable"}</p>
                      <p className="mt-1 text-xs text-slate-400">{certificate.metadata?.major || "Major unavailable"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{certificate.metadata?.name || shortAddress(certificate.recipient)}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {certificate.metadata?.graduationYear || "—"} • {certificate.metadata?.grade || "—"}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="max-w-[220px] break-all font-mono text-xs text-slate-600">{certificate.recipient}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatIssuedDate(certificate.issuedAt, certificate.metadata?.issuedAt)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        certificate.revoked ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", certificate.revoked ? "bg-red-500" : "bg-emerald-500")} />
                        {certificate.revoked ? "Revoked" : "Valid"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/certificate/${certificate.tokenId.toString()}`)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
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
    </div>
  );
}
