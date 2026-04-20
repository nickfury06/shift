"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate } from "@/lib/shift-utils";
import type { Profile, Schedule, VenueTable, Reservation } from "@/lib/types";
import FloorPlan from "@/components/FloorPlan";
import {
  MapPin, Wifi, Users, AlertCircle, Phone, Shirt,
  Coffee, ShieldCheck, HelpCircle, BookOpen,
} from "lucide-react";

export default function GuidePage() {
  const { profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [tonightStaff, setTonightStaff] = useState<{ profile: Profile; schedule: Schedule }[]>([]);
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const shiftDate = getShiftDate();

  const fetchData = useCallback(async () => {
    const [schedRes, profRes, tableRes, resaRes] = await Promise.all([
      supabase.from("schedules").select("*").eq("date", shiftDate),
      supabase.from("profiles").select("*"),
      supabase.from("venue_tables").select("*").order("sort_order"),
      supabase.from("reservations").select("*").eq("date", shiftDate),
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
    setLoading(false);
  }, [supabase, shiftDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

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

      {/* Infos pratiques */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <HelpCircle size={12} style={{ color: "var(--terra-medium)" }} />
          <span className="section-label">Infos pratiques</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <InfoCard icon={<Shirt size={18} />} label="Vestiaire" value="À l'arrière" />
          <InfoCard icon={<Wifi size={18} />} label="WiFi staff" value="Demander au responsable" />
          <InfoCard icon={<Coffee size={18} />} label="Pause" value="15 min / shift 6h" />
          <InfoCard icon={<ShieldCheck size={18} />} label="1er secours" value="Derrière le bar" />
        </div>
      </div>

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
        <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Appeler directement Nicolas ou Sophie. Le responsable en service doit être prévenu en premier pour tout incident.
        </p>
      </div>

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
