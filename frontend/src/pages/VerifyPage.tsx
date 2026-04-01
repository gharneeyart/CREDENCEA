import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Wallet, Hash, ShieldCheck } from "lucide-react";
import { useFetchCertificate, useFetchCertsByRecipient } from "@/hooks/useContract";
import CertificateCard from "@/components/CertificateCard";
import type { Certificate } from "@/types";
import { cn } from "@/lib/utils";

type Mode = "wallet" | "tokenId";

export default function VerifyPage() {
  const [mode, setMode] = useState<Mode>("wallet");
  const [input, setInput] = useState("");
  const [query, setQuery] = useState<{ mode: Mode; value: string } | null>(null);
  const fetchCert = useFetchCertificate();
  const fetchIds = useFetchCertsByRecipient();

  const { data, isLoading, error } = useQuery<Certificate[]>({
    queryKey: ["verify", query?.mode, query?.value],
    queryFn: async () => {
      if (!query) return [];
      if (query.mode === "tokenId") {
        const cert = await fetchCert(BigInt(query.value));
        console.log(cert);
        
        return cert ? [cert] : [];
      }
      const ids = await fetchIds(query.value);
      const certs = await Promise.all(ids.map(id => fetchCert(id)));
      return certs.filter(Boolean) as Certificate[];
    },
    enabled: !!query,
    staleTime: 15_000,
  });

  const isValidInput = mode === "wallet" ? /^0x[a-fA-F0-9]{40}$/.test(input) : /^\d+$/.test(input);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const val = input.trim();
    if (val) setQuery({ mode, value: val });
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header band */}
      <div className="bg-slate-900 text-white py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 text-sm mb-4">
            <ShieldCheck className="w-4 h-4 text-green-400" />
            <span>Public credential verifier · No account required</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Verify a Certificate</h1>
          <p className="text-slate-300 text-sm max-w-md mx-auto">
            Enter a wallet address or token ID to query the blockchain directly. Results are authoritative — no API, no middleman.
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-6">
        {/* Search card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-8">
          {/* Mode toggle */}
          <div className="flex rounded-lg border border-slate-200 p-1 mb-5 bg-slate-50">
            {([["wallet", "By wallet address", Wallet], ["tokenId", "By token ID", Hash]] as const).map(([m, label, Icon]) => (
              <button key={m} onClick={() => { setMode(m); setInput(""); setQuery(null); }}
                className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
                  mode === m ? "bg-white shadow-sm text-slate-900 border border-slate-200" : "text-slate-500 hover:text-slate-700")}>
                <Icon className="w-4 h-4" />{label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={input} onChange={e => setInput(e.target.value)}
                placeholder={mode === "wallet" ? "0x… wallet address" : "Token ID (e.g. 42)"}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition" />
            </div>
            <button type="submit" disabled={!isValidInput || isLoading}
              className="px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors flex items-center gap-2">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
          </form>
        </div>

        {/* Results */}
        {isLoading && (
          <div className="flex items-center justify-center min-h-40 gap-3 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
            <span className="text-sm">Querying the blockchain…</span>
          </div>
        )}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 text-sm">Error querying contract. Check you are on the correct network.</div>}
        {!isLoading && query && data?.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-600 font-semibold text-sm">No certificates found</p>
            <p className="text-slate-400 text-sm mt-1">
              {mode === "wallet" ? "This wallet has no Credencea credentials." : "No certificate exists with this token ID."}
            </p>
          </div>
        )}
        {data && data.length > 0 && (
          <div>
            <p className="text-slate-400 text-sm mb-4">{data.length} result{data.length !== 1 ? "s" : ""}</p>
            <div className="grid md:grid-cols-2 gap-5">
              {data.map(cert => <CertificateCard key={cert.tokenId.toString()} cert={cert} />)}
            </div>
          </div>
        )}

        {/* Explainer */}
        {!query && !isLoading && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 mt-2">
            <h3 className="text-slate-700 font-semibold text-sm mb-3">How verification works</h3>
            <ol className="space-y-2 text-slate-500 text-sm list-decimal list-inside">
              <li>Enter a student's wallet address or a specific token ID.</li>
              <li>Credencea queries the smart contract directly on Ethereum — no intermediary.</li>
              <li>Certificate data and revocation status are returned from the chain.</li>
              <li>A green <strong>Valid</strong> badge means the credential is authentic and has not been revoked.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
