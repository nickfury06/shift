"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, getShiftDay, getNow, formatDateFr, formatTime } from "@/lib/shift-utils";
import { MOMENT_LABELS, MOMENT_ORDER } from "@/lib/constants";
import type {
  Task,
  OneOffTask,
  TaskCompletion,
  ManagerMessage,
  Event,
  Ritual,
  Reservation,
  Moment,
  Profile,
  StockAlert,
  StockProduct,
} from "@/lib/types";
import MessageBanner from "@/components/MessageBanner";
import MomentSection from "@/components/MomentSection";
import Link from "next/link";
import { Users, Bell, Search, X, ChevronDown } from "lucide-react";

interface MergedTask {
  id: string;
  title: string;
  zone?: string;
  zoneKey?: import("@/lib/types").Zone;
  description?: string | null;
  completed: boolean;
  moment: Moment;
  isOneOff: boolean;
  isLibre?: boolean;
}

export default function AccueilPage() {
  const { profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [dismissedMsgIds, setDismissedMsgIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = localStorage.getItem("shift-dismissed-msgs");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  function dismissMsg(id: string) {
    setDismissedMsgIds((prev) => {
      const next = new Set([...prev, id]);
      localStorage.setItem("shift-dismissed-msgs", JSON.stringify([...next]));
      return next;
    });
  }

  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [staffProfiles, setStaffProfiles] = useState<Pick<Profile, "id" | "name" | "role">[]>([]);
  const [rawCompletions, setRawCompletions] = useState<TaskCompletion[]>([]);
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tasks, setTasks] = useState<MergedTask[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [stockSearch, setStockSearch] = useState("");
  const [showStockSignal, setShowStockSignal] = useState(false);
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  const shiftDate = getShiftDate();
  const shiftDay = getShiftDay();
  const dateLabel = formatDateFr(shiftDate);
  const dateLabelShort = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  const fetchData = useCallback(async () => {
    if (!profile) return;

    const [msgRes, resaRes, taskRes, oneOffRes, compRes, profRes, alertRes, prodRes, eventRes, ritualRes] =
      await Promise.all([
        supabase.from("messages").select("*").eq("date", shiftDate).order("created_at", { ascending: false }),
        supabase.from("reservations").select("*").eq("date", shiftDate).order("time", { ascending: true }),
        supabase.from("tasks").select("*").order("priority", { ascending: true }),
        supabase.from("one_off_tasks").select("*").eq("date", shiftDate).order("priority", { ascending: true }),
        supabase.from("task_completions").select("*").eq("date", shiftDate),
        supabase.from("profiles").select("id, name, role"),
        supabase.from("stock_alerts").select("*").eq("acknowledged", false).order("created_at", { ascending: false }),
        supabase.from("stock_products").select("id, name, category").order("name"),
        supabase.from("events").select("*").eq("date", shiftDate).limit(1).maybeSingle(),
        supabase.from("rituals").select("*").eq("day", shiftDay).eq("active", true).order("sort_order"),
      ]);

    setMessages((msgRes.data as ManagerMessage[]) || []);
    setReservations((resaRes.data as Reservation[]) || []);
    const profList = (profRes.data as Pick<Profile, "id" | "name" | "role">[]) || [];
    const profMap: Record<string, string> = {};
    profList.forEach((p) => { profMap[p.id] = p.name; });
    setProfiles(profMap);
    setStaffProfiles(profList.filter((p) => p.role !== "patron"));
    setStockAlerts((alertRes.data as StockAlert[]) || []);
    setStockProducts((prodRes.data as StockProduct[]) || []);
    setEvent((eventRes.data as Event) || null);
    setRituals((ritualRes.data as Ritual[]) || []);

    const completions = (compRes.data as TaskCompletion[]) || [];
    setRawCompletions(completions);
    const completedIds = new Set(completions.map((c) => c.task_id));

    const todayTasks = ((taskRes.data as Task[]) || []).filter((t) => t.days && t.days.includes(shiftDay));
    setRawTasks(todayTasks);

    const { ZONE_LABELS } = await import("@/lib/constants");
    const recurring: MergedTask[] = todayTasks.map((t) => ({
      id: t.id, title: t.title, zone: ZONE_LABELS[t.zone] || t.zone,
      zoneKey: t.zone, description: t.note, completed: completedIds.has(t.id),
      moment: t.moment, isOneOff: false, isLibre: t.is_libre,
    }));

    const oneOff: MergedTask[] = ((oneOffRes.data as OneOffTask[]) || []).map((t) => ({
      id: t.id, title: t.title, zone: ZONE_LABELS[t.zone] || t.zone,
      zoneKey: t.zone, description: t.note, completed: completedIds.has(t.id),
      moment: t.moment, isOneOff: true,
    }));

    const allTasks = [...recurring, ...oneOff];
    setTasks(allTasks.filter((t) => !t.isLibre));
    setLoading(false);
  }, [profile, supabase, shiftDate, shiftDay]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel("accueil-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_completions", filter: `date=eq.${shiftDate}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "one_off_tasks", filter: `date=eq.${shiftDate}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `date=eq.${shiftDate}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `date=eq.${shiftDate}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_alerts" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, shiftDate, fetchData]);

  // ── Stock signal ──────────────────────────────────────────
  async function sendStockAlert(productId: string) {
    if (!profile) return;
    const p = stockProducts.find((x) => x.id === productId);
    await supabase.from("stock_alerts").insert({ product_id: productId, message: `${p?.name} est bas`, created_by: profile.id });
    setStockSearch("");
    setShowStockSignal(false);
  }

  const stockSearchResults = stockSearch.length >= 2
    ? stockProducts.filter((p) => p.name.toLowerCase().includes(stockSearch.toLowerCase())).slice(0, 6)
    : [];
  const alertedProductIds = new Set(stockAlerts.map((a) => a.product_id));

  // ── Toggle task ───────────────────────────────────────────
  async function handleToggleTask(taskId: string, completed: boolean) {
    if (!profile) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (task.isOneOff) {
      await supabase.from("one_off_tasks").update({ completed }).eq("id", taskId);
    } else {
      if (completed) {
        await supabase.from("task_completions").insert({ task_id: taskId, user_id: profile.id, date: shiftDate, moment: task.moment });
      } else {
        await supabase.from("task_completions").delete().eq("task_id", taskId).eq("date", shiftDate);
      }
    }

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed } : t)));
  }

  // ── Derived ───────────────────────────────────────────────
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.completed).length;
  const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalCovers = reservations.reduce((sum, r) => sum + r.covers, 0);
  const pendingResas = reservations.filter((r) => r.status === "attendu").length;
  const activeMessages = messages.filter((m) => !dismissedMsgIds.has(m.id));

  if (loading) {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96, maxWidth: 512, margin: "0 auto" }}>
        <div style={{ height: 32, background: "var(--card-bg)", borderRadius: 12, marginBottom: 16, opacity: 0.5 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ flex: 1, height: 72, background: "var(--card-bg)", borderRadius: 16, opacity: 0.5 }} />)}
        </div>
        <div style={{ height: 100, background: "var(--card-bg)", borderRadius: 16, opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px", paddingTop: "env(safe-area-inset-top, 16px)", paddingBottom: 96, maxWidth: 512, margin: "0 auto" }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ padding: "16px 0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>
            Salut {profile?.name?.split(" ")[0]}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{dateLabelShort}</p>
        </div>
      </div>

      {/* ── Ce soir (rituels + events) ─────────────────────── */}
      {(rituals.length > 0 || event) && (
        <div style={{
          marginBottom: 16, borderRadius: 14, overflow: "hidden",
          background: "linear-gradient(135deg, rgba(196,120,90,0.06) 0%, rgba(196,120,90,0.02) 100%)",
          border: "1px solid rgba(196,120,90,0.1)",
        }}>
          {rituals.map((r) => {
            const isExpanded = expandedEventId === r.id;
            return (
              <div key={r.id}>
                <button
                  onClick={() => setExpandedEventId(isExpanded ? null : r.id)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px", background: "none", border: "none", cursor: "pointer",
                    borderBottom: isExpanded ? "1px solid rgba(196,120,90,0.08)" : "none",
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--terra-medium)", minWidth: 42 }}>{r.time}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", flex: 1, textAlign: "left" }}>{r.name}</span>
                  <ChevronDown size={14} style={{
                    color: "var(--text-tertiary)", transition: "transform 0.2s",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                  }} />
                </button>
                {isExpanded && (
                  <div style={{ padding: "8px 14px 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                    {r.description && (
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{r.description}</p>
                    )}
                    {r.organizer && (
                      <p style={{ fontSize: 12, color: "var(--terra-medium)", fontWeight: 500 }}>Animé par {r.organizer}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {event && (
            <div>
              <button
                onClick={() => setExpandedEventId(expandedEventId === `event-${event.id}` ? null : `event-${event.id}`)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", background: "none", border: "none", cursor: "pointer",
                  borderTop: rituals.length > 0 ? "1px solid rgba(196,120,90,0.08)" : "none",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--terra-medium)", minWidth: 42 }}>
                  {event.start_time ? formatTime(event.start_time) : "🎉"}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", flex: 1, textAlign: "left" }}>{event.title}</span>
                <ChevronDown size={14} style={{
                  color: "var(--text-tertiary)", transition: "transform 0.2s",
                  transform: expandedEventId === `event-${event.id}` ? "rotate(180deg)" : "rotate(0)",
                }} />
              </button>
              {expandedEventId === `event-${event.id}` && event.description && (
                <div style={{ padding: "8px 14px 12px" }}>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>{event.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Infos du shift ──────────────────────────────────── */}
      {(activeMessages.length > 0 || (stockAlerts.length > 0 && !showStockSignal)) && (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {/* Messages */}
          {activeMessages.map((msg) => (
            <div key={msg.id} onClick={() => dismissMsg(msg.id)} style={{ cursor: "pointer" }}>
              <MessageBanner content={msg.content} author={profiles[msg.created_by] || "Manager"} />
            </div>
          ))}
          {/* Stock alerts (shown here when panel is closed) */}
          {!showStockSignal && stockAlerts.length > 0 && stockAlerts.length <= 2 && (
            stockAlerts.map((a) => {
              const prod = stockProducts.find((p) => p.id === a.product_id);
              return (
                <div key={a.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 14,
                  background: "rgba(212,160,74,0.06)",
                  border: "1px solid rgba(212,160,74,0.15)",
                }}>
                  <Bell size={15} style={{ color: "var(--warning)", flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{prod?.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>
                    {profiles[a.created_by] || "Staff"}
                  </span>
                </div>
              );
            })
          )}
          {/* 3+ alerts → unified collapsible card */}
          {!showStockSignal && stockAlerts.length >= 3 && (
            <div style={{ borderRadius: 14, overflow: "hidden", background: "rgba(212,160,74,0.06)", border: "1px solid rgba(212,160,74,0.15)" }}>
              <button
                onClick={() => setAlertsExpanded(!alertsExpanded)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", cursor: "pointer",
                  background: "none", border: "none",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(212,160,74,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Bell size={16} style={{ color: "var(--warning)" }} />
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {stockAlerts.length} produits manquants
                  </div>
                  {!alertsExpanded && (
                    <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 1 }}>
                      {stockAlerts.slice(0, 3).map((a) => stockProducts.find((p) => p.id === a.product_id)?.name).filter(Boolean).join(", ")}
                      {stockAlerts.length > 3 && "..."}
                    </div>
                  )}
                </div>
                <ChevronDown size={16} style={{
                  color: "var(--text-tertiary)", transition: "transform 0.2s",
                  transform: alertsExpanded ? "rotate(180deg)" : "rotate(0)",
                }} />
              </button>
              {alertsExpanded && (
                <div style={{ padding: "0 16px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                  {stockAlerts.map((a) => {
                    const prod = stockProducts.find((p) => p.id === a.product_id);
                    return (
                      <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{prod?.name}</span>
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>
                          {profiles[a.created_by] || "Staff"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Quick Stats Row ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {/* Tasks progress */}
        <div className="card-medium" style={{ flex: 1, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{taskPct}%</span>
          </div>
          <div style={{ height: 4, background: "var(--secondary-bg)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
            <div style={{
              height: "100%", borderRadius: 2, width: `${taskPct}%`,
              background: taskPct === 100 ? "var(--terra-deep)" : "var(--gradient-primary)",
              transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }} />
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>{doneTasks}/{totalTasks} tâches</p>
        </div>

        {/* Reservations */}
        <Link href="/reservations" className="card-medium" style={{ flex: 1, padding: "14px 16px", textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>{reservations.length}</span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>résas</span>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            {totalCovers} couverts{pendingResas > 0 && ` · ${pendingResas} en attente`}
          </p>
        </Link>
      </div>

      {/* ── Stock signal panel ──────────────────────────────── */}
      {showStockSignal && (
        <div style={{ marginBottom: 16 }}>
          {/* Search */}
          <div className="card-medium" style={{ padding: 14, marginBottom: stockAlerts.length > 0 ? 10 : 0 }}>
            <div style={{ position: "relative", marginBottom: stockSearchResults.length > 0 ? 10 : 0 }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
              <input
                type="text"
                placeholder="Quel produit manque ?"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                autoFocus
                style={{
                  width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
                  background: "var(--input-bg)", padding: "10px 14px 10px 36px", fontSize: 14,
                  color: "var(--text-primary)", outline: "none",
                }}
              />
              <button onClick={() => { setShowStockSignal(false); setStockSearch(""); }} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={14} style={{ color: "var(--text-tertiary)" }} />
              </button>
            </div>
            {stockSearchResults.map((p) => {
              const flagged = alertedProductIds.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => !flagged && sendStockAlert(p.id)}
                  disabled={flagged}
                  style={{
                    width: "100%", textAlign: "left", border: "none", cursor: flagged ? "default" : "pointer",
                    padding: "10px 12px", borderRadius: 10, marginBottom: 4,
                    background: flagged ? "transparent" : "rgba(212,160,74,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    opacity: flagged ? 0.35 : 1,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{p.name}</span>
                  {flagged
                    ? <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Déjà signalé</span>
                    : <span style={{
                        fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--warning)",
                        padding: "4px 12px", borderRadius: 8,
                      }}>Signaler</span>
                  }
                </button>
              );
            })}
          </div>

          {/* Active alerts — graphic cards */}
          {stockAlerts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {stockAlerts.map((a) => {
                const prod = stockProducts.find((p) => p.id === a.product_id);
                const time = new Date(a.created_at);
                const timeStr = `${time.getHours()}h${String(time.getMinutes()).padStart(2, "0")}`;
                return (
                  <div key={a.id} className="card-medium" style={{
                    padding: "14px 16px",
                    borderLeft: "4px solid var(--warning)",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: "rgba(212,160,74,0.12)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Bell size={18} style={{ color: "var(--warning)" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                        {prod?.name || "Produit"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
                        {profiles[a.created_by] || "Staff"} · {timeStr}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Patron: Staff Progress ──────────────────────────── */}
      {profile?.role === "patron" && staffProfiles.length > 0 && (() => {
        const staffProgress = staffProfiles
          .map((s) => {
            const assigned = rawTasks.filter((t) => !t.is_libre && t.assigned_to.includes(s.id));
            if (assigned.length === 0) return null;
            const completedSet = new Set(rawCompletions.filter((c) => c.user_id === s.id).map((c) => c.task_id));
            const done = assigned.filter((t) => completedSet.has(t.id)).length;
            return { id: s.id, name: s.name, total: assigned.length, done };
          })
          .filter(Boolean) as { id: string; name: string; total: number; done: number }[];

        if (staffProgress.length === 0) return null;

        return (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Users size={13} style={{ color: "var(--text-tertiary)" }} />
              <span className="section-label">Équipe</span>
            </div>
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {staffProgress.map((s) => {
                const pct = Math.round((s.done / s.total) * 100);
                return (
                  <div key={s.id} className="card-light" style={{ padding: "10px 14px", minWidth: 120, flexShrink: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 6 }}>{s.name}</div>
                    <div style={{ height: 4, background: "var(--secondary-bg)", borderRadius: 2, overflow: "hidden", marginBottom: 4 }}>
                      <div style={{
                        height: "100%", borderRadius: 2, width: `${pct}%`,
                        background: pct === 100 ? "var(--terra-deep)" : "var(--gradient-primary)",
                        transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{s.done}/{s.total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* ── Tasks by moment ─────────────────────────────────── */}
      {MOMENT_ORDER.map((moment, idx) => {
        const momentTasks = tasks.filter((t) => t.moment === moment);
        if (momentTasks.length === 0 && moment !== "fermeture") return null;
        return (
          <div key={moment}>
            <MomentSection name={MOMENT_LABELS[moment]} tasks={momentTasks} onToggleTask={handleToggleTask} defaultCollapsed={moment === "fermeture"} />
            {idx < MOMENT_ORDER.length - 1 && <div style={{ height: 20 }} />}
          </div>
        );
      })}

      <div style={{ height: 20 }} />
    </div>
  );
}
