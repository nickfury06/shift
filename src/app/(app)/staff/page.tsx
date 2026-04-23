"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Role, EmploymentType } from "@/lib/types";
import { Trash2, KeyRound, UserPlus, Copy, X, Check, Power } from "lucide-react";

export default function StaffPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const supabase = useRef(createClient()).current;

  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"permanent" | "extra">("permanent");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("permanent");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Credentials modal
  const [credentials, setCredentials] = useState<{ email: string; password: string; name: string } | null>(null);
  const [copied, setCopied] = useState<"email" | "password" | "all" | null>(null);

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
      <div style={{ paddingTop: 0, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
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
          employment_type: employmentType,
          onboarding_completed: false,
        });
      }

      // Show credentials in modal
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      setCredentials({ email, password, name: fullName });

      setFirstName("");
      setLastName("");
      setRole("staff");
      setEmploymentType("permanent");
      setShowForm(false);
      fetchStaff();
    } catch {
      setError("Erreur lors de la creation");
    }

    setCreating(false);
  }

  async function handleDelete(userId: string) {
    const member = staff.find((s) => s.id === userId);
    const ok = await confirm({
      title: "Supprimer ce membre ?",
      message: member?.name ? `${member.name} sera définitivement supprimé. Cette action est irréversible.` : undefined,
      variant: "danger",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    const { error } = await supabase.from("profiles").delete().eq("id", userId);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success("Membre supprimé");
    fetchStaff();
  }

  async function toggleActive(userId: string, currentActive: boolean) {
    const { error } = await supabase.from("profiles").update({ active: !currentActive }).eq("id", userId);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success(currentActive ? "Désactivé" : "Réactivé");
    fetchStaff();
  }

  async function copyText(text: string, key: "email" | "password" | "all") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  }

  async function handleResetPassword(userEmail: string) {
    const newPassword = `shift-reset-${Math.random().toString(36).slice(2, 8)}`;
    // Show in credentials modal instead of alert
    const member = staff.find((s) => s.email === userEmail);
    setCredentials({ email: userEmail, password: newPassword, name: member?.name || userEmail });
    toast.info("Reset mot de passe — communique-le au staff");
  }

  const roleLabel: Record<Role, string> = {
    patron: "Patron",
    responsable: "Responsable",
    staff: "Staff",
  };

  if (loading) {
    return (
      <div style={{ paddingTop: 0, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-light pulse" style={{ height: 40, width: "50%", borderRadius: 8, opacity: 0.5 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-light pulse" style={{ height: 64, borderRadius: 8, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 0, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
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

              {/* Employment type */}
              <div style={{ display: "flex", gap: 6 }}>
                {(["permanent", "extra"] as EmploymentType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setEmploymentType(t)}
                    style={{
                      flex: 1, borderRadius: 10, padding: "10px 0", border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: 500,
                      background: employmentType === t ? "var(--gradient-primary)" : "var(--secondary-bg)",
                      color: employmentType === t ? "#fff" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >
                    {t === "permanent" ? "Permanent" : "Extra"}
                  </button>
                ))}
              </div>

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

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, background: "var(--secondary-bg)", borderRadius: 12, padding: 3 }}>
          {(["permanent", "extra"] as const).map((t) => {
            const count = staff.filter((s) => (s.employment_type || "permanent") === t && s.role !== "patron").length;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  borderRadius: 9, padding: "9px 0", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500,
                  background: tab === t ? "var(--card-bg)" : "transparent",
                  color: tab === t ? "var(--text-primary)" : "var(--text-tertiary)",
                  boxShadow: tab === t ? "var(--shadow-light)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {t === "permanent" ? "Permanents" : "Extras"}
                <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Staff list */}
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {staff
            .filter((m) => m.role === "patron" || (m.employment_type || "permanent") === tab)
            .map((member) => (
            <div key={member.id} className="card-light" style={{
              padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between",
              opacity: member.active === false ? 0.45 : 1,
            }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                    {member.name}
                  </p>
                  {member.active === false && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", background: "var(--secondary-bg)", padding: "1px 6px", borderRadius: 4 }}>INACTIF</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
                  <span className="pill">{roleLabel[member.role]}</span>
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{member.email}</span>
                </div>
              </div>
              {member.role !== "patron" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                  <button
                    onClick={() => toggleActive(member.id, member.active !== false)}
                    className="flex items-center justify-center rounded-lg hover:bg-secondary"
                    style={{ width: 32, height: 32 }}
                    aria-label={member.active === false ? "Réactiver" : "Désactiver"}
                    title={member.active === false ? "Réactiver" : "Désactiver"}
                  >
                    <Power size={14} style={{ color: member.active === false ? "var(--text-tertiary)" : "#8B5A40" }} />
                  </button>
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

      {/* ═══ CREDENTIALS MODAL ═══════════════════════════ */}
      {credentials && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div
            onClick={() => setCredentials(null)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          />
          <div className="card-medium" style={{
            position: "relative", width: "100%", maxWidth: 420, padding: 24, borderRadius: 20,
            animation: "scaleIn 0.2s ease-out",
          }}>
            <button
              onClick={() => setCredentials(null)}
              style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", padding: 4 }}
            >
              <X size={18} style={{ color: "var(--text-tertiary)" }} />
            </button>

            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12, margin: "0 auto 12px",
                background: "rgba(139,90,64,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Check size={24} style={{ color: "#8B5A40" }} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>
                Compte créé
              </h2>
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
                Partage ces identifiants avec {credentials.name}
              </p>
            </div>

            {/* Email */}
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Email</p>
              <button
                onClick={() => copyText(credentials.email, "email")}
                className="card-light"
                style={{
                  width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                  padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <span style={{ flex: 1, fontSize: 14, fontFamily: "monospace", color: "var(--text-primary)" }}>{credentials.email}</span>
                {copied === "email" ? <Check size={14} style={{ color: "#8B5A40" }} /> : <Copy size={14} style={{ color: "var(--text-tertiary)" }} />}
              </button>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Mot de passe</p>
              <button
                onClick={() => copyText(credentials.password, "password")}
                className="card-light"
                style={{
                  width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                  padding: "12px 14px", display: "flex", alignItems: "center", gap: 10,
                }}
              >
                <span style={{ flex: 1, fontSize: 14, fontFamily: "monospace", color: "var(--text-primary)" }}>{credentials.password}</span>
                {copied === "password" ? <Check size={14} style={{ color: "#8B5A40" }} /> : <Copy size={14} style={{ color: "var(--text-tertiary)" }} />}
              </button>
            </div>

            {/* Copy all */}
            <button
              onClick={() => copyText(`Bienvenue sur Shift !\n\nEmail: ${credentials.email}\nMot de passe: ${credentials.password}\n\nÀ la première connexion, tu devras changer ton mot de passe.`, "all")}
              style={{
                width: "100%", borderRadius: 14, padding: "12px 0", border: "none", cursor: "pointer",
                background: "var(--gradient-primary)", color: "#fff",
                fontSize: 14, fontWeight: 600,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {copied === "all" ? <Check size={16} /> : <Copy size={16} />}
              {copied === "all" ? "Copié !" : "Copier le message complet"}
            </button>

            <p style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 12 }}>
              À la 1ère connexion, le mot de passe devra être changé.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
