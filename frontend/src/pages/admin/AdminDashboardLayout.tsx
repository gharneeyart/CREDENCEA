import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldCheck, TableProperties, Wrench } from "lucide-react";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { Gate } from "@/components/ui/Gate";
import { shortAddress } from "@/helpers";
import { useIsOwner } from "@/hooks/useContract";

const adminNavItems: DashboardNavItem[] = [
  {
    to: "/admin/institutions",
    label: "Institution Table",
    description: "Review every whitelisted institution, issuance caps, and operational status.",
    icon: TableProperties,
  },
  {
    to: "/admin/forms",
    label: "Admin Forms",
    description: "Add institutions, replace compromised wallets, and use emergency controls.",
    icon: Wrench,
  },
];

export default function AdminDashboardLayout() {
  const { address, isConnected } = useAppKitAccount();
  const isOwnerFn = useIsOwner();
  const { data: isOwner, isLoading } = useQuery({
    queryKey: ["isOwner", address],
    queryFn: isOwnerFn,
    enabled: Boolean(address) && isConnected,
  });

  if (!isConnected) {
    return <Gate icon={ShieldCheck} title="Connect your wallet" desc="Connect the contract owner wallet to access the admin dashboard." />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
      </div>
    );
  }

  if (!isOwner) {
    return <Gate icon={ShieldCheck} title="Admin access only" desc="Only the contract owner wallet can access the admin dashboard." warn />;
  }

  return (
    <DashboardShell
      badge="Owner Dashboard"
      title="Admin control center"
      description="Manage institution access, respond to operational issues, and keep the credential network secure from one place."
      navItems={adminNavItems}
      sidebarTone="bg-sky-100 text-sky-700"
      sidebarAccent="border-sky-100 bg-linear-to-br from-sky-50 via-white to-slate-100"
      // summary={(
      //   <div className="rounded-3xl border border-sky-100 bg-white/90 p-5 shadow-sm">
      //     <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Connected Owner</p>
      //     <p className="mt-2 text-lg font-semibold text-slate-900">{shortAddress(address || "")}</p>
      //     <p className="mt-1 text-xs leading-5 text-slate-500">Owner wallets are intentionally restricted from institution issuance and student pages.</p>
      //   </div>
      // )}
    />
  );
}
