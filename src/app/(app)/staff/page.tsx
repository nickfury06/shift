"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role } from "@/lib/types";
import { Plus, Trash2, KeyRound, UserPlus } from "lucide-react";

export default function StaffPage() {
  const { profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const fetchStaff = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("role")
      .order("name");
    setStaff((data as Profile[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  // Guard: patron only
  if (profile && profile.role !== "patron") {
    return (
      <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div className="card-medium" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Acces reserve au patron</p>
        </div>
      </div>
    );
  }

  function generateEmail(first: string, last: string): string {
    const clean = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, "");
    return `${clean(first)}.${clean(last)}@lehive.staff`;
  }

  async function handleCreate() {
    if (!firstName.trim() || !lastName.trim()) return;
    setCreating(true);
    setError("");

    const email = generateEmail(firstName, lastName);
    const password = `shift-${firstName.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: `${firstName.trim()} ${lastName.trim()}`,

            role,
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setCreating(false);
        return;
      }

      if (authData.user) {
        await supabase.from("profiles").upsert({
          id: authData.user.id,
          email,
          name: `${firstName.trim()} ${lastName.trim()}`,

          role,
          onboarding_completed: false,
        });
      }

      // Show credentials
      alert(`Compte cree!\n\nEmail: ${email}\nMot de passe: ${password}`);

      setFirstName("");
      setLastName("");
      setRole("staff");
      setShowForm(false);
      fetchStaff();
    } catch {
      setError("Erreur lors de la creation");
    }

    setCreating(false);
  }

  async function handleDelete(userId: string) {
    if (!confirm("Supprimer ce membre ?")) return;
    await supabase.from("profiles").delete().eq("id", userId);
    fetchStaff();
  }

  async function handleResetPassword(userEmail: string) {
    const newPassword = `shift-reset-${Math.random().toString(36).slice(2, 8)}`;
    alert(`Nouveau mot de passe pour ${userEmail}:\n${newPassword}\n\n(Implementation via edge function requise)`);
  }

  const roleLabel: Record<Role, string> = {
    patron: "Patron",
    responsable: "Responsable",
    staff: "Staff",
  };

  if (loading) {
    return (
      <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-light" style={{ height: 40, width: "50%", borderRadius: 8, opacity: 0.5 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-light" style={{ height: 64, borderRadius: 8, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Equipe</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white"
            style={{ background: "var(--gradient-primary)" }}
          >
            <UserPlus size={16} />
            Ajouter
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="card-medium" style={{ padding: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p className="section-label">Nouveau membre</p>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <input
                type="text"
                placeholder="Prenom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl bg-input px-3 py-2 text-sm outline-none"
              />

              <input
                type="text"
                placeholder="Nom"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl bg-input px-3 py-2 text-sm outline-none"
              />

              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="w-full rounded-xl bg-input px-3 py-2 text-sm"
              >
                <option value="staff">Staff</option>
                <option value="responsable">Responsable</option>
              </select>

              {firstName && lastName && (
                <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  Email auto: {generateEmail(firstName, lastName)}
                </p>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleCreate}
                  disabled={creating || !firstName.trim() || !lastName.trim()}
                  className="flex-1 rounded-xl px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {creating ? "Creation..." : "Creer le compte"}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-xl px-3 py-2 text-sm font-medium"
                  style={{ background: "var(--secondary-bg)", color: "var(--text-secondary)" }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Staff list */}
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {staff.map((member) => (
            <div key={member.id} className="card-light" style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                  {member.name}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span className="pill">{roleLabel[member.role]}</span>
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{member.email}</span>
                </div>
              </div>
              {member.role !== "patron" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                  <button
                    onClick={() => handleResetPassword(member.email)}
                    className="flex items-center justify-center rounded-lg hover:bg-secondary"
                    style={{ width: 32, height: 32 }}
                    aria-label="Reset mot de passe"
                  >
                    <KeyRound size={14} style={{ color: "var(--text-tertiary)" }} />
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="flex items-center justify-center rounded-lg hover:bg-secondary"
                    style={{ width: 32, height: 32 }}
                    aria-label="Supprimer"
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {staff.length === 0 && (
            <div className="card-light" style={{ padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Aucun membre</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
