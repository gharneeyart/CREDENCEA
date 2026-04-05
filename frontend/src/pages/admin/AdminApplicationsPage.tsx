import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Clock3,
  ExternalLink,
  Loader2,
  XCircle,
} from "lucide-react";
import {
  fetchInstitutionApplications,
  formatApplicationDate,
  formatInstitutionTypeLabel,
  reviewInstitutionApplication,
} from "@/lib/onboarding";
import { useAddInstitution, useWalletSigner } from "@/hooks/useContract";
import { cn } from "@/lib/utils";
import type { InstitutionApplication } from "@/types/onboarding";

/* ── status pill ────────────────────────────────────────────────────── */

function StatusPill({ status }: { status: InstitutionApplication["status"] }) {
  const meta = {
    pending: {
      icon: Clock3,
      label: "Pending",
      cls: "bg-amber-50 text-amber-700",
    },
    approved: {
      icon: BadgeCheck,
      label: "Approved",
      cls: "bg-emerald-50 text-emerald-700",
    },
    rejected: {
      icon: XCircle,
      label: "Rejected",
      cls: "bg-rose-50 text-rose-700",
    },
  }[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        meta.cls
      )}
    >
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

/* ── pending application card ───────────────────────────────────────── */

function PendingCard({
  application,
  onApprove,
  onReject,
  processing,
}: {
  application: InstitutionApplication;
  onApprove: (app: InstitutionApplication, cap: number, note: string) => void;
  onReject: (app: InstitutionApplication, note: string) => void;
  processing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [cap, setCap] = useState("");
  const [note, setNote] = useState("");

  return (
    <article className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      {/* collapsed header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >
        <div className="flex items-center gap-4 min-w-0">
          {/* color swatch */}
          <div
            className="h-10 w-10 shrink-0 rounded-xl shadow-inner"
            style={{
              background: `linear-gradient(135deg, ${application.themeColor}, ${application.accentColor})`,
            }}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold text-slate-900 truncate">
                {application.name}
              </span>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
                {application.abbrev}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatInstitutionTypeLabel(application.institutionType)} ·{" "}
              {application.country} · Submitted{" "}
              {formatApplicationDate(application.submittedAt)}
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        )}
      </button>

      {/* expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCell label="Wallet">
              <span className="break-all font-mono text-[11px]">
                {application.walletAddress}
              </span>
            </InfoCell>
            <InfoCell label="Website">
              <a
                href={application.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700"
              >
                {new URL(application.website).hostname}{" "}
                <ExternalLink className="h-3 w-3" />
              </a>
            </InfoCell>
            <InfoCell label="Primary">
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: application.themeColor }}
                />
                <span className="font-mono text-[11px] text-slate-500">
                  {application.themeColor}
                </span>
              </div>
            </InfoCell>
            <InfoCell label="Accent">
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-full border border-slate-200"
                  style={{ backgroundColor: application.accentColor }}
                />
                <span className="font-mono text-[11px] text-slate-500">
                  {application.accentColor}
                </span>
              </div>
            </InfoCell>
          </div>

          {/* actions */}
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto_auto]  items-end">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Daily cap
              </label>
              <input
                type="number"
                min={0}
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                placeholder="default"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note for this decision"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              />
            </div>

            <button
              onClick={() =>
                onApprove(
                  application,
                  cap ? parseInt(cap, 10) : 0,
                  note
                )
              }
              disabled={processing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BadgeCheck className="h-4 w-4" />
              )}
              Approve
            </button>

            <button
              onClick={() => onReject(application, note)}
              disabled={processing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Reject
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function InfoCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────────────── */

export default function AdminApplicationsPage() {
  const addInstitutionFn = useAddInstitution();
  const getWalletSigner = useWalletSigner();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const {
    data: applications = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["institutionApplications"],
    queryFn: () => fetchInstitutionApplications(),
    refetchInterval: 30_000,
  });

  const pending = useMemo(
    () => applications.filter((a) => a.status === "pending"),
    [applications]
  );
  const reviewed = useMemo(
    () => applications.filter((a) => a.status !== "pending"),
    [applications]
  );

  /* approve handler */
  const handleApprove = async (
    app: InstitutionApplication,
    cap: number,
    note: string
  ) => {
    setProcessingId(app.id);
    try {
      const tx = await addInstitutionFn(
        app.walletAddress,
        app.name,
        app.abbrev,
        app.themeColor,
        app.accentColor,
        cap
      );
      await reviewInstitutionApplication({
        applicationId: app.id,
        status: "approved",
        note: note.trim(),
        txHash: tx.hash,
      });
      toast.success(`${app.name} approved and activated on-chain`);
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to approve."
      );
    } finally {
      setProcessingId(null);
    }
  };

  /* reject handler */
  const handleReject = async (app: InstitutionApplication, note: string) => {
    setProcessingId(app.id);
    try {
      const signer = await getWalletSigner();
      await reviewInstitutionApplication(
        {
          applicationId: app.id,
          status: "rejected",
          note: note.trim(),
        },
        { signer }
      );
      toast.success(`${app.name} rejected`);
      await refetch();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to reject."
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* queue header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Onboarding queue
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Review applications and activate institutions with one click.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {pending.length} pending
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
            {reviewed.length} reviewed
          </span>
        </div>
      </div>

      {/* pending queue */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          Loading applications…
        </div>
      ) : pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">
          No pending applications right now. New submissions will appear here
          automatically.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map((app) => (
            <PendingCard
              key={app.id}
              application={app}
              onApprove={handleApprove}
              onReject={handleReject}
              processing={processingId === app.id}
            />
          ))}
        </div>
      )}

      {/* history table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Decision history
          </h3>
          <span className="text-xs text-slate-400">
            {reviewed.length} total
          </span>
        </div>

        {reviewed.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No decisions recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Institution</th>
                  <th className="px-3 py-2">Wallet</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Reviewed</th>
                  <th className="px-3 py-2">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reviewed.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-3">
                      <p className="font-medium text-slate-900">{app.name}</p>
                      <p className="text-xs text-slate-400">{app.abbrev}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span className="max-w-[180px] block truncate font-mono text-xs text-slate-500">
                        {app.walletAddress}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={app.status} />
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {formatApplicationDate(app.reviewedAt)}
                    </td>
                    <td className="px-3 py-3 text-slate-500">
                      {app.reviewNote || "—"}
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
