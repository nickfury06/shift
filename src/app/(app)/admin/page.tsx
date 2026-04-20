"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, formatDateFr } from "@/lib/shift-utils";
import type { AvailabilityRequest, Profile, Debrief } from "@/lib/types";
import Link from "next/link";
import {
  ThumbsUp, ThumbsDown, Calendar, MessageCircle, ListChecks,
  Users, Settings, ArrowRight, Repeat, UserX,
  Send, Check, ChevronDown, AlertTriangle, Lightbulb, TrendingUp,
} from "lucide-react";

const RATING_COLORS = ["", "#D44", "#D88", "#B89070", "#8B6A50", "#6B4A30"];

export default function AdminPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [absenceRequests, setAbsenceRequests] = useState<AvailabilityRequest[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [expandedDebrief, setExpandedDebrief] = useState<string | null>(null);

  // Inline message compose
  const [msgContent, setMsgContent] = useState("");
  const [msgSending, setMsgSending] = useState(false);
  const [msgSent, setMsgSent] = useState(false);

  const shiftDate = getShiftDate();

  const fetchData = useCallback(async () => {
    const [absRes, profRes, debRes] = await Promise.all([
      supabase.from("availability_requests").select("*").eq("status", "pending").order("date"),
      supabase.from("profiles").select("id, name, role"),
      supabase.from("debriefs").select("*").eq("date", shiftDate).order("created_at"),
    ]);
    setAbsenceRequests((absRes.data as AvailabilityRequest[]) || []);
    const map: Record<string, string> = {};
    ((profRes.data as Pick<Profile, "id" | "name" | "role">[]) || []).forEach((p) => { map[p.id] = p.name; });
    setStaffMap(map);
    setDebriefs((debRes.data as Debrief[]) || []);
    setLoading(false);
  }, [supabase, shiftDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_requests" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "debriefs" }, () => fetchData())
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
    const { error } = await supabase.from("availability_requests").update({ status }).eq("id", id);
    if (error) { toast.error("Erreur, réessaie"); return; }
    if (status === "accepted") {
      const req = absenceRequests.find((r) => r.id === id);
      if (req) {
        await supabase.from("schedules").delete().eq("user_id", req.user_id).eq("date", req.date);
      }
    }
    toast.success(status === "accepted" ? "Absence acceptée" : "Absence refusée");
    fetchData();
  }

  async function sendMessage() {
    if (!msgContent.trim() || !user || msgSending) return;
    setMsgSending(true);
    const { error } = await supabase.from("messages").insert({
      content: msgContent.trim(),
      date: shiftDate,
      created_by: user.id,
    });
    setMsgSending(false);
    if (error) { toast.error("Erreur, réessaie"); return; }
    setMsgContent("");
    setMsgSent(true);
    toast.success("Message envoyé");
    setTimeout(() => setMsgSent(false), 2000);
  }

  const manageGroups = [
    {
      label: "Contenu",
      items: [
        { href: "/events", label: "Événements", icon: <Repeat size={20} />, tint: "rgba(196,120,90,0.1)", iconColor: "var(--terra-medium)" },
        { href: "/tasks", label: "Tâches", icon: <ListChecks size={20} />, tint: "rgba(196,120,90,0.1)", iconColor: "var(--terra-medium)" },
      ],
    },
    {
      label: "Équipe",
      items: [
        { href: "/staff", label: "Comptes", icon: <Users size={20} />, tint: "rgba(139,90,64,0.1)", iconColor: "var(--terra-deep)" },
        { href: "/planning", label: "Planning", icon: <Calendar size={20} />, tint: "rgba(139,90,64,0.1)", iconColor: "var(--terra-deep)" },
      ],
    },
    {
      label: "Insights",
      items: [
        { href: "/analytics", label: "Analytics", icon: <TrendingUp size={20} />, tint: "rgba(196,120,90,0.08)", iconColor: "var(--terra-medium)" },
      ],
    },
    {
      label: "Système",
      items: [
        { href: "/settings", label: "Réglages", icon: <Settings size={20} />, tint: "rgba(181,176,168,0.15)", iconColor: "var(--text-secondary)" },
      ],
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3].map((i) => <div key={i} className="card-light pulse" style={{ height: 56, borderRadius: 16, marginBottom: 10, opacity: 0.5 }} />)}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">

      <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 20 }}>
        Admin
      </h1>

      {/* ═══ 1. ABSENCES EN ATTENTE ═══════════════════════ */}
      {absenceRequests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="section-label" style={{ marginBottom: 10 }}>
            Demandes d&apos;absence ({absenceRequests.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                    {formatDateFr(req.date)}
                  </div>
                  {req.reason && (
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2, fontStyle: "italic" }}>{req.reason}</div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => respondAbsence(req.id, "accepted")} style={{ width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(139,90,64,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ThumbsUp size={16} style={{ color: "#8B5A40" }} />
                  </button>
                  <button onClick={() => respondAbsence(req.id, "refused")} style={{ width: 36, height: 36, borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(200,60,60,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <ThumbsDown size={16} style={{ color: "var(--danger)" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ 2. MESSAGE RAPIDE ═══════════════════════════ */}
      <div style={{ marginBottom: 24 }}>
        <p className="section-label" style={{ marginBottom: 10 }}>
          <MessageCircle size={12} style={{ display: "inline", marginRight: 4 }} />
          Message à l&apos;équipe
        </p>
        <div className="card-light" style={{ padding: 12, display: "flex", gap: 8, alignItems: "flex-end" }}>
          <textarea
            placeholder="Écrire un message pour ce soir..."
            value={msgContent}
            onChange={(e) => setMsgContent(e.target.value)}
            rows={2}
            style={{
              flex: 1, borderRadius: 10, border: "1px solid var(--border-color)",
              background: "var(--input-bg)", padding: "8px 12px", fontSize: 13,
              color: "var(--text-primary)", outline: "none", resize: "none",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!msgContent.trim() || msgSending}
            style={{
              width: 40, height: 40, borderRadius: 10, border: "none", cursor: "pointer",
              background: msgSent ? "var(--terra-deep)" : "var(--gradient-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: !msgContent.trim() || msgSending ? 0.4 : 1,
              transition: "all 0.2s",
            }}
          >
            {msgSent ? <Check size={16} style={{ color: "#fff" }} /> : <Send size={16} style={{ color: "#fff" }} />}
          </button>
        </div>
      </div>

      {/* ═══ 3. DEBRIEFS DU SOIR ═════════════════════════ */}
      {debriefs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="section-label" style={{ marginBottom: 10 }}>Debriefs du soir</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {debriefs.map((d) => {
              const name = staffMap[d.user_id] || "Staff";
              const isExpanded = expandedDebrief === d.id;
              const hasText = d.incidents || d.client_feedback || d.suggestions;
              return (
                <div key={d.id} className="card-light" style={{ overflow: "hidden" }}>
                  <button
                    onClick={() => setExpandedDebrief(isExpanded ? null : d.id)}
                    style={{
                      width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 10,
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", flex: 1, textAlign: "left" }}>{name}</span>
                    <span style={{ fontSize: 15, fontWeight: 700, color: RATING_COLORS[d.global_rating] }}>{d.global_rating}/5</span>
                    {d.incidents && <AlertTriangle size={13} style={{ color: "var(--warning)" }} />}
                    {hasText && <ChevronDown size={14} style={{ color: "var(--text-tertiary)", transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }} />}
                  </button>
                  {isExpanded && (
                    <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: "var(--text-secondary)" }}>
                        <span>Service: <b style={{ color: RATING_COLORS[d.service_rating] }}>{d.service_rating}</b></span>
                        <span>Équipe: <b style={{ color: RATING_COLORS[d.team_rating] }}>{d.team_rating}</b></span>
                        <span>Affluence: {d.affluence}</span>
                      </div>
                      {d.incidents && (
                        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                          <AlertTriangle size={11} style={{ display: "inline", marginRight: 4, color: "var(--warning)" }} />
                          {d.incidents}
                        </div>
                      )}
                      {d.client_feedback && (
                        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                          <MessageCircle size={11} style={{ display: "inline", marginRight: 4, color: "var(--terra-medium)" }} />
                          {d.client_feedback}
                        </div>
                      )}
                      {d.suggestions && (
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
                          <Lightbulb size={11} style={{ display: "inline", marginRight: 4 }} />
                          {d.suggestions}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 4. GÉRER ════════════════════════════════════ */}
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {manageGroups.map((group) => (
          <div key={group.label}>
            <p className="section-label" style={{ marginBottom: 10 }}>{group.label}</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {group.items.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="card-light"
                  style={{
                    padding: "18px 16px",
                    textDecoration: "none",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    minHeight: 96,
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  }}
                >
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: link.tint,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: link.iconColor,
                  }}>
                    {link.icon}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                      {link.label}
                    </span>
                    <ArrowRight size={14} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 20 }} />
    </div>
  );
}
