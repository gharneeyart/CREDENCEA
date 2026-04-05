import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  FileBadge2,
  GraduationCap,
  Palette,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { PRESET_THEMES } from "@/helpers";
import {
  normaliseInstitutionApplicationInput,
  submitInstitutionApplication,
} from "@/lib/onboarding";
import { cn } from "@/lib/utils";
import type {
  InstitutionApplication,
  InstitutionApplicationInput,
} from "@/types/onboarding";

/* ── constants ──────────────────────────────────────────────────────── */

const INSTITUTION_TYPES = [
  { value: "university", label: "University" },
  { value: "college", label: "College" },
  { value: "polytechnic", label: "Polytechnic" },
  { value: "professional-body", label: "Professional body" },
  { value: "training-institute", label: "Training institute" },
  { value: "other", label: "Other" },
] as const;

const STEPS = [
  { icon: Building2, label: "Institution" },
  { icon: Palette, label: "Branding" },
  { icon: Wallet, label: "Submit" },
];

const initialForm: InstitutionApplicationInput = {
  name: "",
  abbrev: "",
  website: "",
  country: "",
  institutionType: "university",
  walletAddress: "",
  themeColor: "#0ea5e9",
  accentColor: "#0284c7",
};

/* ── shared input style ─────────────────────────────────────────────── */

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-all duration-200 focus:border-sky-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-400/20";

/* ── tiny label ─────────────────────────────────────────────────────── */

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
      {children}
      {required && <span className="ml-0.5 text-sky-500">*</span>}
    </label>
  );
}

/* ── live certificate preview ───────────────────────────────────────── */

function CertPreview({ form }: { form: InstitutionApplicationInput }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/20 p-6 shadow-2xl transition-all duration-500"
      style={{
        background: `linear-gradient(135deg, ${form.themeColor} 0%, ${form.accentColor} 100%)`,
      }}
    >
      {/* decorative circle */}
      <div
        className="absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-15"
        style={{ backgroundColor: "#fff" }}
      />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
            <GraduationCap className="h-4 w-4 text-white" />
          </div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-white/80">
            {form.abbrev || "ABBR"}
          </span>
        </div>

        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-white/60">
            Certificate of Achievement
          </p>
          <p className="mt-1 text-lg font-bold text-white">
            {form.name || "Institution Name"}
          </p>
        </div>

        <div className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/50">
            Awarded to
          </p>
          <p className="mt-0.5 text-sm font-semibold text-white/90">
            Jane Doe
          </p>
        </div>

        <div className="flex items-center justify-between text-[10px] text-white/50">
          <span>{form.country || "Country"}</span>
          <span>
            {form.abbrev || "ABBR"}-0001
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── step 1: institution info ───────────────────────────────────────── */

function StepInstitution({
  form,
  update,
}: {
  form: InstitutionApplicationInput;
  update: <K extends keyof InstitutionApplicationInput>(
    k: K,
    v: InstitutionApplicationInput[K]
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Tell us about your institution
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          We use these details to verify your organisation before activation.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Full name</Label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="University of Lagos"
            className={inputClass}
          />
        </div>
        <div>
          <Label required>Abbreviation</Label>
          <input
            type="text"
            maxLength={8}
            value={form.abbrev}
            onChange={(e) => update("abbrev", e.target.value.toUpperCase())}
            placeholder="UNILAG"
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Max 8 chars — used as certificate ID prefix
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Official website</Label>
          <input
            type="url"
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            placeholder="https://www.unilag.edu.ng"
            className={inputClass}
          />
        </div>
        <div>
          <Label required>Country</Label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            placeholder="Nigeria"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <Label required>Type</Label>
        <div className="flex flex-wrap gap-2">
          {INSTITUTION_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => update("institutionType", value)}
              className={cn(
                "rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
                form.institutionType === value
                  ? "border-sky-500 bg-sky-50 text-sky-700 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── step 2: branding ───────────────────────────────────────────────── */

function StepBranding({
  form,
  setForm,
  update,
}: {
  form: InstitutionApplicationInput;
  setForm: React.Dispatch<React.SetStateAction<InstitutionApplicationInput>>;
  update: <K extends keyof InstitutionApplicationInput>(
    k: K,
    v: InstitutionApplicationInput[K]
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Choose your certificate theme
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Pick preset colours or set your own. This is applied to every
          credential your institution issues.
        </p>
      </div>

      <div>
        <Label>Preset themes</Label>
        <div className="flex flex-wrap gap-2">
          {PRESET_THEMES.map((t) => (
            <button
              key={t.theme}
              type="button"
              onClick={() =>
                setForm((c) => ({
                  ...c,
                  themeColor: t.theme,
                  accentColor: t.accent,
                }))
              }
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                form.themeColor === t.theme
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: t.theme }}
              />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label required>Primary colour</Label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
            <input
              type="color"
              value={form.themeColor}
              onChange={(e) => update("themeColor", e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
            />
            <span className="font-mono text-xs text-slate-500">
              {form.themeColor}
            </span>
          </div>
        </div>
        <div>
          <Label required>Accent colour</Label>
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3">
            <input
              type="color"
              value={form.accentColor}
              onChange={(e) => update("accentColor", e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-0 bg-transparent"
            />
            <span className="font-mono text-xs text-slate-500">
              {form.accentColor}
            </span>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Live preview
        </p>
        <CertPreview form={form} />
      </div>
    </div>
  );
}

/* ── step 3: wallet + review ────────────────────────────────────────── */

function StepSubmit({
  form,
  update,
}: {
  form: InstitutionApplicationInput;
  update: <K extends keyof InstitutionApplicationInput>(
    k: K,
    v: InstitutionApplicationInput[K]
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Connect your institution wallet
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          This is the Ethereum wallet that will be whitelisted to issue
          certificates. No connection needed — just paste the address.
        </p>
      </div>

      <div>
        <Label required>Wallet address</Label>
        <input
          type="text"
          value={form.walletAddress}
          onChange={(e) => update("walletAddress", e.target.value)}
          placeholder="0x..."
          className={inputClass}
        />
        <p className="mt-1.5 text-[11px] text-slate-400">
          Enter the address your institution will use to sign certificate
          issuance transactions.
        </p>
      </div>

      {/* quick summary */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Application summary
        </p>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <SummaryRow label="Name" value={form.name} />
          <SummaryRow label="Abbreviation" value={form.abbrev} />
          <SummaryRow label="Website" value={form.website} />
          <SummaryRow label="Country" value={form.country} />
          <SummaryRow
            label="Type"
            value={
              INSTITUTION_TYPES.find((t) => t.value === form.institutionType)
                ?.label ?? form.institutionType
            }
          />
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Theme</span>
            <span
              className="h-3.5 w-3.5 rounded-full border border-slate-200"
              style={{ backgroundColor: form.themeColor }}
            />
            <span
              className="h-3.5 w-3.5 rounded-full border border-slate-200"
              style={{ backgroundColor: form.accentColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-700">{value || "—"}</span>
    </div>
  );
}

/* ── success state ──────────────────────────────────────────────────── */

function SuccessCard({
  application,
}: {
  application: InstitutionApplication;
}) {
  return (
    <div className="mx-auto w-full max-w-xl py-8">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-7 w-7 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          Application submitted
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
          Your onboarding request for{" "}
          <strong className="text-slate-700">{application.name}</strong> is now
          in the owner's review queue.
        </p>

        <div className="mt-6 rounded-xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Wallet</span>
              <span className="max-w-[200px] truncate font-mono text-xs text-slate-700">
                {application.walletAddress}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                <Clock3 className="h-3 w-3" />
                Pending
              </span>
            </div>
          </div>
        </div>

        <Link
          to={`/onboard/status?wallet=${encodeURIComponent(application.walletAddress)}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Track your application
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

/* ── main page ──────────────────────────────────────────────────────── */

export default function OnboardPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<InstitutionApplicationInput>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<InstitutionApplication | null>(
    null
  );

  const update = <K extends keyof InstitutionApplicationInput>(
    field: K,
    value: InstitutionApplicationInput[K]
  ) => setForm((c) => ({ ...c, [field]: value }));

  const canAdvance = () => {
    if (step === 0) {
      return (
        form.name.trim() &&
        form.abbrev.trim() &&
        form.website.trim() &&
        form.country.trim()
      );
    }
    return true;
  };

  const handleSubmit = async () => {
    try {
      const payload = normaliseInstitutionApplicationInput(form);
      setSubmitting(true);
      const created = await submitInstitutionApplication(payload);
      setSubmitted(created);
      toast.success("Application submitted for review.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to submit onboarding application."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-b from-slate-50 to-white">
        <SuccessCard application={submitted} />
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto w-11/12 max-w-5xl py-14">
        {/* hero text */}
        <div className="mb-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-300">
            <Sparkles className="h-3 w-3" /> Institution Onboarding
          </span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Apply once. Get approved. Start issuing.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
            Fill in your details, pick your certificate theme, and submit. The
            contract owner reviews your application and activates your wallet
            with a single on-chain action.
          </p>
        </div>

        {/* how it works mini strip */}
        <div className="mb-10 grid grid-cols-3 gap-3">
          {[
            {
              icon: FileBadge2,
              title: "Apply",
              desc: "Share institution details and brand colours.",
            },
            {
              icon: Clock3,
              title: "Review",
              desc: "The owner reviews your application.",
            },
            {
              icon: CheckCircle2,
              title: "Activate",
              desc: "Your wallet is whitelisted on-chain.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur"
            >
              <Icon className="mb-2 h-4 w-4 text-sky-400" />
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-400">
                {desc}
              </p>
            </div>
          ))}
        </div>

        {/* wizard card */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white text-slate-900 shadow-2xl shadow-black/30">
          {/* stepper bar */}
          <div className="flex border-b border-slate-100">
            {STEPS.map(({ icon: Icon, label }, i) => {
              const isActive = step === i;
              const isDone = step > i;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => (isDone ? setStep(i) : undefined)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors",
                    isActive && "bg-sky-50 text-sky-700",
                    isDone &&
                      "cursor-pointer text-emerald-600 hover:bg-emerald-50",
                    !isActive && !isDone && "text-slate-400"
                  )}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden text-xs">
                    {i + 1}/{STEPS.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* step content */}
          <div className="p-6 sm:p-8">
            {step === 0 && <StepInstitution form={form} update={update} />}
            {step === 1 && (
              <StepBranding form={form} setForm={setForm} update={update} />
            )}
            {step === 2 && <StepSubmit form={form} update={update} />}
          </div>

          {/* navigation footer */}
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:px-8">
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100 disabled:invisible"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                disabled={!canAdvance()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-40"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={submitting || !form.walletAddress.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-40"
              >
                {submitting ? "Submitting…" : "Submit application"}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* status link */}
        <p className="mt-6 text-center text-sm text-slate-500">
          Already applied?{" "}
          <Link
            to="/onboard/status"
            className="font-medium text-sky-400 hover:text-sky-300"
          >
            Check your application status →
          </Link>
        </p>
      </div>
    </div>
  );
}
