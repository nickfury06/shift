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
      <div className="p-4 pb-28 max-w-lg mx-auto">
        <div className="glass-card p-6 text-center">
          <p className="text-muted-foreground">Acces reserve au patron</p>
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
      // Create auth user via Supabase admin (edge function or service role)
      // For now we use the signUp endpoint
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
        // Upsert profile
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
    // This would typically go through an edge function with service role
    alert(`Nouveau mot de passe pour ${userEmail}:\n${newPassword}\n\n(Implementation via edge function requise)`);
  }

  const roleLabel: Record<Role, string> = {
    patron: "Patron",
    responsable: "Responsable",
    staff: "Staff",
  };

  if (loading) {
    return (
      <div className="p-4 pb-28 max-w-lg mx-auto space-y-4">
        <div className="bg-card rounded-lg animate-pulse h-10 w-1/2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-lg animate-pulse h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Equipe</h1>
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
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-base font-semibold tracking-tight">Nouveau membre</h3>

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
            <p className="text-xs text-muted-foreground">
              Email auto: {generateEmail(firstName, lastName)}
            </p>
          )}

          <div className="flex gap-2">
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
              className="rounded-xl px-3 py-2 text-sm font-medium bg-secondary text-muted-foreground"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="space-y-2 stagger-children">
        {staff.map((member) => (
          <div key={member.id} className="glass-card p-3 flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">
                {member.name}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="pill text-[10px]">{roleLabel[member.role]}</span>
                <span className="text-[10px] text-muted-foreground">{member.email}</span>
              </div>
            </div>
            {member.role !== "patron" && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={() => handleResetPassword(member.email)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary"
                  aria-label="Reset mot de passe"
                >
                  <KeyRound size={14} className="text-muted-foreground" />
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary"
                  aria-label="Supprimer"
                >
                  <Trash2 size={14} className="text-destructive" />
                </button>
              </div>
            )}
          </div>
        ))}

        {staff.length === 0 && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucun membre</p>
          </div>
        )}
      </div>
    </div>
  );
}
