"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { Heart, Clock, Info } from "lucide-react";

interface Setting { key: string; value: string; }

export default function SettingsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fnfFrequency, setFnfFrequency] = useState<"weekly" | "monthly" | "unlimited">("monthly");
  const [fnfMaxPerPeriod, setFnfMaxPerPeriod] = useState(1);
  const [shiftStartHour, setShiftStartHour] = useState(16);
  const [shiftEndHour, setShiftEndHour] = useState(1);

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("*");
    const map: Record<string, string> = {};
    ((data as Setting[]) || []).forEach((s) => { map[s.key] = s.value; });
    if (map.discount_frequency) setFnfFrequency(map.discount_frequency as "weekly" | "monthly" | "unlimited");
    if (map.discount_max_per_period) setFnfMaxPerPeriod(parseInt(map.discount_max_per_period));
    if (map.shift_start_hour) setShiftStartHour(parseInt(map.shift_start_hour));
    if (map.shift_end_hour) setShiftEndHour(parseInt(map.shift_end_hour));
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  async function updateSetting(key: string, value: string) {
    setSaving(true);
    const { error } = await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
    setSaving(false);
    if (error) toast.error("Erreur, réessaie");
    else toast.success("Enregistré");
  }

  if (profile && profile.role !== "patron") {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div className="card-medium" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Accès réservé au patron</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-light pulse" style={{ height: 56, borderRadius: 16, marginBottom: 10 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 20 }}>
        Réglages
      </h1>

      {/* F&F */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Heart size={12} style={{ color: "var(--terra-medium)" }} />
          <span className="section-label">Family & Friends</span>
        </div>
        <div className="card-light" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Frequency */}
          <div>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Fréquence</p>
            <div style={{ display: "flex", gap: 6 }}>
              {([
                { v: "weekly" as const, l: "Hebdo" },
                { v: "monthly" as const, l: "Mensuel" },
                { v: "unlimited" as const, l: "Illimité" },
              ]).map((o) => (
                <button
                  key={o.v}
                  onClick={() => { setFnfFrequency(o.v); updateSetting("discount_frequency", o.v); }}
                  disabled={saving}
                  style={{
                    flex: 1, borderRadius: 10, padding: "8px 0", border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 500,
                    background: fnfFrequency === o.v ? "var(--gradient-primary)" : "var(--secondary-bg)",
                    color: fnfFrequency === o.v ? "#fff" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                >{o.l}</button>
              ))}
            </div>
          </div>

          {/* Max per period */}
          {fnfFrequency !== "unlimited" && (
            <div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>Max par période</p>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setFnfMaxPerPeriod(n); updateSetting("discount_max_per_period", String(n)); }}
                    disabled={saving}
                    style={{
                      flex: 1, height: 40, borderRadius: 10, border: "none", cursor: "pointer",
                      fontSize: 15, fontWeight: 600,
                      background: fnfMaxPerPeriod === n ? "var(--gradient-primary)" : "var(--secondary-bg)",
                      color: fnfMaxPerPeriod === n ? "#fff" : "var(--text-secondary)",
                    }}
                  >{n}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Heures de service */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Clock size={12} style={{ color: "var(--terra-medium)" }} />
          <span className="section-label">Heures de service</span>
        </div>
        <div className="card-light" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", minWidth: 60 }}>Ouverture</span>
            <input
              type="number" min={0} max={23}
              value={shiftStartHour}
              onChange={(e) => setShiftStartHour(parseInt(e.target.value) || 0)}
              onBlur={() => updateSetting("shift_start_hour", String(shiftStartHour))}
              style={{
                width: 60, textAlign: "center", fontSize: 15, fontWeight: 600,
                borderRadius: 8, border: "1px solid var(--border-color)",
                background: "var(--input-bg)", padding: "6px 0", color: "var(--text-primary)", outline: "none",
              }}
            />
            <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>h</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", minWidth: 60 }}>Fermeture</span>
            <input
              type="number" min={0} max={23}
              value={shiftEndHour}
              onChange={(e) => setShiftEndHour(parseInt(e.target.value) || 0)}
              onBlur={() => updateSetting("shift_end_hour", String(shiftEndHour))}
              style={{
                width: 60, textAlign: "center", fontSize: 15, fontWeight: 600,
                borderRadius: 8, border: "1px solid var(--border-color)",
                background: "var(--input-bg)", padding: "6px 0", color: "var(--text-primary)", outline: "none",
              }}
            />
            <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>h (lendemain si &lt; ouverture)</span>
          </div>
        </div>
      </div>

      {/* À propos */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Info size={12} style={{ color: "var(--text-tertiary)" }} />
          <span className="section-label">À propos</span>
        </div>
        <div className="card-light" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>Application</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Shift</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>Version</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>2.0 beta</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: "var(--text-secondary)" }}>Établissement</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Le Hive · Cannes</span>
          </div>
        </div>
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
