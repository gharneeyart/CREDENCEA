import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Search,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";
import {
  fetchInstitutionApplicationStatus,
  formatApplicationDate,
  formatInstitutionTypeLabel,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import type { InstitutionApplication } from "@/types/onboarding";

/* ── status helpers ─────────────────────────────────────────────────── */

const statusMeta = {
  pending: {
    icon: Clock3,
    label: "Pending review",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    ring: "ring-amber-100",
    dot: "bg-amber-400",
  },
  approved: {
    icon: CheckCircle2,
    label: "Approved",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    ring: "ring-emerald-100",
    dot: "bg-emerald-400",
  },
  rejected: {
    icon: XCircle,
    label: "Rejected",
    color: "text-rose-600",
    bg: "bg-rose-50",
    border: "border-rose-200",
    ring: "ring-rose-100",
    dot: "bg-rose-400",
  },
} as const;

function StatusPill({ status }: { status: InstitutionApplication["status"] }) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        meta.bg,
        meta.color
      )}
    >
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

/* ── timeline dot ───────────────────────────────────────────────────── */

function TimelineStep({
  active,
  done,
  label,
}: {
  active?: boolean;
  done?: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={cn(
          "h-2.5 w-2.5 rounded-full transition-all",
          done && "bg-emerald-400",
          active && "bg-amber-400 animate-pulse",
          !done && !active && "bg-slate-200"
        )}
      />
      <span
        className={cn(
          "font-medium",
          done && "text-emerald-600",
          active && "text-amber-600",
          !done && !active && "text-slate-400"
        )}
      >
        {label}
      </span>
    </div>
  );
}

/* ── application card ───────────────────────────────────────────────── */

function ApplicationCard({
  application,
}: {
  application: InstitutionApplication;
}) {
  const meta = statusMeta[application.status];
  const isApproved = application.status === "approved";
  const isRejected = application.status === "rejected";
  const isPending = application.status === "pending";

  return (
    <article
      className={cn(
        "rounded-2xl border bg-white p-6 shadow-sm transition-all",
        meta.border
      )}
    >
      {/* header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900">
              {application.name}
            </h2>
            <StatusPill status={application.status} />
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            {formatInstitutionTypeLabel(application.institutionType)} ·{" "}
            {application.country}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Clock3 className="h-3 w-3" />
          Submitted {formatApplicationDate(application.submittedAt)}
        </div>
      </div>

      {/* visual timeline */}
      <div className="mt-5 flex gap-6">
        <TimelineStep done label="Applied" />
        <TimelineStep
          done={isApproved || isRejected}
          active={isPending}
          label="Under review"
        />
        <TimelineStep done={isApproved} label="Activated" />
      </div>

      {/* detail grid */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DetailCell label="Wallet">
          <span className="break-all font-mono text-[11px]">
            {application.walletAddress}
          </span>
        </DetailCell>
        <DetailCell label="Abbreviation">
          <span className="font-semibold">{application.abbrev}</span>
        </DetailCell>
        <DetailCell label="Theme">
          <div className="flex items-center gap-1.5">
            <span
              className="h-4 w-4 rounded-full border border-slate-200"
              style={{ backgroundColor: application.themeColor }}
            />
            <span
              className="h-4 w-4 rounded-full border border-slate-200"
              style={{ backgroundColor: application.accentColor }}
            />
            <span className="ml-1 font-mono text-[11px] text-slate-400">
              {application.themeColor}
            </span>
          </div>
        </DetailCell>
        <DetailCell label="Website">
          <a
            href={application.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700"
          >
            Visit <ExternalLink className="h-3 w-3" />
          </a>
        </DetailCell>
      </div>

      {/* review notes */}
      {(application.reviewNote || application.txHash) && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm">
          {application.reviewedAt && (
            <p className="text-slate-500">
              Reviewed on {formatApplicationDate(application.reviewedAt)}
            </p>
          )}
          {application.reviewNote && (
            <p className="mt-1 text-slate-600">
              <strong>Note:</strong> {application.reviewNote}
            </p>
          )}
          {application.txHash && (
            <p className="mt-1 break-all font-mono text-[11px] text-slate-400">
              tx: {application.txHash}
            </p>
          )}
        </div>
      )}

      {/* CTA for approved */}
      {isApproved && (
        <div className="mt-5">
          <Link
            to="/issue"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Go to issue dashboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </article>
  );
}

function DetailCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3.5 py-3">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────────────── */

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20";

export default function OnboardStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [wallet, setWallet] = useState(searchParams.get("wallet") ?? "");
  const [applications, setApplications] = useState<InstitutionApplication[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(
    Boolean(searchParams.get("wallet"))
  );

  const lookup = async (address: string) => {
    const trimmed = address.trim();
    if (!trimmed) return;
    setLoading(true);
    try {
      const result = await fetchInstitutionApplicationStatus(trimmed);
      setApplications(result.applications);
      setHasSearched(true);
      setSearchParams({ wallet: trimmed });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to fetch application status."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const w = searchParams.get("wallet");
    if (w) void lookup(w);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await lookup(wallet);
  };

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto w-11/12 max-w-4xl py-14">
        {/* header */}
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-600">
            Application Tracker
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Check your onboarding status
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
            Paste the wallet address used during your application to see whether
            it's pending, approved, or rejected.
          </p>
        </div>

        {/* search bar */}
        <form
          onSubmit={handleSubmit}
          className="mb-10 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder="0x..."
              className={cn(inputClass, "flex-1")}
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              {loading ? "Checking…" : "Check"}
            </button>
          </div>
        </form>

        {/* results */}
        <div className="space-y-5">
          {!hasSearched ? (
            <Placeholder text="Enter your institution wallet address above to see application records." />
          ) : applications.length === 0 ? (
            <Placeholder text="No onboarding application found for that wallet address." />
          ) : (
            applications.map((app) => (
              <ApplicationCard key={app.id} application={app} />
            ))
          )}
        </div>

        {/* back to onboard */}
        <p className="mt-8 text-center text-sm text-slate-400">
          Haven't applied yet?{" "}
          <Link
            to="/onboard"
            className="font-medium text-sky-600 hover:text-sky-500"
          >
            Start your application →
          </Link>
        </p>
      </div>
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
