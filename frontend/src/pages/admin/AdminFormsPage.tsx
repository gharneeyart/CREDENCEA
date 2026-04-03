import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { AlertTriangle, Loader2, Pause, Play, Plus, RefreshCw } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { PRESET_THEMES } from "@/helpers";
import {
  useAddInstitution,
  useContractPaused,
  usePauseContract,
  useReplaceInstitutionWallet,
} from "@/hooks/useContract";
import { cn } from "@/lib/utils";

const inputClassName = "w-full rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm text-slate-900 placeholder-slate-400 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400";

export default function AdminFormsPage() {
  const addInstitutionFn = useAddInstitution();
  const replaceInstitutionWalletFn = useReplaceInstitutionWallet();
  const pauseContractFn = usePauseContract();
  const contractPausedFn = useContractPaused();

  const [newAddress, setNewAddress] = useState("");
  const [newName, setNewName] = useState("");
  const [newAbbrev, setNewAbbrev] = useState("");
  const [newTheme, setNewTheme] = useState("#0ea5e9");
  const [newAccent, setNewAccent] = useState("#0284c7");
  const [newCap, setNewCap] = useState("");
  const [adding, setAdding] = useState(false);

  const [replaceOld, setReplaceOld] = useState("");
  const [replaceNew, setReplaceNew] = useState("");
  const [replacing, setReplacing] = useState(false);
  const [toggling, setToggling] = useState(false);

  const { data: isPaused, refetch: refetchPaused } = useQuery({
    queryKey: ["paused"],
    queryFn: contractPausedFn,
    refetchInterval: 10_000,
  });

  const handleAddInstitution = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!/^0x[a-fA-F0-9]{40}$/.test(newAddress)) return toast.error("Enter a valid wallet address.");
    if (!newName.trim()) return toast.error("Institution name is required.");
    if (!newAbbrev.trim()) return toast.error("Institution abbreviation is required.");
    if (newAbbrev.trim().length > 8) return toast.error("Institution abbreviation must be 8 characters or fewer.");

    setAdding(true);
    try {
      await addInstitutionFn(
        newAddress.trim(),
        newName.trim(),
        newAbbrev.trim().toUpperCase(),
        newTheme,
        newAccent,
        newCap ? Number.parseInt(newCap, 10) : 0
      );
      setNewAddress("");
      setNewName("");
      setNewAbbrev("");
      setNewCap("");
      toast.success(`${newName.trim()} added`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add institution.");
    } finally {
      setAdding(false);
    }
  };

  const handleReplaceWallet = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!/^0x[a-fA-F0-9]{40}$/.test(replaceOld) || !/^0x[a-fA-F0-9]{40}$/.test(replaceNew)) {
      return toast.error("Both wallet addresses must be valid.");
    }

    if (!confirm(`Replace institution wallet?\n${replaceOld}\n→ ${replaceNew}`)) return;

    setReplacing(true);
    try {
      await replaceInstitutionWalletFn(replaceOld, replaceNew);
      setReplaceOld("");
      setReplaceNew("");
      toast.success("Institution wallet replaced");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to replace institution wallet.");
    } finally {
      setReplacing(false);
    }
  };

  const handleTogglePause = async () => {
    setToggling(true);
    try {
      await pauseContractFn(!isPaused);
      await refetchPaused();
      toast.success(isPaused ? "Contract unpaused" : "Contract paused");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update contract state.");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className={cn(
        "rounded-[28px] border p-6 shadow-sm",
        isPaused ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
      )}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Emergency Controls
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">Contract activity switch</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isPaused ? "The contract is paused, so issuance and revocation actions are blocked." : "Pause the contract immediately if you suspect misuse or need to stop operations."}
            </p>
          </div>
          <button
            onClick={handleTogglePause}
            disabled={toggling}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition-colors disabled:opacity-50",
              isPaused ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"
            )}
          >
            {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {isPaused ? "Unpause contract" : "Pause contract"}
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Whitelist an institution</h2>
              <p className="text-sm text-slate-500">Add a new institution wallet and configure its certificate branding.</p>
            </div>
          </div>

          <form onSubmit={handleAddInstitution} className="mt-6 space-y-5">
            <Field label="Wallet address" required>
              <input type="text" value={newAddress} onChange={(event) => setNewAddress(event.target.value)} placeholder="0x..." className={inputClassName} />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Institution name" required>
                <input type="text" value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Massachusetts Institute of Technology" className={inputClassName} />
              </Field>
              <Field label="Abbreviation" required>
                <input
                  type="text"
                  value={newAbbrev}
                  maxLength={8}
                  onChange={(event) => setNewAbbrev(event.target.value.toUpperCase())}
                  placeholder="MIT"
                  className={inputClassName}
                />
              </Field>
            </div>

            <Field label="Daily issuance cap">
              <input type="number" min="1" value={newCap} onChange={(event) => setNewCap(event.target.value)} placeholder="200" className={inputClassName} />
            </Field>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700">Certificate theme</p>
              <div className="flex flex-wrap gap-2">
                {PRESET_THEMES.map((theme) => (
                  <button
                    key={theme.theme}
                    type="button"
                    onClick={() => {
                      setNewTheme(theme.theme);
                      setNewAccent(theme.accent);
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                      newTheme === theme.theme ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: theme.theme }} />
                    {theme.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Primary colour">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                    <input type="color" value={newTheme} onChange={(event) => setNewTheme(event.target.value)} className="h-10 w-12 rounded border border-slate-200 bg-white" />
                    <span className="font-mono text-xs text-slate-500">{newTheme}</span>
                  </div>
                </Field>
                <Field label="Accent colour">
                  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
                    <input type="color" value={newAccent} onChange={(event) => setNewAccent(event.target.value)} className="h-10 w-12 rounded border border-slate-200 bg-white" />
                    <span className="font-mono text-xs text-slate-500">{newAccent}</span>
                  </div>
                </Field>
              </div>
            </div>

            <button
              type="submit"
              disabled={adding}
              className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
            >
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {adding ? "Adding institution..." : "Add institution"}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Replace institution wallet</h2>
                <p className="text-sm text-slate-500">Transfer an institution record to a new wallet after a compromise or rotation.</p>
              </div>
            </div>

            <form onSubmit={handleReplaceWallet} className="mt-6 space-y-5">
              <Field label="Current institution wallet" required>
                <input type="text" value={replaceOld} onChange={(event) => setReplaceOld(event.target.value)} placeholder="0x..." className={inputClassName} />
              </Field>
              <Field label="New institution wallet" required>
                <input type="text" value={replaceNew} onChange={(event) => setReplaceNew(event.target.value)} placeholder="0x..." className={inputClassName} />
              </Field>
              <button
                type="submit"
                disabled={replacing || !replaceOld || !replaceNew}
                className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                {replacing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {replacing ? "Replacing wallet..." : "Replace wallet"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
