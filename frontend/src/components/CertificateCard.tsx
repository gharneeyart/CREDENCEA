import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  GraduationCap, Building2, Calendar, CheckCircle2, XCircle,
  ExternalLink, QrCode, Copy, Check, Award, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Certificate } from "@/types";

interface Props {
  cert: Certificate;
  showRevoke?: boolean;
  onRevoke?: (tokenId: bigint) => void;
  revoking?: boolean;
}

export default function CertificateCard({ cert, showRevoke = false, onRevoke, revoking = false }: Props) {
  const navigate = useNavigate();
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);
  const verifyUrl = `${window.location.origin}/certificate/${cert.tokenId}`;
  const meta = cert.metadata;

  // Institution theme — fallback to sky-blue if not set
  const theme = cert.issuerThemeColor || "#0ea5e9";
  const accent = cert.issuerAccentColor || "#0284c7";

  const copyLink = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      "rounded-2xl border bg-white overflow-hidden transition-shadow hover:shadow-md",
      cert.revoked ? "border-red-200 opacity-80" : "border-slate-200"
    )}>
      {/* Institution-branded header bar */}
      <div
        className="px-5 py-3.5 flex items-center justify-between gap-3"
        style={{ backgroundColor: cert.revoked ? "#fef2f2" : theme + "18", borderBottom: `2px solid ${cert.revoked ? "#fca5a5" : theme}` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
            style={{ backgroundColor: cert.revoked ? "#ef4444" : theme }}
          >
            {cert.issuerAbbrev ? cert.issuerAbbrev.slice(0, 2) : <GraduationCap className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: cert.revoked ? "#dc2626" : theme }}>
              {cert.displayId}
            </p>
            <p className="text-xs text-slate-400 truncate">{cert.issuerName || cert.issuer.slice(0, 16) + "…"}</p>
          </div>
        </div>
        <StatusBadge revoked={cert.revoked} theme={theme} />
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        {meta ? (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-slate-900">{meta.name}</h3>
              <p className="text-sm font-medium mt-0.5" style={{ color: theme }}>{meta.degree}</p>
              <p className="text-slate-500 text-sm">{meta.major}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Chip icon={Building2} value={meta.institution} />
              <Chip icon={Calendar} value={meta.graduationYear} />
              <Chip icon={Award} value={meta.grade} />
              <Chip icon={Calendar} value={new Date(meta.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} />
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-xs font-mono break-all">{cert.metadataURI}</p>
        )}

        {showQR && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col items-center gap-2">
            <div className="bg-white border border-slate-200 rounded-xl p-3">
              <QRCodeSVG value={verifyUrl} size={140} fgColor={theme} />
            </div>
            <p className="text-slate-400 text-xs text-center break-all">{verifyUrl}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
          <ActionBtn icon={ExternalLink} label="View" onClick={() => navigate(`/certificate/${cert.tokenId}`)} />
          <ActionBtn icon={QrCode} label={showQR ? "Hide QR" : "QR Code"} onClick={() => setShowQR(v => !v)} />
          <ActionBtn icon={copied ? Check : Copy} label={copied ? "Copied!" : "Copy link"}
            onClick={copyLink} success={copied} />
          {showRevoke && onRevoke && !cert.revoked && (
            <button
              onClick={() => onRevoke(cert.tokenId)}
              disabled={revoking}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors disabled:opacity-50"
            >
              {revoking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
              {revoking ? "Revoking…" : "Revoke"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ revoked, theme }: { revoked: boolean; theme: string }) {
  return (
    <span
      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
      style={revoked
        ? { backgroundColor: "#fee2e2", color: "#dc2626" }
        : { backgroundColor: theme + "20", color: theme }}
    >
      {revoked ? <XCircle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
      {revoked ? "Revoked" : "Valid"}
    </span>
  );
}

function Chip({ icon: Icon, value }: { icon: React.ElementType; value: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5">
      <Icon className="w-3 h-3 text-slate-400 shrink-0" />
      <span className="text-slate-600 text-xs truncate">{value}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, success = false }: {
  icon: React.ElementType; label: string; onClick: () => void; success?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
        success
          ? "bg-green-50 text-green-600"
          : "bg-slate-50 hover:bg-slate-100 text-slate-600"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
