import { useState } from "react";
import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ShieldCheck, Plus, Trash2, Loader2, AlertTriangle, Building2, CheckCircle2, Pause, Play, RefreshCw } from "lucide-react";
import { useAddInstitution, useRemoveInstitution, useIsOwner, useTotalSupply, usePauseContract, useContractPaused, useReplaceInstitutionWallet } from "@/hooks/useContract";
import { cn } from "@/lib/utils";

interface LocalInst { address: string; name: string; abbrev: string; theme: string; accent: string; cap: number; }

const inp = "w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent focus:bg-white transition";

const PRESET_THEMES = [
  { label: "Sky blue", theme: "#0ea5e9", accent: "#0284c7" },
  { label: "Emerald", theme: "#059669", accent: "#047857" },
  { label: "Violet", theme: "#7c3aed", accent: "#6d28d9" },
  { label: "Rose", theme: "#e11d48", accent: "#be123c" },
  { label: "Amber", theme: "#d97706", accent: "#b45309" },
  { label: "Navy", theme: "#1e40af", accent: "#1e3a8a" },
];

export default function AdminPage() {
  const { isConnected, address } = useAppKitAccount();
  const isOwnerFn = useIsOwner();
  const addInstitutionFn = useAddInstitution();
  const removeInstitutionFn = useRemoveInstitution();
  const replaceWalletFn = useReplaceInstitutionWallet();
  const totalSupplyFn = useTotalSupply();
  const pauseContractFn = usePauseContract();
  const contractPausedFn = useContractPaused();

  const [newAddr, setNewAddr] = useState("");
  const [newName, setNewName] = useState("");
  const [newAbbrev, setNewAbbrev] = useState("");
  const [newTheme, setNewTheme] = useState("#0ea5e9");
  const [newAccent, setNewAccent] = useState("#0284c7");
  const [newCap, setNewCap] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingAddr, setRemovingAddr] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [institutions, setInstitutions] = useState<LocalInst[]>([]);

  // Institution wallet replacement
  const [replaceOld, setReplaceOld] = useState("");
  const [replaceNew, setReplaceNew] = useState("");
  const [replacing, setReplacing] = useState(false);

  const { data: isOwner, isLoading: checkingOwner } = useQuery({ queryKey: ["isOwner", address], queryFn: isOwnerFn, enabled: !!address && isConnected });
  const { data: totalSupply } = useQuery({ queryKey: ["totalSupply"], queryFn: totalSupplyFn, enabled: isConnected, refetchInterval: 30_000 });
  const { data: isPaused, refetch: refetchPaused } = useQuery({ queryKey: ["paused"], queryFn: contractPausedFn, enabled: isConnected, refetchInterval: 10_000 });

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
      setInstitutions(p => [{ address: newAddr.trim(), name: newName.trim(), abbrev: newAbbrev.trim().toUpperCase(), theme: newTheme, accent: newAccent, cap: cap || 200 }, ...p]);
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
      setInstitutions(p => p.filter(i => i.address !== addr));
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
      toast.success("Institution wallet replaced");
      setReplaceOld(""); setReplaceNew("");
    } catch (err: unknown) { toast.error((err instanceof Error ? err.message : "Failed").slice(0, 80)); }
    finally { setReplacing(false); }
  };

  if (!isConnected) return <Gate icon={ShieldCheck} title="Connect your wallet" desc="Connect the contract owner wallet to access admin controls." />;
  if (checkingOwner) return <div className="flex items-center justify-center min-h-96"><Loader2 className="w-5 h-5 text-sky-500 animate-spin" /></div>;
  if (!isOwner) return <Gate icon={AlertTriangle} title="Not the contract owner" desc="Only the deployer wallet can access this page." warn />;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">Admin Panel</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Contract Management</h1>
        <p className="text-slate-500 text-sm mt-1">Manage institutions, branding, and contract-level security controls.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Certificates issued" value={totalSupply?.toString() ?? "—"} icon={CheckCircle2} color="text-sky-500" />
        <Stat label="Institutions (session)" value={String(institutions.length)} icon={Building2} color="text-green-600" />
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

      {/* Institution list */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-500" />Whitelisted Institutions (this session)
          </h2>
        </div>
        {institutions.length === 0
          ? <div className="px-5 py-10 text-center text-slate-400 text-sm">No institutions added this session.</div>
          : <ul className="divide-y divide-slate-100">
            {institutions.map(inst => (
              <li key={inst.address} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: inst.theme }}>
                  {inst.abbrev.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-slate-800 font-medium text-sm">{inst.name}</p>
                    <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: inst.theme + "20", color: inst.theme }}>{inst.abbrev}</span>
                  </div>
                  <p className="text-slate-400 text-xs font-mono truncate">{inst.address}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0 hidden sm:block">Cap: {inst.cap}/day</span>
                <button onClick={() => handleRemove(inst.address, inst.name)} disabled={removingAddr === inst.address}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0">
                  {removingAddr === inst.address ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </li>
            ))}
          </ul>}
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
          {[["Address", import.meta.env.VITE_CONTRACT_ADDRESS || "not set"], ["Network", import.meta.env.VITE_CHAIN_ID === "11155111" ? "Sepolia Testnet" : "Localhost / Other"], ["Owner", address]].map(([k, v]) => (
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

function Stat({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <Icon className={cn("w-4 h-4 mb-2", color)} />
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-slate-400 text-xs mt-0.5">{label}</p>
    </div>
  );
}

function Gate({ icon: Icon, title, desc, warn = false }: { icon: React.ElementType; title: string; desc: string; warn?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-96 text-center px-4 gap-4">
      <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center", warn ? "bg-amber-50" : "bg-sky-50")}>
        <Icon className={cn("w-8 h-8", warn ? "text-amber-500" : "text-sky-500")} />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">{title}</h2>
        <p className="text-slate-500 max-w-sm text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
