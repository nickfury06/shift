"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError("Email ou mot de passe incorrect");
      setLoading(false);
      return;
    }

    // Get profile to check role and must_change_password
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Erreur de connexion");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, must_change_password")
      .eq("id", user.id)
      .single();

    if (profile?.must_change_password) {
      router.push("/change-password");
      return;
    }

    if (profile?.role === "patron") {
      router.push("/dashboard");
    } else {
      router.push("/ce-soir");
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Le Hive branding */}
        <div className="text-center mb-10">
          <h1 className="text-4xl mb-1" style={{ fontFamily: "var(--font-dm-serif)" }}>
            Le Hive
          </h1>
          <p className="text-sm text-muted-foreground">Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="h-12"
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-12"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 text-base font-medium"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
