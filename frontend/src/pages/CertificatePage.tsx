// import { useParams, useNavigate } from "react-router-dom";
// import { useQuery } from "@tanstack/react-query";
// import { QRCodeSVG } from "qrcode.react";
// import { XCircle, ArrowLeft, Loader2, Copy, Check, ExternalLink } from "lucide-react";
// import { useFetchCertificate } from "@/hooks/useContract";
// import { resolveIPFS } from "@/lib/ipfs";
// import { useState } from "react";

// export default function CertificatePage() {
//   const { tokenId } = useParams<{ tokenId: string }>();
//   const navigate = useNavigate();
//   const fetchCert = useFetchCertificate();
//   const [copied, setCopied] = useState(false);
//   const [showQR, setShowQR] = useState(false);
//   const verifyUrl = `${window.location.origin}/certificate/${tokenId}`;

//   const { data: cert, isLoading, error } = useQuery({
//     queryKey: ["certificate", tokenId],
//     queryFn: () => fetchCert(BigInt(tokenId!)),
//     enabled: !!tokenId,
//     staleTime: 30_000,
//   });

//   const copyLink = async () => {
//     await navigator.clipboard.writeText(verifyUrl);
//     setCopied(true);
//     setTimeout(() => setCopied(false), 2000);
//   };

//   if (isLoading) return (
//     <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "24rem", gap: "12px", color: "#94a3b8" }}>
//       <Loader2 style={{ width: 20, height: 20, color: "#0ea5e9", animation: "spin 1s linear infinite" }} />
//       <span style={{ fontSize: 14 }}>Loading certificate…</span>
//     </div>
//   );

//   if (error || !cert || !cert.exists) return (
//     <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 16px", textAlign: "center" }}>
//       <XCircle style={{ width: 48, height: 48, color: "#f87171", margin: "0 auto 16px" }} />
//       <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Certificate not found</h1>
//       <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>Token #{tokenId} does not exist on this contract.</p>
//       <button onClick={() => navigate("/verify")}
//         style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 14, cursor: "pointer" }}>
//         Back to verifier
//       </button>
//     </div>
//   );

//   const meta = cert.metadata;
//   const ipfsUrl = cert.metadataURI ? resolveIPFS(cert.metadataURI) : null;
//   const theme = cert.issuerThemeColor || "#0e2a5c";
//   const accent = cert.issuerAccentColor || "#c9b97a";
//   const isRevoked = cert.revoked;

//   const gold = "#c9b97a";
//   const goldLight = "#d4c47e";
//   const navy = theme;
//   const parchment = "#fefcf7";
//   const parchmentBg = "#f0ece4";
//   const inkDark = "#1a1610";
//   const inkMid = "#5a4820";
//   const inkLight = "#8a7040";
//   const inkFaint = "#a08a4a";

//   const issueDate = meta?.issuedAt
//     ? new Date(meta.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
//     : cert.issuedAt > 0n
//       ? new Date(Number(cert.issuedAt) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
//       : "—";

//   return (
//     <div style={{ background: parchmentBg, minHeight: "100vh", padding: "32px 16px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
//       <div style={{ maxWidth: 660, margin: "0 auto" }}>

//         {/* Back button */}
//         <button onClick={() => navigate(-1)}
//           style={{ display: "flex", alignItems: "center", gap: 6, color: inkFaint, background: "none", border: "none", fontSize: 13, cursor: "pointer", marginBottom: 20, fontFamily: "inherit" }}>
//           <ArrowLeft style={{ width: 14, height: 14 }} />
//           Back
//         </button>

//         {/* ── Main certificate parchment ── */}
//         <div style={{ background: parchment, border: `1px solid ${gold}`, position: "relative", overflow: "hidden" }}>

//           {/* Double-rule border inset */}
//           <div style={{ position: "absolute", inset: 10, border: `1px solid ${gold}`, pointerEvents: "none", zIndex: 1 }} />
//           <div style={{ position: "absolute", inset: 14, border: `0.5px solid ${goldLight}`, pointerEvents: "none", zIndex: 1 }} />

//           {/* Corner ornaments */}
//           {[
//             { top: 8, left: 8, transform: "none" },
//             { top: 8, right: 8, transform: "scaleX(-1)" },
//             { bottom: 8, left: 8, transform: "scaleY(-1)" },
//             { bottom: 8, right: 8, transform: "scale(-1,-1)" },
//           ].map((pos, i) => (
//             <div key={i} style={{ position: "absolute", width: 28, height: 28, zIndex: 2, ...pos }}>
//               <svg viewBox="0 0 28 28" width="28" height="28" style={{ transform: pos.transform as string }}>
//                 <path d="M2 26 L2 4 Q2 2 4 2 L26 2" stroke={gold} strokeWidth="1.5" fill="none" />
//                 <circle cx="4" cy="4" r="2" fill={gold} />
//               </svg>
//             </div>
//           ))}

//           {/* Header band */}
//           <div style={{ background: isRevoked ? "#7f1d1d" : accent, padding: "20px 56px 16px", textAlign: "center", position: "relative" }}>
//             <p style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontSize: 15, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: isRevoked ? "#fca5a5" : "#e8d87a", margin: "0 0 3px" }}>
//               {cert.issuerName || "CertChain"}
//             </p>
//             <p style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: isRevoked ? "#fca5a5" : "#ffff", margin: 0 }}>
//               {cert.issuerAbbrev ? `${cert.issuerAbbrev} · ` : ""}Verified Academic Credential
//             </p>
//           </div>

//           {/* Ornament divider */}
//           <div style={{ textAlign: "center", padding: "10px 0 4px", color: gold, fontSize: 16, letterSpacing: 10 }}>— ✦ —</div>

//           {/* Body */}
//           <div style={{ padding: "8px 60px 32px", textAlign: "center" }}>

//             {isRevoked && (
//               <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 16px", marginBottom: 16, fontSize: 12, color: "#dc2626", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
//                 ✕ This certificate has been revoked
//               </div>
//             )}

//             <p style={{ fontStyle: "italic", fontSize: 14, color: inkMid, letterSpacing: 1, marginBottom: 6 }}>
//               This is to certify that
//             </p>

//             <div style={{ fontSize: 36, fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontStyle: "italic", fontWeight: 400, color: navy, lineHeight: 1.1, margin: "4px 0 16px", paddingBottom: 16, borderBottom: `1.5px solid ${gold}` }}>
//               {meta?.name || cert.recipient.slice(0, 8) + "…" + cert.recipient.slice(-6)}
//             </div>

//             <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: inkLight, marginBottom: 8 }}>
//               Has been awarded the degree of
//             </p>

//             <div style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontSize: 22, fontWeight: 700, color: navy, marginBottom: 4 }}>
//               {meta?.degree || "—"}
//             </div>

//             <div style={{ fontSize: 15, fontStyle: "italic", color: inkMid, marginBottom: 20 }}>
//               {meta?.major ? `in ${meta.major}` : ""}
//             </div>

//             <p style={{ fontSize: 13, color: inkMid, lineHeight: 1.75, maxWidth: 400, margin: "0 auto 24px" }}>
//               Having fulfilled all requirements prescribed by the Faculty and having been recommended
//               by the Academic Council, is hereby granted all rights, privileges, and responsibilities
//               pertaining thereto.
//             </p>

//             {/* Meta row */}
//             <div style={{ display: "flex", justifyContent: "center", gap: 40, borderTop: `0.5px solid ${goldLight}`, borderBottom: `0.5px solid ${goldLight}`, padding: "14px 0", marginBottom: 24 }}>
//               {[
//                 { label: "Graduated", value: meta?.graduationYear || "—" },
//                 { label: "Grade", value: meta?.grade || "—" },
//                 { label: "Date Issued", value: issueDate },
//               ].map(({ label, value }) => (
//                 <div key={label} style={{ textAlign: "center" }}>
//                   <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: inkFaint, marginBottom: 3 }}>{label}</div>
//                   <div style={{ fontSize: 14, fontWeight: 500, color: inkDark }}>{value}</div>
//                 </div>
//               ))}
//             </div>

//             {/* Signatures + seal */}
//             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 8px", gap: 16 }}>
//               <SigBlock name="Registrar" title="Academic Registrar" />

//               {/* Seal */}
//               <div style={{ width: 88, height: 88, borderRadius: "50%", border: `2px solid ${gold}`, background: parchment, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
//                 <div style={{ position: "absolute", inset: 4, borderRadius: "50%", border: `1px solid ${gold}` }} />
//                 <div style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontSize: 20, fontWeight: 700, color: navy, lineHeight: 1 }}>
//                   {cert.issuerAbbrev || "CC"}
//                 </div>
//                 <div style={{ fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase", color: inkLight, marginTop: 2 }}>
//                   Official Seal
//                 </div>
//               </div>

//               <SigBlock name="Chancellor" title="Head of Institution" />
//             </div>
//           </div>

//           {/* Footer band */}
//           <div style={{ background: isRevoked ? "#7f1d1d" : accent, padding: "10px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
//             <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, letterSpacing: 1.5, color: "#ffff" }}>
//               {cert.displayId} · ERC-5192 · ETHEREUM
//             </span>
//             <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: isRevoked ? "#fca5a5" : "#5dca90" }}>
//               <div style={{ width: 6, height: 6, borderRadius: "50%", background: isRevoked ? "#ef4444" : "#5dca90" }} />
//               {isRevoked ? "Revoked" : "Verified on-chain"}
//             </div>
//             <span style={{ fontSize: 9, letterSpacing: 1, color: "#4a5e88" }}>CertChain</span>
//           </div>

//           {/* Action buttons */}
//           <div style={{ display: "flex", gap: 8, padding: "14px 20px", background: "#f5f0e4", borderTop: `1px solid ${gold}` }}>
//             <button onClick={copyLink}
//               style={{ flex: 1, padding: "9px 12px", border: `1px solid ${gold}`, background: parchment, borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 12, color: inkMid, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
//               {copied ? <Check style={{ width: 14, height: 14, color: "#16a34a" }} /> : <Copy style={{ width: 14, height: 14 }} />}
//               {copied ? "Copied!" : "Copy link"}
//             </button>
//             <button onClick={() => setShowQR(v => !v)}
//               style={{ flex: 1, padding: "9px 12px", border: `1px solid ${gold}`, background: parchment, borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 12, color: inkMid, cursor: "pointer" }}>
//               {showQR ? "Hide QR" : "Show QR"}
//             </button>
//             {ipfsUrl && (
//               <a href={ipfsUrl} target="_blank" rel="noopener noreferrer"
//                 style={{ flex: 1, padding: "9px 12px", border: `1px solid ${accent}`, background: accent, borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 12, color: "#e8d87a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}>
//                 <ExternalLink style={{ width: 13, height: 13 }} />
//                 View on IPFS
//               </a>
//             )}
//           </div>
//         </div>

//         {/* QR panel */}
//         {showQR && (
//           <div style={{ background: parchment, border: `1px solid ${gold}`, padding: "18px 24px", marginTop: 12, display: "flex", alignItems: "center", gap: 20 }}>
//             <div style={{ border: `1px solid ${gold}`, borderRadius: 6, padding: 10, background: "#fff", flexShrink: 0 }}>
//               <QRCodeSVG value={verifyUrl} size={88} fgColor={navy} />
//             </div>
//             <div>
//               <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: inkFaint, marginBottom: 5 }}>
//                 Verification QR Code
//               </div>
//               <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: inkMid, wordBreak: "break-all", marginBottom: 5 }}>
//                 {verifyUrl}
//               </div>
//               <div style={{ fontSize: 11, fontStyle: "italic", color: inkFaint }}>
//                 Scan to verify this credential on the Ethereum blockchain
//               </div>
//             </div>
//           </div>
//         )}

//       </div>
//     </div>
//   );
// }

// function SigBlock({ name, title }: { name: string; title: string }) {
//   return (
//     <div style={{ textAlign: "center", flex: 1 }}>
//       <div style={{ width: 120, borderBottom: "1px solid #4a3c1a", margin: "0 auto 4px", height: 32, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2 }}>
//         <span style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#0e2a5c" }}>{name}</span>
//       </div>
//       <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a7040", marginTop: 2 }}>{title}</div>
//     </div>
//   );
// }


import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { XCircle, ArrowLeft, Loader2, Copy, Check, ExternalLink, Download } from "lucide-react";
import { useFetchCertificate } from "@/hooks/useContract";
import { resolveIPFS } from "@/lib/ipfs";
import { useState } from "react";

export default function CertificatePage() {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();
  const fetchCert = useFetchCertificate();
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [downloading, setDownloading] = useState(false);
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

  const downloadCertificate = async () => {
    if (!cert?.metadata?.image) return;
    setDownloading(true);
    try {
      const imageUrl = resolveIPFS(cert.metadata.image);
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${cert.displayId}_certificate.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Download failed. Try opening the IPFS link directly.");
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "24rem", gap: "12px", color: "#94a3b8" }}>
      <Loader2 style={{ width: 20, height: 20, color: "#0ea5e9", animation: "spin 1s linear infinite" }} />
      <span style={{ fontSize: 14 }}>Loading certificate…</span>
    </div>
  );

  if (error || !cert || !cert.exists) return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "80px 16px", textAlign: "center" }}>
      <XCircle style={{ width: 48, height: 48, color: "#f87171", margin: "0 auto 16px" }} />
      <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>Certificate not found</h1>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>Token #{tokenId} does not exist on this contract.</p>
      <button onClick={() => navigate("/verify")}
        style={{ padding: "10px 20px", borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", color: "#475569", fontSize: 14, cursor: "pointer" }}>
        Back to verifier
      </button>
    </div>
  );

  const meta = cert.metadata;
  const ipfsUrl = cert.metadataURI ? resolveIPFS(cert.metadataURI) : null;
  const theme = cert.issuerThemeColor || "#0e2a5c";
  const isRevoked = cert.revoked;

  const gold = "#c9b97a";
  const goldLight = "#d4c47e";
  const navy = theme;
  const parchment = "#fefcf7";
  const parchmentBg = "#f0ece4";
  const inkDark = "#1a1610";
  const inkMid = "#5a4820";
  const inkLight = "#8a7040";
  const inkFaint = "#a08a4a";

  const issueDate = meta?.issuedAt
    ? new Date(meta.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : cert.issuedAt > 0n
      ? new Date(Number(cert.issuedAt) * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "—";

  return (
    <div style={{ background: parchmentBg, minHeight: "100vh", padding: "32px 16px", fontFamily: "Georgia, 'Times New Roman', serif" }}>
      <div style={{ maxWidth: 660, margin: "0 auto" }}>

        {/* Back button */}
        <button onClick={() => navigate(-1)}
          style={{ display: "flex", alignItems: "center", gap: 6, color: inkFaint, background: "none", border: "none", fontSize: 13, cursor: "pointer", marginBottom: 20, fontFamily: "inherit" }}>
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Back
        </button>

        {/* ── Main certificate parchment ── */}
        <div style={{ background: parchment, border: `1px solid ${gold}`, position: "relative", overflow: "hidden" }}>

          {/* Double-rule border inset */}
          <div style={{ position: "absolute", inset: 10, border: `1px solid ${gold}`, pointerEvents: "none", zIndex: 1 }} />
          <div style={{ position: "absolute", inset: 14, border: `0.5px solid ${goldLight}`, pointerEvents: "none", zIndex: 1 }} />

          {/* Corner ornaments */}
          {[
            { top: 8, left: 8, transform: "none" },
            { top: 8, right: 8, transform: "scaleX(-1)" },
            { bottom: 8, left: 8, transform: "scaleY(-1)" },
            { bottom: 8, right: 8, transform: "scale(-1,-1)" },
          ].map((pos, i) => (
            <div key={i} style={{ position: "absolute", width: 28, height: 28, zIndex: 2, ...pos }}>
              <svg viewBox="0 0 28 28" width="28" height="28" style={{ transform: pos.transform as string }}>
                <path d="M2 26 L2 4 Q2 2 4 2 L26 2" stroke={gold} strokeWidth="1.5" fill="none" />
                <circle cx="4" cy="4" r="2" fill={gold} />
              </svg>
            </div>
          ))}

          {/* Header band */}
          <div style={{ background: isRevoked ? "#7f1d1d" : navy, padding: "20px 56px 16px", textAlign: "center", position: "relative" }}>
            <p style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontSize: 15, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", color: isRevoked ? "#fca5a5" : "#e8d87a", margin: "0 0 3px" }}>
              {cert.issuerName || "CertChain"}
            </p>
            <p style={{ fontSize: 10, letterSpacing: 2.5, textTransform: "uppercase", color: isRevoked ? "#fca5a5" : "#7a8fb8", margin: 0 }}>
              {cert.issuerAbbrev ? `${cert.issuerAbbrev} · ` : ""}Verified Academic Credential
            </p>
          </div>

          {/* Ornament divider */}
          <div style={{ textAlign: "center", padding: "10px 0 4px", color: gold, fontSize: 16, letterSpacing: 10 }}>— ✦ —</div>

          {/* Body */}
          <div style={{ padding: "8px 60px 32px", textAlign: "center" }}>

            {isRevoked && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: "8px 16px", marginBottom: 16, fontSize: 12, color: "#dc2626", letterSpacing: 1, textTransform: "uppercase", fontWeight: 700 }}>
                ✕ This certificate has been revoked
              </div>
            )}

            <p style={{ fontStyle: "italic", fontSize: 14, color: inkMid, letterSpacing: 1, marginBottom: 6 }}>
              This is to certify that
            </p>

            <div style={{ fontSize: 36, fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontStyle: "italic", fontWeight: 400, color: navy, lineHeight: 1.1, margin: "4px 0 16px", paddingBottom: 16, borderBottom: `1.5px solid ${gold}` }}>
              {meta?.name || cert.recipient.slice(0, 8) + "…" + cert.recipient.slice(-6)}
            </div>

            <p style={{ fontSize: 11, letterSpacing: 2.5, textTransform: "uppercase", color: inkLight, marginBottom: 8 }}>
              Has been awarded the degree of
            </p>

            <div style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontSize: 22, fontWeight: 700, color: navy, marginBottom: 4 }}>
              {meta?.degree || "—"}
            </div>

            <div style={{ fontSize: 15, fontStyle: "italic", color: inkMid, marginBottom: 20 }}>
              {meta?.major ? `in ${meta.major}` : ""}
            </div>

            <p style={{ fontSize: 13, color: inkMid, lineHeight: 1.75, maxWidth: 400, margin: "0 auto 24px" }}>
              Having fulfilled all requirements prescribed by the Faculty and having been recommended
              by the Academic Council, is hereby granted all rights, privileges, and responsibilities
              pertaining thereto.
            </p>

            {/* Meta row */}
            <div style={{ display: "flex", justifyContent: "center", gap: 40, borderTop: `0.5px solid ${goldLight}`, borderBottom: `0.5px solid ${goldLight}`, padding: "14px 0", marginBottom: 24 }}>
              {[
                { label: "Graduated", value: meta?.graduationYear || "—" },
                { label: "Grade", value: meta?.grade || "—" },
                { label: "Date Issued", value: issueDate },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: inkFaint, marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: inkDark }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Signatures + seal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 8px", gap: 16 }}>
              <SigBlock name="Registrar" title="Academic Registrar" />

              {/* Seal */}
              <div style={{ width: 88, height: 88, borderRadius: "50%", border: `2px solid ${gold}`, background: parchment, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative" }}>
                <div style={{ position: "absolute", inset: 4, borderRadius: "50%", border: `1px solid ${gold}` }} />
                <div style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontSize: 20, fontWeight: 700, color: navy, lineHeight: 1 }}>
                  {cert.issuerAbbrev || "CC"}
                </div>
                <div style={{ fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase", color: inkLight, marginTop: 2 }}>
                  Official Seal
                </div>
              </div>

              <SigBlock name="Chancellor" title="Head of Institution" />
            </div>
          </div>

          {/* Footer band */}
          <div style={{ background: isRevoked ? "#7f1d1d" : navy, padding: "10px 48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: "'Courier New', monospace", fontSize: 9, letterSpacing: 1.5, color: "#7a8fb8" }}>
              {cert.displayId} · ERC-5192 · ETHEREUM
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: isRevoked ? "#fca5a5" : "#5dca90" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: isRevoked ? "#ef4444" : "#5dca90" }} />
              {isRevoked ? "Revoked" : "Verified on-chain"}
            </div>
            <span style={{ fontSize: 9, letterSpacing: 1, color: "#4a5e88" }}>CertChain</span>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8, padding: "14px 20px", background: "#f5f0e4", borderTop: `1px solid ${gold}` }}>
            <button onClick={copyLink}
              style={{ flex: 1, padding: "9px 12px", border: `1px solid ${gold}`, background: parchment, borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 12, color: inkMid, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              {copied ? <Check style={{ width: 14, height: 14, color: "#16a34a" }} /> : <Copy style={{ width: 14, height: 14 }} />}
              {copied ? "Copied!" : "Copy link"}
            </button>
            <button onClick={() => setShowQR(v => !v)}
              style={{ flex: 1, padding: "9px 12px", border: `1px solid ${gold}`, background: parchment, borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 12, color: inkMid, cursor: "pointer" }}>
              {showQR ? "Hide QR" : "Show QR"}
            </button>
            {cert.metadata?.image && (
              <button onClick={downloadCertificate} disabled={downloading}
                style={{ flex: 1, padding: "9px 12px", border: `1px solid ${gold}`, background: parchment, borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 12, color: inkMid, cursor: downloading ? "not-allowed" : "pointer", opacity: downloading ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                {downloading
                  ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                  : <Download style={{ width: 13, height: 13 }} />}
                {downloading ? "Downloading…" : "Download"}
              </button>
            )}
            {ipfsUrl && (
              <a href={ipfsUrl} target="_blank" rel="noopener noreferrer"
                style={{ flex: 1, padding: "9px 12px", border: `1px solid ${navy}`, background: navy, borderRadius: 6, fontFamily: "Georgia, serif", fontSize: 12, color: "#e8d87a", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, textDecoration: "none" }}>
                <ExternalLink style={{ width: 13, height: 13 }} />
                IPFS
              </a>
            )}
          </div>
        </div>

        {/* QR panel */}
        {showQR && (
          <div style={{ background: parchment, border: `1px solid ${gold}`, padding: "18px 24px", marginTop: 12, display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ border: `1px solid ${gold}`, borderRadius: 6, padding: 10, background: "#fff", flexShrink: 0 }}>
              <QRCodeSVG value={verifyUrl} size={88} fgColor={navy} />
            </div>
            <div>
              <div style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: inkFaint, marginBottom: 5 }}>
                Verification QR Code
              </div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: 10, color: inkMid, wordBreak: "break-all", marginBottom: 5 }}>
                {verifyUrl}
              </div>
              <div style={{ fontSize: 11, fontStyle: "italic", color: inkFaint }}>
                Scan to verify this credential on the Ethereum blockchain
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function SigBlock({ name, title }: { name: string; title: string }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ width: 120, borderBottom: "1px solid #4a3c1a", margin: "0 auto 4px", height: 32, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2 }}>
        <span style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#0e2a5c" }}>{name}</span>
      </div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a7040", marginTop: 2 }}>{title}</div>
    </div>
  );
}
