import { useAppKitAccount } from "@reown/appkit/react";
import { useQuery } from "@tanstack/react-query";
import { Award, FileSpreadsheet, History, Loader2 } from "lucide-react";
import { DashboardShell, type DashboardNavItem } from "@/components/dashboard/DashboardShell";
import { Gate } from "@/components/ui/Gate";
import { shortAddress } from "@/helpers";
import { useIsInstitution, useIsOwner } from "@/hooks/useContract";

const institutionNavItems: DashboardNavItem[] = [
  {
    to: "/issue/forms",
    label: "Issuance Forms",
    description: "Issue single certificates and revoke recently minted records from one operations page.",
    icon: Award,
  },
  {
    to: "/issue/history",
    label: "Certificate History",
    description: "Review the on-chain history for every certificate issued by your institution wallet.",
    icon: History,
  },
  {
    to: "/issue/bulk",
    label: "Bulk CSV Upload",
    description: "Upload a CSV, mint in batches of 50, and export token IDs after completion.",
    icon: FileSpreadsheet,
  },
];

export default function InstitutionDashboardLayout() {
  const { address, isConnected } = useAppKitAccount();
  const isInstitutionFn = useIsInstitution();
  const isOwnerFn = useIsOwner();

  const { data: isOwner, isLoading: ownerLoading } = useQuery({
    queryKey: ["isOwner", address],
    queryFn: isOwnerFn,
    enabled: Boolean(address) && isConnected,
  });

  const { data: isInstitution, isLoading: institutionLoading } = useQuery({
    queryKey: ["isInstitution", address],
    queryFn: () => isInstitutionFn(address!),
    enabled: Boolean(address) && isConnected,
  });

  if (!isConnected) {
    return <Gate icon={Award} title="Connect your wallet" desc="Connect your institution wallet to access the issuance dashboard." />;
  }

  if (ownerLoading || institutionLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-sky-500" />
      </div>
    );
  }

  if (isOwner) {
    return <Gate icon={Award} title="Institution access blocked" desc="Owner wallets cannot access certificate issuance or student pages. Use the admin dashboard instead." warn />;
  }

  if (!isInstitution) {
    return <Gate icon={Award} title="Not an authorised institution" desc="Your wallet has not been whitelisted. Ask the contract owner to add your address first." warn />;
  }

  return (
    <DashboardShell
      badge="Institution Dashboard"
      title="Certificate issuance workspace"
      description="Handle one-off issuances, bulk uploads, and certificate history without leaving the institution dashboard."
      navItems={institutionNavItems}
      sidebarTone="bg-emerald-100 text-emerald-700"
      sidebarAccent="border-emerald-100 bg-linear-to-br from-emerald-50 via-white to-slate-100"
      summary={(
        <div className="rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Institution Wallet</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{shortAddress(address || "")}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Institution wallets can issue and review certificates, but cannot access the admin or student areas.</p>
        </div>
      )}
    />
  );
}
