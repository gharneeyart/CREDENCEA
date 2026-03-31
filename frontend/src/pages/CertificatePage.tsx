import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { GraduationCap, Building2, Calendar, Award, CheckCircle2, XCircle, ArrowLeft, Loader2, Copy, Check, ExternalLink, ShieldCheck } from "lucide-react";
import { useFetchCertificate } from "@/hooks/useContract";
import { resolveIPFS } from "@/lib/ipfs";
import { cn } from "@/lib/utils";
import { useState } from "react";

export default function CertificatePage() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const fetchCert = useFetchCertificate();
  const [copied, setCopied] = useState(false);
  const verifyUrl = `${window.location.origin}/certificate/${tokenId}`;

  const { data: cert, isLoading, error } = useQuery({
    queryKey: ["certificate", tokenId],
    queryFn: () => fetchCert(BigInt(tokenId!)),
    enabled: !!tokenId,
    staleTime: 30_000,
  });

  const copyLink = async () => {
    await navigator.clipboard.writeText(verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-96 gap-3 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
      <span className="text-sm">Loading certificate…</span>
    </div>
  );

  if (error || !cert || !cert.exists) return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
      <XCircle className="w-12 h-12 text-red-400 mx-auto" />
      <h1 className="text-xl font-bold text-slate-900">Certificate not found</h1>
      <p className="text-slate-500 text-sm">Token #{tokenId} does not exist on this contract.</p>
      <button onClick={() => navigate("/verify")}
        className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
        Back to verifier
      </button>
    </div>
  );

  const meta = cert.metadata;
  const ipfsUrl = cert.metadataURI ? resolveIPFS(cert.metadataURI) : null;
  const theme = cert.issuerThemeColor || "#0ea5e9";
  const accent = cert.issuerAccentColor || "#0284c7";

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />Back
        </button>

        {/* Certificate document */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
          {/* Institution-branded top bar */}
          <div
            className="px-8 py-5"
            style={{ backgroundColor: cert.revoked ? "#fef2f2" : theme + "12", borderBottom: `3px solid ${cert.revoked ? "#ef4444" : theme}` }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: cert.revoked ? "#ef4444" : theme }}>
                  {cert.issuerAbbrev || <GraduationCap className="w-6 h-6" />}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-lg">{cert.issuerName || "Credencea"}</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: cert.revoked ? "#dc2626" : theme }}>
                    {cert.displayId} · ERC-5192 Soulbound Token
                  </p>
                </div>
              </div>
              <span
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shrink-0"
                style={cert.revoked
                  ? { backgroundColor: "#fee2e2", color: "#dc2626" }
                  : { backgroundColor: theme + "20", color: theme }}
              >
                {cert.revoked ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {cert.revoked ? "REVOKED" : "VALID"}
              </span>
            </div>
          </div>

          {/* Main body */}
          <div className="px-8 py-7">
            {meta ? (
              <>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-medium mb-2">This certifies that</p>
                <h1 className="text-3xl font-extrabold text-slate-900 mb-1">{meta.name}</h1>
                <p className="text-lg font-semibold mb-0.5" style={{ color: theme }}>{meta.degree}</p>
                <p className="text-slate-500 mb-6">Major in {meta.major}</p>
                <div className="grid grid-cols-2 gap-4 py-5 border-t border-b border-slate-100">
                  <Detail icon={Building2} label="Institution" value={meta.institution} />
                  <Detail icon={Calendar} label="Graduation" value={meta.graduationYear} />
                  <Detail icon={Award} label="Result" value={meta.grade} />
                  <Detail icon={Calendar} label="Issued"
                    value={new Date(meta.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} />
                </div>
                {meta.description && <p className="text-slate-500 text-sm leading-relaxed mt-5">{meta.description}</p>}
              </>
            ) : (
              <p className="text-slate-400 text-sm font-mono break-all">{cert.metadataURI}</p>
            )}
          </div>

          {/* Provenance */}
          <div className="px-8 py-5 border-t border-slate-100" style={{ backgroundColor: theme + "06" }}>
            <div className="flex items-center gap-1.5 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: theme }} />
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme }}>On-chain provenance</p>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <Prov label="Issuer" value={cert.issuerName ? `${cert.issuerName} (${cert.issuerAbbrev})` : cert.issuer} />
              <Prov label="Recipient" value={cert.recipient} />
              {cert.issuedAt > 0n && <Prov label="Block time" value={new Date(Number(cert.issuedAt) * 1000).toUTCString()} />}
              <Prov label="Metadata" value={cert.metadataURI} link={ipfsUrl ?? undefined} />
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-4 border-t border-slate-100 flex flex-wrap gap-2">
            <button onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            {ipfsUrl && (
              <a href={ipfsUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />View on IPFS
              </a>
            )}
          </div>
        </div>

        {/* QR */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col items-center gap-4">
          <p className="text-slate-500 text-sm font-medium">Verification QR Code</p>
          <div className="border border-slate-200 rounded-xl p-4">
            <QRCodeSVG value={verifyUrl} size={180} fgColor={accent} />
          </div>
          <p className="text-slate-400 text-xs text-center break-all max-w-xs">{verifyUrl}</p>
        </div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-4 h-4 text-slate-300 mt-0.5 shrink-0" />
      <div>
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-slate-800 font-semibold text-sm mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function Prov({ label, value, link }: { label: string; value: string; link?: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-slate-400 w-20 shrink-0">{label}</span>
      {link
        ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 break-all">{value}</a>
        : <span className="text-slate-600 break-all">{value}</span>}
    </div>
  );
}
