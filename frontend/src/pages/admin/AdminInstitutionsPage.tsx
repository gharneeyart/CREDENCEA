import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Building2, CheckCircle2, Loader2, Pause, Play, Trash2 } from "lucide-react";
import { Stat } from "@/components/ui/Stat";
import { formatDate } from "@/helpers";
import { useContractPaused, useFetchInstitutions, useRemoveInstitution, useTotalSupply } from "@/hooks/useContract";
import { cn } from "@/lib/utils";

export default function AdminInstitutionsPage() {
  const totalSupplyFn = useTotalSupply();
  const contractPausedFn = useContractPaused();
  const fetchInstitutionsFn = useFetchInstitutions();
  const removeInstitutionFn = useRemoveInstitution();
  const [removingAddress, setRemovingAddress] = useState<string | null>(null);

  const { data: totalSupply } = useQuery({
    queryKey: ["totalSupply"],
    queryFn: totalSupplyFn,
    refetchInterval: 30_000,
  });

  const { data: isPaused } = useQuery({
    queryKey: ["paused"],
    queryFn: contractPausedFn,
    refetchInterval: 10_000,
  });

  const { data: institutions = [], isLoading, refetch } = useQuery({
    queryKey: ["institutions"],
    queryFn: fetchInstitutionsFn,
    refetchInterval: 30_000,
  });

  const activeInstitutions = institutions.filter((institution) => institution.active);

  const handleRemove = async (address: string, label: string) => {
    if (!confirm(`Remove ${label}?`)) return;

    setRemovingAddress(address);
    try {
      await removeInstitutionFn(address);
      await refetch();
      toast.success(`${label} removed`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove institution.");
    } finally {
      setRemovingAddress(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Certificates issued" value={totalSupply?.toString() ?? "—"} icon={CheckCircle2} color="text-sky-500" />
        <Stat label="Active institutions" value={String(activeInstitutions.length)} icon={Building2} color="text-emerald-600" />
        <Stat label="Contract status" value={isPaused ? "Paused" : "Active"} icon={isPaused ? Pause : Play} color={isPaused ? "text-amber-500" : "text-emerald-600"} />
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Whitelisted institutions</h2>
            <p className="mt-1 text-sm text-slate-500">Track status, branding, and issuance limits for every institution wallet.</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
            Inactive institutions remain visible for audit history.
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-6 py-16 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
            Loading institutions...
          </div>
        ) : institutions.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">No institutions have been added on-chain yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-left">
                  <th className="px-6 py-3 font-medium">Institution</th>
                  <th className="px-6 py-3 font-medium">Wallet</th>
                  <th className="px-6 py-3 font-medium">Brand</th>
                  <th className="px-6 py-3 font-medium">Daily cap</th>
                  <th className="px-6 py-3 font-medium">Issued today</th>
                  <th className="px-6 py-3 font-medium">Added</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {institutions.map((institution) => (
                  <tr key={institution.address} className="align-top">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white"
                          style={{ backgroundColor: institution.themeColor }}
                        >
                          {(institution.abbrev || institution.name || "CC").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{institution.name || "Unnamed institution"}</p>
                          <span
                            className="mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-mono"
                            style={{ backgroundColor: `${institution.themeColor}20`, color: institution.themeColor }}
                          >
                            {institution.abbrev || "N/A"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="max-w-[220px] break-all font-mono text-xs text-slate-600">{institution.address}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: institution.themeColor }} />
                        <span className="font-mono text-xs text-slate-600">{institution.themeColor}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="h-4 w-4 rounded-full border border-slate-200" style={{ backgroundColor: institution.accentColor }} />
                        <span className="font-mono text-xs text-slate-600">{institution.accentColor}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">{institution.dailyCap.toString()}</td>
                    <td className="px-6 py-4 text-slate-700">{institution.dailyIssuedCount.toString()}</td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(institution.addedAt)}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        institution.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", institution.active ? "bg-emerald-500" : "bg-slate-400")} />
                        {institution.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {institution.active ? (
                        <button
                          onClick={() => handleRemove(institution.address, institution.name || institution.abbrev || "institution")}
                          disabled={removingAddress === institution.address}
                          className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                          {removingAddress === institution.address ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          Remove
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
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
