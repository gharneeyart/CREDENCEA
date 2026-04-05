import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { GraduationCap, Menu, X, Award, Search, ShieldCheck, Building2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useIsInstitution, useIsOwner } from "@/hooks/useContract";
import { useAppKitAccount } from "@reown/appkit/react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/onboard", label: "Onboard", icon: Building2 },
  { to: "/issue", label: "Issue", icon: Award },
  { to: "/student", label: "My Certificates", icon: GraduationCap },
  { to: "/verify", label: "Verify", icon: Search },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
];

export default function Nav() {
    const isInstitutionFn = useIsInstitution();
    const { isConnected, address } = useAppKitAccount();    
    const isOwnerFn = useIsOwner();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const { data: isOwner } = useQuery({
    queryKey: ["isOwner", address],
    queryFn: () => isOwnerFn(),
    enabled: !!address && isConnected,
  });
  
  const { data: isInstitution } = useQuery({
    queryKey: ["isInstitution", address],
    queryFn: () => isInstitutionFn(address!),
    enabled: !!address && isConnected,
  });

  const canAccessAdmin = Boolean(isOwner);
  const canAccessIssue = Boolean(isInstitution) && !isOwner;
  const canAccessStudent = !isConnected || (!isOwner && !isInstitution);

  const renderNavItems = () => {
    return navItems.map(({ to, label, icon: Icon }) => {
      if (to === "/admin" && !canAccessAdmin) return null;
      if (to === "/issue" && !canAccessIssue) return null;
      if (to === "/student" && !canAccessStudent) return null;
      
      return (
        <NavLink 
          key={to} 
          to={to}
          onClick={() => setOpen(false)} 
          className={({ isActive }) => cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          )}
        >
          <Icon className="w-4 h-4" />
          {label}
        </NavLink>
      );
    });
  };
    return (
         <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="w-11/12  mx-auto h-16 flex items-center justify-between gap-4">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-lg tracking-tight">Credencea</span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => {
              if (to === "/admin" && !canAccessAdmin) return null;
              if (to === "/issue" && !canAccessIssue) return null;
              if (to === "/student" && !canAccessStudent) return null;
              
              return (
                <NavLink 
                  key={to} 
                  to={to}
                  className={({ isActive }) => cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive ? "bg-sky-50 text-sky-700" : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <appkit-button size="sm" />
            <button 
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              onClick={() => setOpen(v => !v)}
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {open && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-2 flex flex-col gap-0.5">
            {renderNavItems()}
          </div>
        )}
      </header>
    )
}
