import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import type { CertificateMetadata } from "@/types";

/**
 * Renders a certificate to a PNG Blob using html2canvas.
 *
 * We build a self-contained HTML element off-screen, append it to the DOM
 * briefly so html2canvas can measure it, capture it, then remove it.
 *
 * The design mirrors CertificatePage exactly — parchment background,
 * double-rule border, navy header/footer, italic serif body.
 */
export async function renderCertificateToBlob(
  metadata: CertificateMetadata,
  institutionName: string,
  institutionAbbrev: string,
  displayId: string,
  verifyUrl: string,
  themeColor: string,
  accentColor: string
): Promise<Blob> {
  // Dynamically import html2canvas — only loaded when issuing
  const html2canvas = (await import("html2canvas")).default;

  const gold = "#c9b97a";
  const goldLight = "#d4c47e";
  const theme = themeColor;
  const parchment = "#fefcf7";
  const inkDark = "#1a1610";
  const inkMid = "#5a4820";
  const inkLight = "#8a7040";
  const inkFaint = "#a08a4a";
  const accent = accentColor;
  const qrMarkup = renderToStaticMarkup(
    createElement(QRCodeSVG, {
      value: verifyUrl,
      size: 70,
      fgColor: theme,
      bgColor: "#ffffff",
      level: "M",
      marginSize: 0,
    })
  );

  const issueDate = metadata.issuedAt
    ? new Date(metadata.issuedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  // Build the certificate HTML as a fixed-size element (800×580px)
  const wrapper = document.createElement("div");
  wrapper.setAttribute("data-certificate-render-wrapper", "true");
  wrapper.style.cssText = `
    all: initial;
    display: block;
    position: fixed; top: -9999px; left: -9999px;
    width: 800px; height: 580px; overflow: hidden;
    font-family: 'Palatino Linotype', Palatino, Georgia, serif;
    color: ${inkDark};
  `;

  wrapper.innerHTML = `
    <div style="width:800px;height:580px;background:${parchment};border:2px solid ${gold};position:relative;box-sizing:border-box;">

      <!-- Double rule borders -->
      <div style="position:absolute;inset:10px;border:1px solid ${gold};pointer-events:none;"></div>
      <div style="position:absolute;inset:14px;border:0.5px solid ${goldLight};pointer-events:none;"></div>

      <!-- Corner ornaments -->
      <svg style="position:absolute;top:8px;left:8px;width:28px;height:28px;" viewBox="0 0 28 28" fill="none">
        <path d="M2 26 L2 4 Q2 2 4 2 L26 2" stroke="${gold}" stroke-width="1.5" fill="none"/>
        <circle cx="4" cy="4" r="2" fill="${gold}"/>
      </svg>
      <svg style="position:absolute;top:8px;right:8px;width:28px;height:28px;transform:scaleX(-1);" viewBox="0 0 28 28" fill="none">
        <path d="M2 26 L2 4 Q2 2 4 2 L26 2" stroke="${gold}" stroke-width="1.5" fill="none"/>
        <circle cx="4" cy="4" r="2" fill="${gold}"/>
      </svg>
      <svg style="position:absolute;bottom:8px;left:8px;width:28px;height:28px;transform:scaleY(-1);" viewBox="0 0 28 28" fill="none">
        <path d="M2 26 L2 4 Q2 2 4 2 L26 2" stroke="${gold}" stroke-width="1.5" fill="none"/>
        <circle cx="4" cy="4" r="2" fill="${gold}"/>
      </svg>
      <svg style="position:absolute;bottom:8px;right:8px;width:28px;height:28px;transform:scale(-1,-1);" viewBox="0 0 28 28" fill="none">
        <path d="M2 26 L2 4 Q2 2 4 2 L26 2" stroke="${gold}" stroke-width="1.5" fill="none"/>
        <circle cx="4" cy="4" r="2" fill="${gold}"/>
      </svg>

      <!-- Header band -->
      <div style="background:${theme};padding:16px 56px 14px;text-align:center;">
        <div style="font-size:15px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#e8d87a;margin:0 0 2px;">${institutionName}</div>
        <div style="font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#7a8fb8;">${institutionAbbrev} · Verified Academic Credential</div>
      </div>

      <!-- Ornament -->
      <div style="text-align:center;padding:8px 0 2px;color:${gold};font-size:16px;letter-spacing:10px;">— ✦ —</div>

      <!-- Body -->
      <div style="padding:4px 72px 20px;text-align:center;">
        <p style="font-style:italic;font-size:13px;color:${inkMid};letter-spacing:1px;margin:0 0 4px;">This is to certify that</p>
        <div style="font-size:34px;font-style:italic;font-weight:400;color:${accent};line-height:1.1;margin:2px 0 12px;padding-bottom:12px;border-bottom:1.5px solid ${gold};">
          ${metadata.name}
        </div>
        <p style="font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:${inkLight};margin:0 0 6px;">Has been awarded the degree of</p>
        <div style="font-size:20px;font-weight:700;color:${accent};margin:0 0 3px;">${metadata.degree}</div>
        <div style="font-size:14px;font-style:italic;color:${inkMid};margin:0 0 14px;">in ${metadata.major}</div>
        <p style="font-size:11px;color:${inkMid};line-height:1.7;max-width:500px;margin:0 auto 16px;">
          Having fulfilled all requirements prescribed by the Faculty and having been recommended
          by the Academic Council, is hereby granted all rights, privileges, and responsibilities pertaining thereto.
        </p>

        <!-- Meta row -->
        <div style="display:flex;justify-content:center;gap:48px;border-top:0.5px solid ${goldLight};border-bottom:0.5px solid ${goldLight};padding:10px 0;margin-bottom:16px;">
          <div style="text-align:center;">
            <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:${inkFaint};margin-bottom:2px;">Graduated</div>
            <div style="font-size:13px;font-weight:500;color:${inkDark};">${metadata.graduationYear}</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:${inkFaint};margin-bottom:2px;">Grade</div>
            <div style="font-size:13px;font-weight:500;color:${inkDark};">${metadata.grade}</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:8px;letter-spacing:2px;text-transform:uppercase;color:${inkFaint};margin-bottom:2px;">Date Issued</div>
            <div style="font-size:13px;font-weight:500;color:${inkDark};">${issueDate}</div>
          </div>
        </div>

        <!-- Signatures + seal -->
        <div style="display:flex;justify-content:space-between;align-items:flex-end;padding:0 20px;gap:16px;">
          <div style="text-align:center;flex:1;">
            <div style="width:120px;border-bottom:1px solid #4a3c1a;margin:0 auto 4px;height:32px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:5px;">
              <span style="font-style:italic;font-size:12px;color:${accent};">Registrar</span>
            </div>
            <div style="font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:${inkLight};">Academic Registrar</div>
          </div>

          <div style="width:76px;height:76px;border-radius:50%;border:2px solid ${gold};background:${parchment};display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;position:relative;">
            <div style="position:absolute;inset:4px;border-radius:50%;border:1px solid ${gold};"></div>
            <div style="font-size:18px;font-weight:700;color:${theme};line-height:1;">${institutionAbbrev}</div>
            <div style="font-size:6px;letter-spacing:1.5px;text-transform:uppercase;color:${inkLight};margin-top:1px;">Official Seal</div>
          </div>

          <div style="text-align:center;flex:1;">
            <div style="width:120px;border-bottom:1px solid #4a3c1a;margin:0 auto 4px;height:32px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:5px;">
              <span style="font-style:italic;font-size:12px;color:${accent};">Chancellor</span>
            </div>
            <div style="font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:${inkLight};">Head of Institution</div>
          </div>

          <div style="width:86px;flex-shrink:0;text-align:center;">
            <div style="border:1px solid ${gold};border-radius:8px;padding:6px;background:#ffffff;display:flex;align-items:center;justify-content:center;">
              ${qrMarkup}
            </div>
            <div style="font-size:7px;letter-spacing:1px;text-transform:uppercase;color:${inkFaint};margin-top:4px;">Scan to verify</div>
          </div>
        </div>
      </div>

      <!-- Footer band -->
      <div style="background:${theme};padding:9px 48px;display:flex;align-items:center;justify-content:space-between;position:absolute;bottom:0;left:0;right:0;">
        <span style="font-family:'Courier New',monospace;font-size:8px;letter-spacing:1.5px;color:#7a8fb8;">${displayId} · ERC-5192 · ETHEREUM</span>
        <div style="display:flex;align-items:center;gap:5px;font-size:8px;letter-spacing:1.5px;text-transform:uppercase;color:#5dca90;">
          <div style="width:5px;height:5px;border-radius:50%;background:#5dca90;"></div>
          Verified on-chain
        </div>
        <span style="font-size:8px;letter-spacing:1px;color:#4a5e88;">CertChain</span>
      </div>
    </div>
  `;

  document.body.appendChild(wrapper);

  try {
    const canvas = await html2canvas(wrapper.firstElementChild as HTMLElement, {
      scale: 2,           // 2× for retina quality
      useCORS: true,
      backgroundColor: parchment,
      width: 800,
      height: 580,
      logging: false,
      onclone: (clonedDoc) => {
        // Tailwind v4 emits oklch() colors, which html2canvas cannot parse yet.
        // The certificate is fully inline-styled, so we can safely remove app
        // styles from the cloned document and render in isolation.
        clonedDoc.querySelectorAll('style[data-vite-dev-id], link[rel="stylesheet"]').forEach((node) => {
          node.remove();
        });
        clonedDoc.documentElement.style.backgroundColor = parchment;
        clonedDoc.body.style.margin = "0";
        clonedDoc.body.style.backgroundColor = parchment;
      },
    });

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to convert canvas to blob"));
        },
        "image/png",
        1.0
      );
    });
  } finally {
    document.body.removeChild(wrapper);
  }
}
