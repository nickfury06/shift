"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, formatDateFr } from "@/lib/shift-utils";
import type { AvailabilityRequest, Reservation, Profile } from "@/lib/types";
import Link from "next/link";
import {
  ThumbsUp, ThumbsDown, Calendar, MessageCircle, ListChecks,
  Users, Package, Settings, ArrowRight, Repeat, UserX, Heart,
} from "lucide-react";

export default function AdminPage() {
  const { profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [absenceRequests, setAbsenceRequests] = useState<AvailabilityRequest[]>([]);
  const [fnfReservations, setFnfReservations] = useState<Reservation[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});

  const shiftDate = getShiftDate();

  const fetchData = useCallback(async () => {
    const [absRes, resaRes, profRes] = await Promise.all([
      supabase.from("availability_requests").select("*").eq("status", "pending").order("date"),
      supabase.from("reservations").select("*").eq("fnf_status", "pending").order("date"),
      supabase.from("profiles").select("id, name"),
    ]);
    setAbsenceRequests((absRes.data as AvailabilityRequest[]) || []);
    setFnfReservations((resaRes.data as Reservation[]) || []);
    const map: Record<string, string> = {};
    ((profRes.data as Pick<Profile, "id" | "name">[]) || []).forEach((p) => { map[p.id] = p.name; });
    setStaffMap(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_requests" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, fetchData]);

  if (profile && profile.role !== "patron") {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div className="card-medium" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Accès réservé au patron</p>
        </div>
      </div>
    );
  }

  async function respondAbsence(id: string, status: "accepted" | "refused") {
    await supabase.from("availability_requests").update({ status }).eq("id", id);
    if (status === "accepted") {
      const req = absenceRequests.find((r) => r.id === id);
      if (req) {
        await supabase.from("schedules").delete().eq("user_id", req.user_id).eq("date", req.date);
      }
    }
    fetchData();
  }

  async function respondFnF(resaId: string, status: "accepted" | "refused") {
    await supabase.from("reservations").update({ fnf_status: status }).eq("id", resaId);
    fetchData();
  }

  const totalPending = absenceRequests.length + fnfReservations.length;

  const quickLinks = [
    { href: "/messages", label: "Messages", icon: <MessageCircle size={18} />, desc: "Communiquer avec l'équipe" },
    { href: "/events", label: "Événements", icon: <Repeat size={18} />, desc: "Rituels & soirées spéciales" },
    { href: "/tasks", label: "Tâches", icon: <ListChecks size={18} />, desc: "Gérer les tâches récurrentes" },
    { href: "/staff", label: "Équipe", icon: <Users size={18} />, desc: "Comptes & rôles" },
    { href: "/stocks", label: "Stocks", icon: <Package size={18} />, desc: "Inventaire & signalements" },
    { href: "/planning", label: "Planning", icon: <Calendar size={18} />, desc: "Horaires de l'équipe" },
    { href: "/settings", label: "Réglages", icon: <Settings size={18} />, desc: "Configuration de l'app" },
  ];

  if (loading) {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3].map((i) => <div key={i} className="card-light" style={{ height: 56, borderRadius: 16, marginBottom: 10, opacity: 0.5 }} />)}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">

      <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 20 }}>
        Admin
      </h1>

      {/* ── Pending requests ─────────────────────────────── */}
      {totalPending > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="section-label" style={{ marginBottom: 10 }}>
            En attente ({totalPending})
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Absence requests */}
            {absenceRequests.map((req) => (
              <div key={req.id} className="card-medium" style={{
                padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                borderLeft: "3px solid var(--terra-medium)",
              }}>
                <UserX size={18} style={{ color: "var(--terra-medium)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {staffMap[req.user_id] || "Staff"}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    Absence — {formatDateFr(req.date)}
                  </div>
                  {req.reason && (
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2, fontStyle: "italic" }}>
                      {req.reason}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => respondAbsence(req.id, "accepted")}
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
                      background: "rgba(139,90,64,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <ThumbsUp size={16} style={{ color: "#8B5A40" }} />
                  </button>
                  <button
                    onClick={() => respondAbsence(req.id, "refused")}
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
                      background: "rgba(200,60,60,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <ThumbsDown size={16} style={{ color: "var(--danger)" }} />
                  </button>
                </div>
              </div>
            ))}

            {/* F&F requests */}
            {fnfReservations.map((resa) => (
              <div key={resa.id} className="card-medium" style={{
                padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                borderLeft: "3px solid var(--warning)",
              }}>
                <Heart size={18} style={{ color: "var(--warning)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    F&F — {resa.name}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                    {resa.covers} pers. · {formatDateFr(resa.date)} · demandé par {staffMap[resa.fnf_requested_by!] || "Staff"}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => respondFnF(resa.id, "accepted")}
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
                      background: "rgba(139,90,64,0.1)", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <ThumbsUp size={16} style={{ color: "#8B5A40" }} />
                  </button>
                  <button
                    onClick={() => respondFnF(resa.id, "refused")}
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer",
                      background: "rgba(200,60,60,0.08)", display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <ThumbsDown size={16} style={{ color: "var(--danger)" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalPending === 0 && (
        <div className="card-light" style={{ padding: "16px 20px", textAlign: "center", marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Aucune demande en attente</p>
        </div>
      )}

      {/* ── Quick links ──────────────────────────────────── */}
      <p className="section-label" style={{ marginBottom: 10 }}>Gérer</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} className="card-light" style={{
            padding: "14px 16px", textDecoration: "none",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{ color: "var(--terra-medium)", flexShrink: 0 }}>{link.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{link.label}</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 1 }}>{link.desc}</div>
            </div>
            <ArrowRight size={14} style={{ color: "var(--text-tertiary)" }} />
          </Link>
        ))}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
