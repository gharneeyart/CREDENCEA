import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAppKitAccount } from "@reown/appkit/react";
import { GraduationCap, Award, Search, ShieldCheck, Menu, X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { CONTRACT_CONFIGURED } from "@/lib/contract";

const navItems = [
  { to: "/issue", label: "Issue", icon: Award },
  { to: "/student", label: "My Certificates", icon: GraduationCap },
  { to: "/verify", label: "Verify", icon: Search },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
];

export default function Layout() {
  const { isConnected } = useAppKitAccount();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Top nav */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">Credencea</span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) => cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}>
                <Icon className="w-4 h-4" />{label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <appkit-button size="sm" />
            <button className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setOpen(v => !v)}>
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-2 flex flex-col gap-0.5">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} onClick={() => setOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive ? "bg-sky-50 text-sky-700" : "text-slate-600"
                )}>
                <Icon className="w-4 h-4" />{label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      {!CONTRACT_CONFIGURED && (
        <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-4 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-amber-800 text-sm">
            <span className="font-semibold">Contract not configured.</span>{" "}
            Add <code className="bg-amber-100 px-1 rounded text-xs font-mono">VITE_CONTRACT_ADDRESS</code> to your{" "}
            <code className="bg-amber-100 px-1 rounded text-xs font-mono">.env</code> file, then restart the dev server.
          </p>
        </div>
      )}

      {!isConnected && (
        <div className="bg-sky-50 border-b border-sky-100 text-center py-2.5 px-4">
          <p className="text-sky-700 text-sm font-medium">
            Connect your wallet to interact with Credencea
          </p>
        </div>
      )}

      <main className="flex-1"><Outlet /></main>

      <footer className="border-t border-slate-100 bg-slate-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-sky-500 flex items-center justify-center">
              <GraduationCap className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium text-slate-500">Credencea</span>
          </div>
          {/* <p>Tamper-proof credentials on Ethereum · Sepolia Testnet · HackVision 2026</p> */}
        </div>
      </footer>
    </div>
  );
}
