export function SigBlock({ name, title }: { name: string; title: string }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ width: 120, borderBottom: "1px solid #4a3c1a", margin: "0 auto 4px", height: 32, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 2 }}>
        <span style={{ fontFamily: "'Palatino Linotype', Palatino, Georgia, serif", fontStyle: "italic", fontSize: 13, color: "#0e2a5c" }}>{name}</span>
      </div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: "#8a7040", marginTop: 2 }}>{title}</div>
    </div>
  );
}