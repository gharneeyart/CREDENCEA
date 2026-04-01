import { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ShieldCheck, Plus, Trash2, Loader2, AlertTriangle, Building2, CheckCircle2, Pause, Play, RefreshCw } from "lucide-react";
import { useAddInstitution, useRemoveInstitution, useIsOwner, useTotalSupply, usePauseContract, useContractPaused, useReplaceInstitutionWallet, useFetchInstitutions } from "@/hooks/useContract";
import { cn } from "@/lib/utils";
import { Gate } from "@/components/ui/Gate";
import { Stat } from "@/components/ui/Stat";
import { PRESET_THEMES, formatDate } from "@/helpers";

const inp = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition";



export default function AdminPage() {
  const { isConnected, address } = useAppKitAccount();
  const isOwnerFn = useIsOwner();
  const addInstitutionFn = useAddInstitution();
  const removeInstitutionFn = useRemoveInstitution();
  const replaceWalletFn = useReplaceInstitutionWallet();
  const totalSupplyFn = useTotalSupply();
  const pauseContractFn = usePauseContract();
  const contractPausedFn = useContractPaused();
  const fetchInstitutionsFn = useFetchInstitutions();

  const [newAddr, setNewAddr] = useState("");
  const [newName, setNewName] = useState("");
  const [newAbbrev, setNewAbbrev] = useState("");
  const [newTheme, setNewTheme] = useState("#0ea5e9");
  const [newAccent, setNewAccent] = useState("#0284c7");
  const [newCap, setNewCap] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingAddr, setRemovingAddr] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  // Institution wallet replacement
  const [replaceOld, setReplaceOld] = useState("");
  const [replaceNew, setReplaceNew] = useState("");
  const [replacing, setReplacing] = useState(false);

  const { data: isOwner, isLoading: checkingOwner } = useQuery({ queryKey: ["isOwner", address], queryFn: isOwnerFn, enabled: !!address && isConnected });
  const { data: totalSupply } = useQuery({ queryKey: ["totalSupply"], queryFn: totalSupplyFn, enabled: isConnected, refetchInterval: 30_000 });
  const { data: isPaused, refetch: refetchPaused } = useQuery({ queryKey: ["paused"], queryFn: contractPausedFn, enabled: isConnected, refetchInterval: 10_000 });
  const {
    data: institutions = [],
    isLoading: loadingInstitutions,
    refetch: refetchInstitutions,
  } = useQuery({
    queryKey: ["institutions"],
    queryFn: fetchInstitutionsFn,
    enabled: !!isOwner && isConnected,
    refetchInterval: 30_000,
  });

  const activeInstitutions = institutions.filter((institution) => institution.active);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.match(/^0x[a-fA-F0-9]{40}$/)) return toast.error("Invalid address");
    if (!newName.trim()) return toast.error("Name required");
    if (!newAbbrev.trim()) return toast.error("Abbreviation required");
    if (newAbbrev.length > 8) return toast.error("Abbreviation max 8 characters");
    setAdding(true);
    try {
      const cap = newCap ? parseInt(newCap) : 0;
      await addInstitutionFn(newAddr.trim(), newName.trim(), newAbbrev.trim().toUpperCase(), newTheme, newAccent, cap);
      await refetchInstitutions();
      setNewAddr(""); setNewName(""); setNewAbbrev(""); setNewCap("");
      toast.success(`${newName} (${newAbbrev.toUpperCase()}) added`);
    } catch (err: unknown) { toast.error((err instanceof Error ? err.message : "Failed").slice(0, 80)); }
    finally { setAdding(false); }
  };

  const handleRemove = async (addr: string, name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    setRemovingAddr(addr);
    try {
      await removeInstitutionFn(addr);
      await refetchInstitutions();
      toast.success(`${name} removed`);
    } catch (err: unknown) { toast.error((err instanceof Error ? err.message : "Failed").slice(0, 80)); }
    finally { setRemovingAddr(null); }
  };

  const handleTogglePause = async () => {
    setToggling(true);
    try {
      await pauseContractFn(!isPaused);
      await refetchPaused();
      toast.success(isPaused ? "Contract unpaused" : "Contract paused");
    } catch (err: unknown) { toast.error((err instanceof Error ? err.message : "Failed").slice(0, 80)); }
    finally { setToggling(false); }
  };

  const handleReplaceWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceOld.match(/^0x[a-fA-F0-9]{40}$/) || !replaceNew.match(/^0x[a-fA-F0-9]{40}$/))
      return toast.error("Both addresses must be valid");
    if (!confirm(`Replace institution wallet?\n${replaceOld}\n→ ${replaceNew}`)) return;
    setReplacing(true);
    try {
      await replaceWalletFn(replaceOld, replaceNew);
      await refetchInstitutions();
      toast.success("Institution wallet replaced");
      setReplaceOld(""); setReplaceNew("");
    } catch (err: unknown) { toast.error((err instanceof Error ? err.message : "Failed").slice(0, 80)); }
    finally { setReplacing(false); }
  };

  if (!isConnected) return <Gate icon={ShieldCheck} title="Connect your wallet" desc="Connect the contract owner wallet to access admin controls." />;
  if (checkingOwner) return <div className="flex items-center justify-center min-h-96"><Loader2 className="w-5 h-5 text-sky-500 animate-spin" /></div>;
  if (!isOwner) return <Gate icon={AlertTriangle} title="Not the contract owner" desc="Only the deployer wallet can access this page." warn />;

  return (
    <div className="w-11/12 lg:w-10/12 mx-auto  py-12 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Institution Management</h1>
        <p className="text-slate-500 text-sm mt-1">Manage institutions, branding, and security controls.</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Stat label="Certificates issued" value={totalSupply?.toString() ?? "—"} icon={CheckCircle2} color="text-sky-500" />
        <Stat label="Active institutions" value={String(activeInstitutions.length)} icon={Building2} color="text-green-600" />
        <Stat label="Contract" value={isPaused ? "Paused" : "Active"} icon={isPaused ? Pause : Play} color={isPaused ? "text-amber-500" : "text-green-600"} />
      </div>

      {/* Emergency pause */}
      <div className={cn("rounded-2xl border p-5", isPaused ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900 text-sm mb-1">Emergency controls</h2>
            <p className="text-slate-500 text-xs">{isPaused ? "Contract is paused — no issuance or revocation possible." : "Pause the contract to halt all activity in an emergency."}</p>
          </div>
          <button onClick={handleTogglePause} disabled={toggling}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0 disabled:opacity-50",
              isPaused ? "bg-green-600 hover:bg-green-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-white")}>
            {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? "Unpause" : "Pause contract"}
          </button>
        </div>
      </div>

      {/* Add institution */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900 text-sm mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-sky-500" />Whitelist an Institution
        </h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Wallet address <span className="text-sky-500">*</span></label>
              <input type="text" placeholder="0x…" value={newAddr} onChange={e => setNewAddr(e.target.value)} required className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Full name <span className="text-sky-500">*</span></label>
              <input type="text" placeholder="Massachusetts Institute of Technology" value={newName} onChange={e => setNewName(e.target.value)} required className={inp} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                Abbreviation <span className="text-sky-500">*</span>
                <span className="text-slate-400 font-normal ml-1">(max 8 chars — used as cert ID prefix)</span>
              </label>
              <input type="text" placeholder="MIT" maxLength={8} value={newAbbrev}
                onChange={e => setNewAbbrev(e.target.value.toUpperCase())} required className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Daily issuance cap <span className="text-slate-400 font-normal">(default: 200)</span></label>
              <input type="number" placeholder="200" min="1" value={newCap} onChange={e => setNewCap(e.target.value)} className={inp} />
            </div>
          </div>

          {/* Theme colour picker */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">Certificate theme colour</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_THEMES.map(p => (
                <button type="button" key={p.theme}
                  onClick={() => { setNewTheme(p.theme); setNewAccent(p.accent); }}
                  className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    newTheme === p.theme ? "border-slate-400 shadow-sm" : "border-slate-200 hover:border-slate-300")}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.theme }} />
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-slate-500 shrink-0">Primary</label>
                <input type="color" value={newTheme} onChange={e => setNewTheme(e.target.value)}
                  className="h-8 w-12 rounded border border-slate-200 cursor-pointer" />
                <span className="text-xs font-mono text-slate-500">{newTheme}</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-xs text-slate-500 shrink-0">Accent</label>
                <input type="color" value={newAccent} onChange={e => setNewAccent(e.target.value)}
                  className="h-8 w-12 rounded border border-slate-200 cursor-pointer" />
                <span className="text-xs font-mono text-slate-500">{newAccent}</span>
              </div>
            </div>
          </div>

          {/* Preview */}
          {newAbbrev && (
            <div className="rounded-xl overflow-hidden border border-slate-200">
              <div className="px-4 py-3 flex items-center gap-2.5"
                style={{ backgroundColor: newTheme + "18", borderBottom: `2px solid ${newTheme}` }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: newTheme }}>
                  {newAbbrev.slice(0, 2)}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: newTheme }}>{newAbbrev}-0001</p>
                  <p className="text-xs text-slate-400">{newName || "Institution name"}</p>
                </div>
                <span className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: newTheme + "20", color: newTheme }}>
                  <CheckCircle2 className="w-3 h-3" />Valid
                </span>
              </div>
              <div className="px-4 py-2 bg-slate-50 text-xs text-slate-400">Certificate card preview</div>
            </div>
          )}

          <button type="submit" disabled={adding}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-semibold text-sm transition-colors">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {adding ? "Adding…" : "Add Institution"}
          </button>
        </form>
      </div>

      {/* Institution table */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-500" />Whitelisted Institutions
          </h2>
        </div>
        {loadingInstitutions ? (
          <div className="px-5 py-10 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
            Loading institutions...
          </div>
        ) : institutions.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">No institutions found on-chain yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr className="text-left">
                  <th className="px-5 py-3 font-medium">Institution</th>
                  <th className="px-5 py-3 font-medium">Wallet</th>
                  <th className="px-5 py-3 font-medium">Brand</th>
                  <th className="px-5 py-3 font-medium">Daily Cap</th>
                  <th className="px-5 py-3 font-medium">Issued Today</th>
                  <th className="px-5 py-3 font-medium">Added</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {institutions.map((institution) => (
                  <tr key={institution.address} className="align-top">
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{ backgroundColor: institution.themeColor }}
                        >
                          {(institution.abbrev || institution.name || "CC").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900">{institution.name || "Unnamed institution"}</div>
                          <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-mono" style={{ backgroundColor: institution.themeColor + "20", color: institution.themeColor }}>
                            {institution.abbrev || "N/A"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-slate-600 break-all max-w-[220px]">{institution.address}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: institution.themeColor }} />
                        <span className="font-mono text-xs text-slate-600">{institution.themeColor}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: institution.accentColor }} />
                        <span className="font-mono text-xs text-slate-600">{institution.accentColor}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{institution.dailyCap.toString()}</td>
                    <td className="px-5 py-4 text-slate-700">{institution.dailyIssuedCount.toString()}</td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(institution.addedAt)}</td>
                    <td className="px-5 py-4">
                      <span className={cn(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
                        institution.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", institution.active ? "bg-green-500" : "bg-slate-400")} />
                        {institution.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {institution.active ? (
                        <button
                          onClick={() => handleRemove(institution.address, institution.name || institution.abbrev || "institution")}
                          disabled={removingAddr === institution.address}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-50 text-red-500 text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          {removingAddr === institution.address ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
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

      {/* Institution wallet replacement */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-900 text-sm mb-1 flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-amber-500" />Replace Institution Wallet
        </h2>
        <p className="text-slate-400 text-xs mb-4">
          Use this when an institution's private key is compromised. The institution record transfers to the new wallet address.
        </p>
        <form onSubmit={handleReplaceWallet} className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Current (compromised) wallet</label>
              <input type="text" placeholder="0x…" value={replaceOld} onChange={e => setReplaceOld(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">New wallet address</label>
              <input type="text" placeholder="0x…" value={replaceNew} onChange={e => setReplaceNew(e.target.value)} className={inp} />
            </div>
          </div>
          <button type="submit" disabled={replacing || !replaceOld || !replaceNew}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-semibold text-sm transition-colors">
            {replacing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {replacing ? "Replacing…" : "Replace Wallet"}
          </button>
        </form>
      </div>

      {/* Contract info */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-slate-600 font-semibold text-xs uppercase tracking-wide mb-3">Contract info</h3>
        <div className="space-y-1.5 text-xs font-mono">
          {[["Address", import.meta.env.VITE_CONTRACT_ADDRESS], ["Network", import.meta.env.VITE_CHAIN_ID], ["Owner", address]].map(([k, v]) => (
            <div key={k} className="flex gap-3">
              <span className="text-slate-400 w-16 shrink-0">{k}</span>
              <span className="text-slate-700 break-all">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}






