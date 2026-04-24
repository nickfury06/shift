"use client";

/**
 * Guide du lieu — Apple-style landing page for permanent & temporary staff.
 *
 * Landing: large title, tonight's team, then a grid of colored cards for
 * each section. Tap a card → push into a detail view with back-button.
 *
 * Content sources, in priority order:
 *   1. Supabase `settings` rows (patron-editable via /settings)
 *   2. Sensible built-in defaults so the Guide is useful from day one
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate } from "@/lib/shift-utils";
import type { Profile, Schedule, VenueTable } from "@/lib/types";
import FloorPlan from "@/components/FloorPlan";
import Link from "next/link";
import { haptic } from "@/lib/haptics";
import {
  MapPin, Wifi, Users, AlertTriangle, Shirt, ShieldCheck, Copy,
  Clock, BookOpen, Phone, ChevronLeft, ChevronRight, Pencil,
  Coffee, Utensils,
} from "lucide-react";

interface Setting { key: string; value: string; }

type SectionKey = "plan" | "shifts" | "rules" | "uniform" | "emergency" | "infos" | "service";

interface Section {
  key: SectionKey;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tint: string;   // pastel background for the icon tile
  accent: string; // solid color for the icon
}

// Built-in defaults, override via settings keys of the same name
const DEFAULT_RULES = `Arriver 10 min avant ta prise de service, en tenue et prêt·e.

Téléphone dans la poche pendant le service — jamais sur la table, jamais derrière le bar.

Pas d'alcool avant ou pendant le shift.

Fumer uniquement côté rue, jamais côté terrasse client.

Respect entre collègues, respect des clients. En cas de doute : parles-en au responsable en service.`;

const DEFAULT_UNIFORM = `Tenue standard :
• T-shirt ou chemise noir·e, propre, repassé·e
• Pantalon noir ou jean foncé
• Chaussures fermées, noires de préférence
• Cheveux attachés si longs
• Bijoux discrets uniquement

Tablier fourni sur place. Vestiaire pour laisser tes affaires.`;

const DEFAULT_SERVICE = `Accueil :
• Sourire + contact visuel dès que le client passe la porte
• Proposer l'apéro rapidement (bière pression, cocktail maison)

Pendant le service :
• Ne pas laisser un client attendre plus de 2 min sans signe de ta part
• Vérifier les tables toutes les 10 min
• Prévenir le bar quand il reste 3 portions d'un plat phare

Départ :
• Addition présentée rapidement (sans insister)
• Remercier nommément si tu connais leur prénom`;

const DEFAULT_SHIFTS = `Ouverture standard : 16h
Fermeture : 1h (2h le week-end)

Pause : 15 min par shift de 6h, à coordonner avec le responsable.

Prise de service 10 min avant l'ouverture (en tenue, tablier prêt).

Fin de service : nettoyage de ta zone, caisse comptée et signée, check-out avec le responsable.`;

export default function GuidePage() {
  const { profile } = useAuth();
  const toast = useToast();
  const supabase = useRef(createClient()).current;

  const [tonightStaff, setTonightStaff] = useState<{ profile: Profile; schedule: Schedule }[]>([]);
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [venueInfo, setVenueInfo] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);

  const shiftDate = getShiftDate();

  const fetchData = useCallback(async () => {
    const [schedRes, profRes, tableRes, settingsRes] = await Promise.all([
      supabase.from("schedules").select("*").eq("date", shiftDate),
      supabase.from("profiles").select("*"),
      supabase.from("venue_tables").select("*").order("sort_order"),
      supabase.from("settings").select("*"),
    ]);
    const schedules = (schedRes.data as Schedule[]) || [];
    const profiles = (profRes.data as Profile[]) || [];
    const merged = schedules
      .map((s) => ({ profile: profiles.find((p) => p.id === s.user_id)!, schedule: s }))
      .filter((x) => x.profile)
      .sort((a, b) => a.schedule.start_time.localeCompare(b.schedule.start_time));
    setTonightStaff(merged);
    setTables((tableRes.data as VenueTable[]) || []);
    const infoMap: Record<string, string> = {};
    ((settingsRes.data as Setting[]) || []).forEach((s) => { infoMap[s.key] = s.value; });
    setVenueInfo(infoMap);
    setLoading(false);
  }, [supabase, shiftDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function copyValue(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      haptic("success");
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible");
    }
  }

  const responsable = tonightStaff.find((s) => s.profile.role === "patron" || s.profile.role === "responsable");

  const sections: Section[] = [
    {
      key: "plan",
      title: "Plan du lieu",
      subtitle: "Les espaces du bar",
      icon: <MapPin size={22} strokeWidth={1.8} />,
      tint: "rgba(212,160,74,0.14)",
      accent: "#D4A04A",
    },
    {
      key: "shifts",
      title: "Horaires & shifts",
      subtitle: "Début, fin, pauses",
      icon: <Clock size={22} strokeWidth={1.8} />,
      tint: "rgba(196,120,90,0.14)",
      accent: "#C4785A",
    },
    {
      key: "rules",
      title: "Règles de base",
      subtitle: "Ce qu'on attend",
      icon: <BookOpen size={22} strokeWidth={1.8} />,
      tint: "rgba(139,90,64,0.14)",
      accent: "#8B5A40",
    },
    {
      key: "service",
      title: "Service client",
      subtitle: "Accueil, pendant, départ",
      icon: <Utensils size={22} strokeWidth={1.8} />,
      tint: "rgba(184,144,112,0.14)",
      accent: "#B89070",
    },
    {
      key: "uniform",
      title: "Tenue & vestiaire",
      subtitle: "Dress code + où laisser tes affaires",
      icon: <Shirt size={22} strokeWidth={1.8} />,
      tint: "rgba(168,120,88,0.14)",
      accent: "#A87858",
    },
    {
      key: "emergency",
      title: "Urgence & secours",
      subtitle: "Contacts, trousse, incidents",
      icon: <AlertTriangle size={22} strokeWidth={1.8} />,
      tint: "rgba(192,122,122,0.14)",
      accent: "#C07A7A",
    },
    {
      key: "infos",
      title: "Infos pratiques",
      subtitle: "WiFi, où trouver quoi",
      icon: <Wifi size={22} strokeWidth={1.8} />,
      tint: "rgba(107,74,48,0.14)",
      accent: "#6B4A30",
    },
  ];

  if (loading) {
    return (
      <div
        style={{ paddingTop: 20, paddingRight: 20, paddingLeft: 20, paddingBottom: 96, position: "relative" }}
        className="max-w-lg mx-auto"
      >
        <div className="liquid-bg" aria-hidden>
          <div className="liquid-bg-extra" />
        </div>
        <div className="glass pulse" style={{ height: 36, borderRadius: 10, marginBottom: 20, width: "50%" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass pulse" style={{ height: 120, borderRadius: 20, opacity: 0.7 }} />
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // DETAIL VIEW (a section is selected)
  // ═══════════════════════════════════════════════════════════
  if (activeSection) {
    const section = sections.find((s) => s.key === activeSection)!;
    return (
      <div
        style={{ paddingTop: 14, paddingRight: 20, paddingLeft: 20, paddingBottom: 96, position: "relative" }}
        className="max-w-lg mx-auto animate-fade-in-up"
      >
        <div className="liquid-bg" aria-hidden>
          <div className="liquid-bg-extra" />
        </div>

        {/* Back button (Apple-style) */}
        <button
          onClick={() => setActiveSection(null)}
          style={{
            display: "flex", alignItems: "center", gap: 2,
            background: "none", border: "none", cursor: "pointer",
            padding: "8px 8px 8px 0",
            fontSize: 15, fontWeight: 500,
            color: section.accent,
            marginBottom: 12,
            minHeight: 44,
          }}
        >
          <ChevronLeft size={20} strokeWidth={2.2} />
          Guide
        </button>

        {/* Section hero — glass icon tile */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
          <div
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: section.tint,
              color: section.accent,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 1px 0 0 rgba(255,255,255,0.5) inset, 0 6px 18px ${section.accent}33`,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            {section.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: 0, lineHeight: 1.15 }}>
              {section.title}
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
              {section.subtitle}
            </p>
          </div>
        </div>

        <SectionContent
          sectionKey={activeSection}
          venueInfo={venueInfo}
          tables={tables}
          onCopy={copyValue}
          isPatron={profile?.role === "patron"}
        />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // LANDING GRID
  // ═══════════════════════════════════════════════════════════
  return (
    <div
      style={{ paddingTop: 20, paddingRight: 20, paddingLeft: 20, paddingBottom: 96, position: "relative" }}
      className="max-w-lg mx-auto"
    >
      {/* Liquid-glass ambient background — colored blobs the glass
          surfaces below refract. Fixed layer, doesn't scroll. */}
      <div className="liquid-bg" aria-hidden>
        <div className="liquid-bg-extra" />
      </div>

      {/* Apple-style large title */}
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: 0, lineHeight: 1.1 }}>
          Guide
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-tertiary)", marginTop: 4 }}>
          Tout ce qu&apos;il te faut pour bien démarrer ton shift.
        </p>
      </div>

      {/* Tonight's team — glass hero card */}
      {responsable && (
        <button
          onClick={() => setActiveSection("shifts")}
          className="glass-strong"
          style={{
            width: "100%",
            display: "flex", alignItems: "center", gap: 14,
            padding: "16px 18px",
            borderRadius: 20,
            cursor: "pointer",
            marginBottom: 16,
            textAlign: "left",
          }}
        >
          <div
            style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "var(--gradient-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, color: "#fff",
              flexShrink: 0,
            }}
          >
            {responsable.profile.name[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Responsable ce soir
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", marginTop: 2 }}>
              {responsable.profile.name}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 1 }}>
              {responsable.schedule.start_time.slice(0, 5).replace(":", "h")} → {responsable.schedule.end_time.slice(0, 5).replace(":", "h")}
            </div>
          </div>
          <ChevronRight size={18} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
        </button>
      )}

      {/* Team tonight — horizontal scroll avatars */}
      {tonightStaff.length > 1 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Users size={12} style={{ color: "var(--text-tertiary)" }} />
            <span className="section-label">Équipe ce soir ({tonightStaff.length})</span>
          </div>
          <div
            style={{
              display: "flex", gap: 10, overflowX: "auto", padding: "4px 2px",
              scrollbarWidth: "none",
            }}
          >
            {tonightStaff.map((s) => {
              const isMe = s.profile.id === profile?.id;
              const isManager = s.profile.role === "patron" || s.profile.role === "responsable";
              return (
                <div
                  key={s.schedule.id}
                  style={{
                    flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center",
                    gap: 6, minWidth: 56,
                  }}
                >
                  <div
                    style={{
                      width: 48, height: 48, borderRadius: "50%",
                      background: isManager ? "var(--gradient-primary)" : "var(--secondary-bg)",
                      color: isManager ? "#fff" : "var(--text-secondary)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 700,
                      border: isMe ? "2px solid var(--terra-medium)" : "none",
                    }}
                  >
                    {s.profile.name[0]}
                  </div>
                  <span style={{
                    fontSize: 11, color: "var(--text-secondary)", fontWeight: isMe ? 600 : 500,
                    maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {s.profile.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Apple Shortcuts-style grid of glass section cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {sections.map((section) => (
          <button
            key={section.key}
            className="glass"
            onClick={() => { haptic("light"); setActiveSection(section.key); }}
            style={{
              position: "relative",
              display: "flex", flexDirection: "column", alignItems: "flex-start",
              gap: 10,
              padding: "16px 14px",
              borderRadius: 20,
              cursor: "pointer",
              textAlign: "left",
              minHeight: 130,
              transition: "transform 0.15s ease",
            }}
          >
            {/* Glass icon tile with colored tint + inner highlight */}
            <div
              style={{
                width: 44, height: 44, borderRadius: 14,
                background: section.tint,
                color: section.accent,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: `0 1px 0 0 rgba(255,255,255,0.5) inset, 0 4px 12px ${section.accent}22`,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
            >
              {section.icon}
            </div>
            <div style={{ marginTop: "auto" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                {section.title}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.35 }}>
                {section.subtitle}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Patron shortcut to edit venue info */}
      {profile?.role === "patron" && (
        <Link
          href="/settings"
          className="glass"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "12px 14px", marginTop: 22, borderRadius: 16,
            fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
            textDecoration: "none", minHeight: 44,
          }}
        >
          <Pencil size={14} />
          Modifier les infos (WiFi, urgence, stockage…)
        </Link>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SectionContent — renders the body of a selected section
// ═════════════════════════════════════════════════════════════

function SectionContent({
  sectionKey,
  venueInfo,
  tables,
  onCopy,
  isPatron,
}: {
  sectionKey: SectionKey;
  venueInfo: Record<string, string>;
  tables: VenueTable[];
  onCopy: (text: string, label: string) => void;
  isPatron: boolean;
}) {
  if (sectionKey === "plan") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
          Les différents espaces du bar. Zoome avec deux doigts pour mieux repérer l&apos;agencement.
        </p>
        <FloorPlan tables={tables} showTables={false} />
      </div>
    );
  }

  if (sectionKey === "shifts") {
    const body = venueInfo.guide_shifts || DEFAULT_SHIFTS;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <BodyText text={body} />
        <DetailRow icon={<Clock size={16} />} label="Ouverture" value={venueInfo.shift_start_hour ? `${venueInfo.shift_start_hour}h` : "16h"} />
        <DetailRow icon={<Clock size={16} />} label="Fermeture" value={venueInfo.shift_end_hour ? `${venueInfo.shift_end_hour}h` : "1h"} />
        <DetailRow icon={<Coffee size={16} />} label="Pause" value="15 min par shift de 6h" />
        {isPatron && <EditHint />}
      </div>
    );
  }

  if (sectionKey === "rules") {
    const body = venueInfo.guide_rules || DEFAULT_RULES;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <BodyText text={body} />
        {isPatron && <EditHint />}
      </div>
    );
  }

  if (sectionKey === "service") {
    const body = venueInfo.guide_service || DEFAULT_SERVICE;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <BodyText text={body} />
        {isPatron && <EditHint />}
      </div>
    );
  }

  if (sectionKey === "uniform") {
    const body = venueInfo.guide_uniform || DEFAULT_UNIFORM;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <BodyText text={body} />
        {venueInfo.vestiaire_notes && (
          <DetailRow icon={<Shirt size={16} />} label="Vestiaire" value={venueInfo.vestiaire_notes} />
        )}
        {isPatron && <EditHint />}
      </div>
    );
  }

  if (sectionKey === "emergency") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          className="glass"
          style={{
            padding: 16, borderRadius: 18,
            display: "flex", flexDirection: "column", gap: 10,
            // Subtle danger tint on top of the glass
            boxShadow:
              "0 1px 0 0 rgba(255,255,255,0.4) inset, 0 0 0 1px rgba(192,122,122,0.2), 0 8px 24px rgba(192,122,122,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} style={{ color: "var(--danger)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>En cas d&apos;urgence</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>
            {venueInfo.emergency_contacts || "Préviens d'abord le responsable en service, puis appelle les secours si nécessaire. N'interviens jamais seul·e sur un conflit physique."}
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <EmergencyCard label="SAMU" number="15" />
          <EmergencyCard label="Pompiers" number="18" />
          <EmergencyCard label="Police" number="17" />
          <EmergencyCard label="Urgence UE" number="112" />
        </div>
        {venueInfo.first_aid_notes && (
          <DetailRow icon={<ShieldCheck size={16} />} label="Trousse 1er secours" value={venueInfo.first_aid_notes} />
        )}
        {isPatron && <EditHint />}
      </div>
    );
  }

  if (sectionKey === "infos") {
    const hasWifi = venueInfo.wifi_name || venueInfo.wifi_password;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {hasWifi ? (
          <div
            className="glass"
            style={{
              padding: 16, borderRadius: 18,
              display: "flex", alignItems: "center", gap: 12,
              borderLeft: "3px solid var(--terra-medium)",
            }}
          >
            <Wifi size={22} style={{ color: "var(--terra-medium)", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                WiFi staff
              </div>
              {venueInfo.wifi_name && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                  Réseau : <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{venueInfo.wifi_name}</span>
                </div>
              )}
              {venueInfo.wifi_password && (
                <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <code style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>
                    {venueInfo.wifi_password}
                  </code>
                  <button
                    onClick={() => onCopy(venueInfo.wifi_password, "Mot de passe")}
                    style={{
                      marginLeft: "auto", display: "flex", alignItems: "center", gap: 4,
                      fontSize: 11, fontWeight: 500, color: "var(--terra-medium)",
                      background: "var(--secondary-bg)", border: "none", cursor: "pointer",
                      padding: "6px 10px", borderRadius: 8, minHeight: 32,
                    }}
                  >
                    <Copy size={12} /> Copier
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <EmptyHint label="WiFi à configurer" hint="Le patron peut l'ajouter dans Réglages → Infos du lieu." />
        )}

        {venueInfo.storage_notes ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <BookOpen size={12} style={{ color: "var(--text-tertiary)" }} />
              <span className="section-label">Où trouver quoi</span>
            </div>
            <div className="glass" style={{ padding: 16, borderRadius: 16 }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>
                {venueInfo.storage_notes}
              </p>
            </div>
          </div>
        ) : (
          <EmptyHint label="Aucune info de stockage" hint="Le patron peut lister où trouver verres, sirops, etc." />
        )}

        {isPatron && <EditHint />}
      </div>
    );
  }

  return null;
}

// ═════════════════════════════════════════════════════════════
// Small presentational components
// ═════════════════════════════════════════════════════════════

function BodyText({ text }: { text: string }) {
  return (
    <div className="glass" style={{ padding: 20, borderRadius: 20 }}>
      <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
        {text}
      </p>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="glass"
      style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        padding: "14px 16px", borderRadius: 16,
      }}
    >
      <div style={{ color: "var(--terra-medium)", flexShrink: 0, marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </div>
        <div style={{ fontSize: 14, color: "var(--text-primary)", marginTop: 2, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function EmergencyCard({ label, number }: { label: string; number: string }) {
  return (
    <a
      href={`tel:${number}`}
      className="glass"
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
        padding: "16px 10px", borderRadius: 16,
        textDecoration: "none",
        minHeight: 92,
        justifyContent: "center",
      }}
    >
      <Phone size={16} style={{ color: "var(--danger)" }} />
      <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{number}</span>
    </a>
  );
}

function EmptyHint({ label, hint }: { label: string; hint: string }) {
  return (
    <div
      className="glass"
      style={{
        padding: "14px 16px", borderRadius: 14,
        color: "var(--text-tertiary)", fontSize: 13, lineHeight: 1.5,
      }}
    >
      <div style={{ fontWeight: 600, color: "var(--text-secondary)", marginBottom: 2 }}>{label}</div>
      {hint}
    </div>
  );
}

function EditHint() {
  return (
    <Link
      href="/settings"
      className="glass"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: "10px 14px", borderRadius: 14,
        fontSize: 12, fontWeight: 500, color: "var(--text-secondary)",
        textDecoration: "none", minHeight: 44,
      }}
    >
      <Pencil size={13} />
      Modifier dans Réglages
    </Link>
  );
}
