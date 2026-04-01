import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Loader2, RefreshCw, Search } from "lucide-react";
import { useFetchCertsByRecipient, useFetchCertificate } from "@/hooks/useContract";
import CertificateCard from "@/components/CertificateCard";
import type { Certificate } from "@/types";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Filter = "all" | "valid" | "revoked";

export default function StudentPage() {
  const { isConnected, address } = useAppKitAccount();
  const fetchIds = useFetchCertsByRecipient();
  const fetchCert = useFetchCertificate();
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading, error, refetch, isFetching } = useQuery<Certificate[]>({
    queryKey: ["studentCerts", address],
    queryFn: async () => {
      const ids = await fetchIds(address!);
      const certs = await Promise.all(ids.map(id => fetchCert(id)));
      return certs.filter(Boolean) as Certificate[];
    },
    enabled: !!address && isConnected,
    staleTime: 20_000,
  });

  const filtered = data?.filter(c =>
    filter === "valid" ? !c.revoked : filter === "revoked" ? c.revoked : true
  );

  if (!isConnected) return (
    <div className="flex flex-col items-center justify-center min-h-96 text-center px-4 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-sky-50 flex items-center justify-center">
        <GraduationCap className="w-8 h-8 text-sky-500" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Connect your wallet</h2>
        <p className="text-slate-500 max-w-sm text-sm">Connect the wallet that received your certificates to view them here.</p>
      </div>
    </div>
  );

  return (
    <div className="w-11/12 lg:w-10/12 mx-auto py-12">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-green-700 uppercase tracking-wide">Student Portal</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">My Certificates</h1>
          <p className="text-slate-400 text-xs font-mono mt-0.5">{address?.slice(0,6)}…{address?.slice(-4)}</p>
        </div>
        <div className="flex items-center gap-2">
          {(["all", "valid", "revoked"] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors",
                filter === f ? "bg-sky-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
              {f}
            </button>
          ))}
          <button onClick={() => refetch()} disabled={isFetching}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50">
            <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Lost wallet notice — informational only */}
      <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 flex gap-3 items-center ">
        <span className="text-blue-400 text-lg shrink-0">ℹ</span>
        <p className="text-blue-700 text-sm">
          <span className="font-semibold">Lost access to this wallet?</span>{" "}
          Contact your issuing institution directly. They can initiate a wallet recovery to migrate your certificates to a new address.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center min-h-64 gap-3 text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
          <span className="text-sm">Fetching your credentials…</span>
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 text-sm">
          Failed to load. Check your network connection and wallet.
        </div>
      )}
      {!isLoading && !error && filtered?.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-64 text-center gap-3">
          <Search className="w-10 h-10 text-slate-200" />
          <p className="text-slate-500 text-sm">
            No {filter !== "all" ? filter : ""} certificates found for this wallet.
          </p>
        </div>
      )}
      {filtered && filtered.length > 0 && (
        <>
          <p className="text-slate-400 text-sm mb-4">
            {filtered.length} certificate{filtered.length !== 1 ? "s" : ""}
          </p>
          {/* NOTE: showRevoke is intentionally false — students cannot revoke */}
          <div className="grid md:grid-cols-2 gap-5">
            {filtered.map(cert => (
              <CertificateCard key={cert.tokenId.toString()} cert={cert} showRevoke={false} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
