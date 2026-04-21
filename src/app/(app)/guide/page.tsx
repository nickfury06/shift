"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate } from "@/lib/shift-utils";
import type { Profile, Schedule, VenueTable, Reservation } from "@/lib/types";
import FloorPlan from "@/components/FloorPlan";
import {
  MapPin, Wifi, Users, AlertCircle, Shirt,
  ShieldCheck, HelpCircle, Copy, Package, Pencil,
} from "lucide-react";
import Link from "next/link";

interface Setting { key: string; value: string; }

export default function GuidePage() {
  const { profile } = useAuth();
  const toast = useToast();
  const supabase = useRef(createClient()).current;

  const [tonightStaff, setTonightStaff] = useState<{ profile: Profile; schedule: Schedule }[]>([]);
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [venueInfo, setVenueInfo] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const shiftDate = getShiftDate();

  const fetchData = useCallback(async () => {
    const [schedRes, profRes, tableRes, resaRes, settingsRes] = await Promise.all([
      supabase.from("schedules").select("*").eq("date", shiftDate),
      supabase.from("profiles").select("*"),
      supabase.from("venue_tables").select("*").order("sort_order"),
      supabase.from("reservations").select("*").eq("date", shiftDate),
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
    setReservations((resaRes.data as Reservation[]) || []);
    const infoMap: Record<string, string> = {};
    ((settingsRes.data as Setting[]) || []).forEach((s) => { infoMap[s.key] = s.value; });
    setVenueInfo(infoMap);
    setLoading(false);
  }, [supabase, shiftDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function copyValue(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Copie impossible");
    }
  }

  const responsable = tonightStaff.find((s) => s.profile.role === "patron" || s.profile.role === "responsable");

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
        Guide
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2, marginBottom: 20 }}>
        Tout ce qu&apos;il faut savoir pour bien démarrer ton shift.
      </p>

      {/* Responsable tonight */}
      {responsable && (
        <div className="card-medium" style={{
          padding: 16, marginBottom: 20,
          borderLeft: "3px solid var(--terra-medium)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
            Responsable ce soir
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "var(--gradient-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: "#fff",
            }}>
              {responsable.profile.name[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{responsable.profile.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                {responsable.profile.role === "patron" ? "Patron" : "Responsable"} · {responsable.schedule.start_time.slice(0,5).replace(":","h")} → {responsable.schedule.end_time.slice(0,5).replace(":","h")}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.5 }}>
            Si tu as une question ou un doute pendant le service, demande-lui en priorité.
          </p>
        </div>
      )}

      {/* Équipe ce soir */}
      {tonightStaff.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Users size={12} style={{ color: "var(--terra-medium)" }} />
            <span className="section-label">Équipe ce soir ({tonightStaff.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tonightStaff.map((s) => (
              <div key={s.schedule.id} className="card-light" style={{
                padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
                opacity: s.profile.id === profile?.id ? 1 : 0.9,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: s.profile.role === "patron" || s.profile.role === "responsable"
                    ? "var(--gradient-primary)" : "var(--secondary-bg)",
                  color: s.profile.role === "patron" || s.profile.role === "responsable" ? "#fff" : "var(--text-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {s.profile.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                    {s.profile.name}
                    {s.profile.id === profile?.id && <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: 6 }}>(toi)</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {s.profile.role === "patron" ? "Patron" : s.profile.role === "responsable" ? "Responsable" : "Staff"}
                    {" · "}
                    {s.schedule.start_time.slice(0,5).replace(":","h")} → {s.schedule.end_time.slice(0,5).replace(":","h")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* WiFi — priority info, copy-to-clipboard */}
      {(venueInfo.wifi_name || venueInfo.wifi_password) && (
        <div className="card-medium" style={{
          padding: 14, marginBottom: 14,
          display: "flex", alignItems: "center", gap: 12,
          borderLeft: "3px solid var(--terra-medium)",
        }}>
          <Wifi size={22} style={{ color: "var(--terra-medium)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
              WiFi staff
            </div>
            {venueInfo.wifi_name && (
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Réseau : <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{venueInfo.wifi_name}</span>
              </div>
            )}
            {venueInfo.wifi_password && (
              <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <span>Mot de passe :</span>
                <code style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", fontFamily: "ui-monospace, SFMono-Regular, monospace" }}>{venueInfo.wifi_password}</code>
                <button
                  onClick={() => copyValue(venueInfo.wifi_password, "Mot de passe")}
                  aria-label="Copier le mot de passe"
                  style={{
                    marginLeft: "auto", display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11, fontWeight: 500, color: "var(--terra-medium)",
                    background: "var(--secondary-bg)", border: "none", cursor: "pointer",
                    padding: "6px 10px", borderRadius: 8, minHeight: 32,
                  }}
                >
                  <Copy size={12} />
                  Copier
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Infos pratiques — only show cards with real content */}
      {(venueInfo.vestiaire_notes || venueInfo.first_aid_notes) && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <HelpCircle size={12} style={{ color: "var(--terra-medium)" }} />
            <span className="section-label">Infos pratiques</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {venueInfo.vestiaire_notes && (
              <InfoCard icon={<Shirt size={18} />} label="Vestiaire" value={venueInfo.vestiaire_notes} />
            )}
            {venueInfo.first_aid_notes && (
              <InfoCard icon={<ShieldCheck size={18} />} label="1er secours" value={venueInfo.first_aid_notes} />
            )}
          </div>
        </div>
      )}

      {/* Où trouver quoi */}
      {venueInfo.storage_notes && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Package size={12} style={{ color: "var(--terra-medium)" }} />
            <span className="section-label">Où trouver quoi</span>
          </div>
          <div className="card-light" style={{ padding: 14 }}>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
              {venueInfo.storage_notes}
            </p>
          </div>
        </div>
      )}

      {/* En cas d'urgence */}
      <div className="card-medium" style={{
        padding: 14, marginBottom: 20,
        background: "rgba(192,122,122,0.06)",
        border: "1px solid rgba(192,122,122,0.2)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <AlertCircle size={16} style={{ color: "var(--danger)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)" }}>En cas d&apos;urgence</span>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
          {venueInfo.emergency_contacts
            ? venueInfo.emergency_contacts
            : "Le responsable en service doit être prévenu en premier pour tout incident."}
        </p>
      </div>

      {/* Patron shortcut to edit venue info */}
      {profile?.role === "patron" && (
        <Link
          href="/settings"
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "10px 14px", marginBottom: 20,
            fontSize: 13, fontWeight: 500, color: "var(--terra-medium)",
            background: "var(--secondary-bg)", borderRadius: 12,
            textDecoration: "none", minHeight: 40,
          }}
        >
          <Pencil size={14} />
          Modifier les infos du lieu
        </Link>
      )}

      {/* Plan des tables */}
      {!loading && tables.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <MapPin size={12} style={{ color: "var(--terra-medium)" }} />
            <span className="section-label">Plan des tables</span>
          </div>
          <FloorPlan tables={tables} reservations={reservations} />
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-light" style={{ padding: "12px 14px" }}>
      <div style={{ color: "var(--terra-medium)", marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginTop: 2 }}>{value}</div>
    </div>
  );
}
