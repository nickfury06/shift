"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // Small delay to let session cookie settle, then hard redirect
      await new Promise((r) => setTimeout(r, 300));
      window.location.href = "/";
    } catch (err: unknown) {
      setError(String(err));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center" style={{ padding: "0 24px" }}>
      <div style={{ width: "100%", maxWidth: 384, display: "flex", flexDirection: "column", gap: 32 }}>
        {/* Logo */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em" }}>
            <span className="text-gradient">Shift</span>
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 8 }}>
            Operations
          </p>
        </div>

        {/* Form */}
        <div className="card-medium" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                htmlFor="email"
                style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "12px 16px", fontSize: 14, color: "var(--text-primary)", outline: "none" }}
                placeholder="prenom@lehive.fr"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                htmlFor="password"
                style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "12px 16px", fontSize: 14, color: "var(--text-primary)", outline: "none" }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-medium text-white disabled:opacity-50"
              style={{ background: "var(--gradient-primary)" }}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
