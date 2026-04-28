"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { Heart, Clock, Info, MapPin, BookOpen } from "lucide-react";

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
  const [wifiName, setWifiName] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [wifiCustomerName, setWifiCustomerName] = useState("");
  const [wifiCustomerPassword, setWifiCustomerPassword] = useState("");
  const [storageNotes, setStorageNotes] = useState("");
  const [vestiaireNotes, setVestiaireNotes] = useState("");
  const [firstAidNotes, setFirstAidNotes] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState("");

  // Guide content (overrides defaults shown in /guide)
  const [guideRules, setGuideRules] = useState("");
  const [guideShifts, setGuideShifts] = useState("");
  const [guideService, setGuideService] = useState("");
  const [guideUniform, setGuideUniform] = useState("");
  const [guideBarTech, setGuideBarTech] = useState("");
  const [guideGaming, setGuideGaming] = useState("");

  const fetchSettings = useCallback(async () => {
    const { data } = await supabase.from("settings").select("*");
    const map: Record<string, string> = {};
    ((data as Setting[]) || []).forEach((s) => { map[s.key] = s.value; });
    if (map.discount_frequency) setFnfFrequency(map.discount_frequency as "weekly" | "monthly" | "unlimited");
    if (map.discount_max_per_period) setFnfMaxPerPeriod(parseInt(map.discount_max_per_period));
    if (map.shift_start_hour) setShiftStartHour(parseInt(map.shift_start_hour));
    if (map.shift_end_hour) setShiftEndHour(parseInt(map.shift_end_hour));
    if (map.wifi_name) setWifiName(map.wifi_name);
    if (map.wifi_password) setWifiPassword(map.wifi_password);
    if (map.wifi_customer_name) setWifiCustomerName(map.wifi_customer_name);
    if (map.wifi_customer_password) setWifiCustomerPassword(map.wifi_customer_password);
    if (map.storage_notes) setStorageNotes(map.storage_notes);
    if (map.vestiaire_notes) setVestiaireNotes(map.vestiaire_notes);
    if (map.first_aid_notes) setFirstAidNotes(map.first_aid_notes);
    if (map.emergency_contacts) setEmergencyContacts(map.emergency_contacts);
    if (map.guide_rules) setGuideRules(map.guide_rules);
    if (map.guide_shifts) setGuideShifts(map.guide_shifts);
    if (map.guide_service) setGuideService(map.guide_service);
    if (map.guide_uniform) setGuideUniform(map.guide_uniform);
    if (map.guide_bar_tech) setGuideBarTech(map.guide_bar_tech);
    if (map.guide_gaming) setGuideGaming(map.guide_gaming);
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
      <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div className="card-medium" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Accès réservé au patron</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-light pulse" style={{ height: 56, borderRadius: 16, marginBottom: 10 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
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

      {/* Infos du lieu — affichées dans le Guide pour toute l'équipe */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <MapPin size={12} style={{ color: "var(--terra-medium)" }} />
          <span className="section-label">Infos du lieu</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10, lineHeight: 1.4 }}>
          Visibles par toute l&apos;équipe dans le Guide. Remplis ce que tu veux partager.
        </p>
        <div className="card-light" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <VenueField
            label="Nom du WiFi staff"
            value={wifiName}
            onChange={setWifiName}
            onBlur={() => updateSetting("wifi_name", wifiName)}
            placeholder="ex. LeHive-Staff"
          />
          <VenueField
            label="Mot de passe WiFi staff"
            value={wifiPassword}
            onChange={setWifiPassword}
            onBlur={() => updateSetting("wifi_password", wifiPassword)}
            placeholder="ex. abeille2024"
          />
          <VenueField
            label="Nom du WiFi clients"
            value={wifiCustomerName}
            onChange={setWifiCustomerName}
            onBlur={() => updateSetting("wifi_customer_name", wifiCustomerName)}
            placeholder="ex. Hive Customers"
          />
          <VenueField
            label="Mot de passe WiFi clients"
            value={wifiCustomerPassword}
            onChange={setWifiCustomerPassword}
            onBlur={() => updateSetting("wifi_customer_password", wifiCustomerPassword)}
            placeholder="utilisé par les extras + clients"
          />
          <VenueField
            label="Vestiaire"
            value={vestiaireNotes}
            onChange={setVestiaireNotes}
            onBlur={() => updateSetting("vestiaire_notes", vestiaireNotes)}
            placeholder="ex. Couloir arrière, casiers à gauche"
          />
          <VenueField
            label="Trousse 1er secours"
            value={firstAidNotes}
            onChange={setFirstAidNotes}
            onBlur={() => updateSetting("first_aid_notes", firstAidNotes)}
            placeholder="ex. Derrière le bar, étagère du haut"
          />
          <VenueField
            label="Où trouver quoi"
            value={storageNotes}
            onChange={setStorageNotes}
            onBlur={() => updateSetting("storage_notes", storageNotes)}
            placeholder="Verres, sirops, tickets de caisse, nappes..."
            multiline
          />
          <VenueField
            label="Contacts urgence"
            value={emergencyContacts}
            onChange={setEmergencyContacts}
            onBlur={() => updateSetting("emergency_contacts", emergencyContacts)}
            placeholder="Nicolas 06.XX.XX.XX.XX · Sophie 06.XX.XX.XX.XX"
            multiline
          />
        </div>
      </div>

      {/* Contenus du Guide — affichés dans /guide pour toute l'équipe */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <BookOpen size={12} style={{ color: "var(--terra-medium)" }} />
          <span className="section-label">Guide — contenus éditables</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10, lineHeight: 1.4 }}>
          Vide = on garde les textes par défaut intégrés. Remplis pour personnaliser ce que ton équipe lit.
        </p>
        <div className="card-light" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <VenueField
            label="Règles de base"
            value={guideRules}
            onChange={setGuideRules}
            onBlur={() => updateSetting("guide_rules", guideRules)}
            placeholder="Téléphone dans la poche, pas d'alcool avant le shift…"
            multiline
          />
          <VenueField
            label="Horaires & shifts"
            value={guideShifts}
            onChange={setGuideShifts}
            onBlur={() => updateSetting("guide_shifts", guideShifts)}
            placeholder="Ouverture, fermeture, pauses, prise de service…"
            multiline
          />
          <VenueField
            label="Service client"
            value={guideService}
            onChange={setGuideService}
            onBlur={() => updateSetting("guide_service", guideService)}
            placeholder="Accueil, pendant le service, départ, dosages salle…"
            multiline
          />
          <VenueField
            label="Tenue & vestiaire"
            value={guideUniform}
            onChange={setGuideUniform}
            onBlur={() => updateSetting("guide_uniform", guideUniform)}
            placeholder="Dress code, vestiaire, tablier…"
            multiline
          />
          <VenueField
            label="Fiche technique bar"
            value={guideBarTech}
            onChange={setGuideBarTech}
            onBlur={() => updateSetting("guide_bar_tech", guideBarTech)}
            placeholder="Recettes cocktails, dosages, matos…"
            multiline
          />
          <VenueField
            label="Gaming PC"
            value={guideGaming}
            onChange={setGuideGaming}
            onBlur={() => updateSetting("guide_gaming", guideGaming)}
            placeholder="Allumer / éteindre les PC, prêt du matos…"
            multiline
          />
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

function VenueField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  const commonStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 10,
    border: "1px solid var(--border-color)",
    background: "var(--input-bg)",
    padding: "10px 12px",
    fontSize: 14,
    color: "var(--text-primary)",
    outline: "none",
    fontFamily: "inherit",
    resize: "vertical",
  };
  return (
    <div>
      <label style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500, display: "block", marginBottom: 6 }}>
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={2}
          style={{ ...commonStyle, minHeight: 56 }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          style={commonStyle}
        />
      )}
    </div>
  );
}
