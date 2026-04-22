import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 20px",
        textAlign: "center",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 18,
          background: "rgba(196,120,90,0.08)",
          border: "1px solid rgba(196,120,90,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Compass size={24} style={{ color: "var(--terra-medium)" }} />
      </div>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Page introuvable
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6, maxWidth: 320 }}>
          Le lien a peut-être changé. Reviens à l&apos;accueil pour retrouver ton chemin.
        </p>
      </div>
      <Link
        href="/accueil"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 500,
          color: "#fff",
          background: "var(--gradient-primary)",
          textDecoration: "none",
          minHeight: 44,
          marginTop: 4,
        }}
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
