"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

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
          background: "rgba(200,60,60,0.08)",
          border: "1px solid rgba(200,60,60,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertTriangle size={24} style={{ color: "var(--danger)" }} />
      </div>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
          Oups, un pépin
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6, maxWidth: 320 }}>
          L&apos;application a rencontré une erreur inattendue. Tu peux réessayer ou revenir à l&apos;accueil.
        </p>
      </div>
      {error.digest && (
        <code
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            background: "var(--secondary-bg)",
            padding: "4px 10px",
            borderRadius: 6,
          }}
        >
          ref: {error.digest}
        </code>
      )}
      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <button
          onClick={reset}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 16px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            color: "#fff",
            background: "var(--gradient-primary)",
            border: "none",
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          <RotateCcw size={14} />
          Réessayer
        </button>
        <Link
          href="/accueil"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 16px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            color: "var(--text-secondary)",
            background: "var(--secondary-bg)",
            textDecoration: "none",
            minHeight: 44,
          }}
        >
          Accueil
        </Link>
      </div>
    </div>
  );
}
