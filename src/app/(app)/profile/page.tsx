"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Schedule } from "@/lib/types";
import { User, Lock, Calendar, Eye, EyeOff } from "lucide-react";

export default function ProfilePage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const supabase = useRef(createClient()).current;

  const [monthSchedules, setMonthSchedules] = useState<Schedule[]>([]);
  const [loadingSched, setLoadingSched] = useState(true);

  // Password change
  const [showPwd, setShowPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);
  const [showPwdForm, setShowPwdForm] = useState(false);

  const fetchSchedules = useCallback(async () => {
    if (!user) return;
    const now = new Date();
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const end = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, "0")}-01`;
    const { data } = await supabase
      .from("schedules")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", start)
      .lt("date", end)
      .order("date");
    setMonthSchedules((data as Schedule[]) || []);
    setLoadingSched(false);
  }, [user, supabase]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  async function changePassword() {
    if (!newPwd || newPwd.length < 6) { toast.error("Mot de passe min. 6 caractères"); return; }
    if (newPwd !== confirmPwd) { toast.error("Les mots de passe ne correspondent pas"); return; }
    if (!user || changingPwd) return;
    setChangingPwd(true);

    // Re-authenticate with current password
    if (currentPwd) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email!, password: currentPwd,
      });
      if (signInErr) { setChangingPwd(false); toast.error("Mot de passe actuel incorrect"); return; }
    }

    const { error } = await supabase.auth.updateUser({ password: newPwd });
    setChangingPwd(false);
    if (error) { toast.error("Erreur, réessaie"); return; }

    await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
    toast.success("Mot de passe mis à jour");
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); setShowPwdForm(false);
  }

  // Compute total hours this month
  const totalHours = monthSchedules.reduce((sum, s) => {
    const [sh, sm] = s.start_time.split(":").map(Number);
    const [eh, em] = s.end_time.split(":").map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60;
    return sum + diff / 60;
  }, 0);

  const roleLabel = { patron: "Patron", responsable: "Responsable", staff: "Staff" }[profile?.role || "staff"];

  return (
    <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
      <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 20 }}>
        Mon profil
      </h1>

      {/* Profile card */}
      <div className="card-medium" style={{ padding: 20, marginBottom: 20, textAlign: "center" }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: "var(--gradient-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 12px",
          fontSize: 28, fontWeight: 700, color: "#fff",
        }}>
          {profile?.name?.[0] || "?"}
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)" }}>{profile?.name}</div>
        <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{profile?.email}</div>
        <div style={{
          display: "inline-block", marginTop: 8,
          fontSize: 11, fontWeight: 600, color: "#A85D3F",
          background: "rgba(196,120,90,0.08)",
          padding: "3px 10px", borderRadius: 8,
        }}>{roleLabel}</div>
      </div>

      {/* This month hours */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Calendar size={12} style={{ color: "var(--terra-medium)" }} />
          <span className="section-label">Ce mois-ci</span>
        </div>
        <div className="card-light" style={{ padding: 16, display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
              {loadingSched ? "—" : totalHours.toFixed(0)}<span style={{ fontSize: 14, color: "var(--text-tertiary)" }}>h</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
              Heures prévues
            </div>
          </div>
          <div style={{ width: 1, height: 32, background: "var(--border-color)" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
              {loadingSched ? "—" : monthSchedules.length}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
              Shifts
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Lock size={12} style={{ color: "var(--terra-medium)" }} />
          <span className="section-label">Sécurité</span>
        </div>
        {!showPwdForm ? (
          <button
            onClick={() => setShowPwdForm(true)}
            className="card-light"
            style={{
              width: "100%", textAlign: "left", border: "none", cursor: "pointer",
              padding: "14px 16px", display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <Lock size={16} style={{ color: "var(--text-secondary)" }} />
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
              Changer mon mot de passe
            </span>
          </button>
        ) : (
          <div className="card-light" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ position: "relative" }}>
              <input
                type={showPwd ? "text" : "password"}
                placeholder="Mot de passe actuel"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                style={{
                  width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
                  background: "var(--input-bg)", padding: "10px 36px 10px 12px", fontSize: 14,
                  color: "var(--text-primary)", outline: "none",
                }}
              />
              <button
                onClick={() => setShowPwd(!showPwd)}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}
              >
                {showPwd ? <EyeOff size={16} style={{ color: "var(--text-tertiary)" }} /> : <Eye size={16} style={{ color: "var(--text-tertiary)" }} />}
              </button>
            </div>
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Nouveau mot de passe (min. 6 car.)"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              style={{
                width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
                background: "var(--input-bg)", padding: "10px 12px", fontSize: 14,
                color: "var(--text-primary)", outline: "none",
              }}
            />
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Confirmer le nouveau mot de passe"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              style={{
                width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
                background: "var(--input-bg)", padding: "10px 12px", fontSize: 14,
                color: "var(--text-primary)", outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button
                onClick={() => { setShowPwdForm(false); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }}
                style={{
                  flex: 1, borderRadius: 10, padding: "10px 0", border: "none", cursor: "pointer",
                  background: "var(--secondary-bg)", color: "var(--text-secondary)",
                  fontSize: 14, fontWeight: 500,
                }}
              >Annuler</button>
              <button
                onClick={changePassword}
                disabled={changingPwd || !newPwd || !confirmPwd}
                style={{
                  flex: 1, borderRadius: 10, padding: "10px 0", border: "none", cursor: "pointer",
                  background: "var(--gradient-primary)", color: "#fff",
                  fontSize: 14, fontWeight: 600,
                  opacity: changingPwd || !newPwd || !confirmPwd ? 0.5 : 1,
                }}
              >{changingPwd ? "..." : "Enregistrer"}</button>
            </div>
          </div>
        )}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
