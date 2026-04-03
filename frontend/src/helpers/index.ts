import { GraduationCap, Award, Search, ShieldCheck, Lock, Zap, Globe  } from "lucide-react";

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export const DEGREES = [
  "Bachelor of Technology (B.Tech)", "Bachelor of Engineering (B.E)",
  "Bachelor of Science (B.Sc)", "Bachelor of Arts (B.A)", "Bachelor of Commerce (B.Com)",
  "Bachelor of Laws (LLB)", "Bachelor of Medicine (MBBS/MBChB)",
  "Master of Technology (M.Tech)", "Master of Science (M.Sc)", "Master of Arts (M.A)",
  "Master of Business Administration (MBA)", "Master of Laws (LLM)",
  "Doctor of Philosophy (PhD)", "Postgraduate Diploma", "Diploma", "Certificate Programme",
];

export const PRESET_THEMES = [
  { label: "Sky blue", theme: "#0ea5e9", accent: "#0284c7" },
  { label: "Emerald", theme: "#059669", accent: "#047857" },
  { label: "Violet", theme: "#7c3aed", accent: "#6d28d9" },
  { label: "Rose", theme: "#e11d48", accent: "#be123c" },
  { label: "Amber", theme: "#d97706", accent: "#b45309" },
  { label: "Navy", theme: "#1e40af", accent: "#1e3a8a" },
];

export function formatDate(timestamp: bigint): string {
  if (!timestamp) return "—";
  return new Date(Number(timestamp) * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export const steps = [
  { n: "01", title: "Institution registered", desc: "Contract owner whitelists a university or school on-chain." },
  { n: "02", title: "Certificate minted", desc: "Institution fills out a form; metadata uploads to IPFS and an SBT mints to the student's wallet." },
  { n: "03", title: "Student shares", desc: "Student copies a link or shows a QR code to any employer or verifier." },
  { n: "04", title: "Anyone verifies", desc: "Verifier enters wallet address or token ID. The blockchain returns pass/fail instantly — no API, no middleman." },
];

export const features = [
  { icon: Lock, title: "Soulbound (ERC-5192)", desc: "Non-transferable by design. The credential lives in the student's wallet permanently — it cannot be sold or reassigned." },
  { icon: Zap, title: "Instant on-chain verification", desc: "No email to an admissions office. Verification happens in under a second, straight from the Ethereum ledger." },
  { icon: Globe, title: "QR code sharing", desc: "Every certificate generates a verifiable QR link. Works anywhere — CV, LinkedIn, email footer." },
  { icon: ShieldCheck, title: "Hardened contract security", desc: "Rate limiting, reentrancy guards, pausable emergency stop, two-step ownership, and a 30-day revocation window." },
];

export const roles = [
  { icon: Award, title: "Institution", desc: "Issue tamper-proof credentials to graduates", to: "/issue", color: "bg-sky-500" },
  { icon: GraduationCap, title: "Student", desc: "View, share and QR-export your certificates", to: "/student", color: "bg-green-600" },
  { icon: Search, title: "Verifier", desc: "Verify any credential on-chain — no account needed", to: "/verify", color: "bg-slate-700" },
];

export function formatIssuedDate(onChainIssuedAt: bigint, metadataIssuedAt?: string): string {
  if (metadataIssuedAt) {
    return new Date(metadataIssuedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (!onChainIssuedAt) return "—";

  return new Date(Number(onChainIssuedAt) * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
