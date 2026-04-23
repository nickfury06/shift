"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
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
import { haptic } from "@/lib/haptics";
import { Users, Bell, Search, X, ChevronDown, BookOpen, Check } from "lucide-react";

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
  assignedTo: string[];
}

export default function AccueilPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
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
  const [expandedResaId, setExpandedResaId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<"mine" | "all">(() => {
    if (typeof window === "undefined") return "all";
    const stored = localStorage.getItem("shift-task-filter");
    if (stored === "mine" || stored === "all") return stored;
    return "all";
  });
  function switchTaskFilter(next: "mine" | "all") {
    setTaskFilter(next);
    localStorage.setItem("shift-task-filter", next);
  }

  const shiftDate = getShiftDate();
  const shiftDay = getShiftDay();
  const dateLabel = formatDateFr(shiftDate);
  const dateLabelShort = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  const fetchData = useCallback(async () => {
    if (!profile) {
      // Profile hasn't loaded — render empty shell rather than freeze the spinner.
      setLoading(false);
      return;
    }

    // Wrap each query in a timeout+catch so one stuck/missing table
    // (not-yet-migrated, blocked by browser, network hiccup) can't freeze
    // the whole page.
    const safe = <T,>(p: PromiseLike<{ data: T | null }>): Promise<{ data: T | null }> =>
      Promise.race([
        Promise.resolve(p).then((r) => r).catch(() => ({ data: null })),
        new Promise<{ data: T | null }>((resolve) => setTimeout(() => resolve({ data: null }), 6000)),
      ]);

    try {
      const [msgRes, resaRes, taskRes, oneOffRes, compRes, profRes, alertRes, prodRes, eventRes, ritualRes] =
        await Promise.all([
          safe(supabase.from("messages").select("*").eq("date", shiftDate).order("created_at", { ascending: false })),
          safe(supabase.from("reservations").select("*").eq("date", shiftDate).order("time", { ascending: true })),
          safe(supabase.from("tasks").select("*").order("priority", { ascending: true })),
          safe(supabase.from("one_off_tasks").select("*").eq("date", shiftDate).order("priority", { ascending: true })),
          safe(supabase.from("task_completions").select("*").eq("date", shiftDate)),
          safe(supabase.from("profiles").select("id, name, role")),
          safe(supabase.from("stock_alerts").select("*").eq("acknowledged", false).order("created_at", { ascending: false })),
          safe(supabase.from("stock_products").select("id, name, category").order("name")),
          safe(supabase.from("events").select("*").eq("date", shiftDate).limit(1).maybeSingle()),
          safe(supabase.from("rituals").select("*").eq("day", shiftDay).eq("active", true).order("sort_order")),
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
      setEvent((eventRes.data as Event | null) || null);
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
        assignedTo: t.assigned_to || [],
      }));

      const oneOff: MergedTask[] = ((oneOffRes.data as OneOffTask[]) || []).map((t) => ({
        id: t.id, title: t.title, zone: ZONE_LABELS[t.zone] || t.zone,
        zoneKey: t.zone, description: t.note, completed: completedIds.has(t.id),
        moment: t.moment, isOneOff: true, isLibre: t.is_libre,
        assignedTo: t.assigned_to || [],
      }));

      const allTasks = [...recurring, ...oneOff];
      setTasks(allTasks);
    } finally {
      setLoading(false);
    }
  }, [profile, supabase, shiftDate, shiftDay]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh when the tab becomes visible again (handles overnight idle:
  // shiftDate is computed on render, so a refetch + re-render rolls the
  // UI over to the new day automatically).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") fetchData();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchData]);

  // Check for responded requests and notify staff once
  useEffect(() => {
    if (!user || profile?.role === "patron") return;

    async function checkResponses() {
      const seenRaw = localStorage.getItem("shift-seen-responses");
      const seen = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);

      const [absRes, resaRes] = await Promise.all([
        supabase.from("availability_requests").select("id, status, date")
          .eq("user_id", user!.id).in("status", ["accepted", "refused"]),
        supabase.from("reservations").select("id, name, fnf_status")
          .eq("fnf_requested_by", user!.id).in("fnf_status", ["accepted", "refused"]),
      ]);

      const newSeen = new Set(seen);
      (absRes.data || []).forEach((a) => {
        if (!seen.has(a.id)) {
          const msg = `Absence du ${a.date} ${a.status === "accepted" ? "acceptée ✓" : "refusée"}`;
          if (a.status === "accepted") toast.success(msg); else toast.error(msg);
          newSeen.add(a.id);
        }
      });
      (resaRes.data || []).forEach((r) => {
        if (!seen.has(r.id)) {
          const msg = `F&F pour ${r.name} ${r.fnf_status === "accepted" ? "accepté ✓" : "refusé"}`;
          if (r.fnf_status === "accepted") toast.success(msg); else toast.error(msg);
          newSeen.add(r.id);
        }
      });
      localStorage.setItem("shift-seen-responses", JSON.stringify([...newSeen]));
    }
    checkResponses();
  }, [user, profile?.role, supabase, toast]);

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
  // Recent signals (last 5 distinct products this user signaled, stored locally)
  const [recentSignals, setRecentSignals] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("shift-recent-signals") || "[]"); }
    catch { return []; }
  });

  async function sendStockAlert(productId: string) {
    if (!profile) return;
    const p = stockProducts.find((x) => x.id === productId);
    const { error } = await supabase.from("stock_alerts").insert({ product_id: productId, message: `${p?.name} est bas`, created_by: profile.id });
    if (error) { toast.error("Erreur, réessaie"); haptic("error"); return; }
    haptic("warning");
    toast.success(`${p?.name} signalé`);
    // Remember this product in user's recents
    setRecentSignals((prev) => {
      const next = [productId, ...prev.filter((id) => id !== productId)].slice(0, 5);
      try { localStorage.setItem("shift-recent-signals", JSON.stringify(next)); } catch {}
      return next;
    });
    setStockSearch("");
    setShowStockSignal(false);
  }

  const stockSearchResults = stockSearch.length >= 1
    ? stockProducts.filter((p) => p.name.toLowerCase().includes(stockSearch.toLowerCase())).slice(0, 8)
    : [];
  const alertedProductIds = new Set(stockAlerts.map((a) => a.product_id));

  // ── Toggle task ───────────────────────────────────────────
  async function handleToggleTask(taskId: string, completed: boolean) {
    if (!profile) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    haptic(completed ? "success" : "light");

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

  // ── Mark reservation arrived (quick action from Accueil) ─
  async function markResaArrived(resaId: string) {
    if (!profile) return;
    haptic("success");
    // Optimistic
    setReservations((prev) => prev.map((r) => r.id === resaId ? { ...r, status: "arrive", arrived_by: profile.id } : r));
    const { error } = await supabase.from("reservations").update({ status: "arrive", arrived_by: profile.id }).eq("id", resaId);
    if (error) {
      toast.error("Erreur, réessaie");
      haptic("error");
      setReservations((prev) => prev.map((r) => r.id === resaId ? { ...r, status: "attendu", arrived_by: null } : r));
      return;
    }
    const r = reservations.find((x) => x.id === resaId);
    toast.success(r ? `${r.name} · arrivée ✓` : "Arrivée confirmée");
  }

  // ── Derived ───────────────────────────────────────────────
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.completed).length;
  const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalCovers = reservations.reduce((sum, r) => sum + r.covers, 0);
  const pendingResas = reservations.filter((r) => r.status === "attendu").length;
  const activeMessages = messages.filter((m) => !dismissedMsgIds.has(m.id));

  // Imminent reservations (pending, within 45 min window or overdue)
  const nowMins = (() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  })();
  function resaToMins(t: string) {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  const imminentResas = reservations
    .filter((r) => r.status === "attendu")
    .filter((r) => {
      const rm = resaToMins(r.time);
      // Within next 45 min OR late (past arrival time by any amount)
      return rm - nowMins <= 45;
    })
    .sort((a, b) => resaToMins(a.time) - resaToMins(b.time))
    .slice(0, 3);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto" style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }}>
        <div style={{ height: 32, background: "var(--card-bg)", borderRadius: 12, marginBottom: 16, opacity: 0.5 }} />
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[1, 2, 3].map((i) => <div key={i} style={{ flex: 1, height: 72, background: "var(--card-bg)", borderRadius: 16, opacity: 0.5 }} />)}
        </div>
        <div style={{ height: 100, background: "var(--card-bg)", borderRadius: 16, opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto" style={{ paddingTop: 0, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ padding: "16px 0 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0 }}>
            Salut {profile?.name?.split(" ")[0]}
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{dateLabelShort}</p>
        </div>
        <a
          href="/guide"
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 12px", borderRadius: 10,
            background: "var(--secondary-bg)",
            textDecoration: "none",
            fontSize: 12, fontWeight: 500, color: "var(--text-secondary)",
          }}
        >
          <BookOpen size={14} /> Guide
        </a>
      </div>

      {/* ── Extra welcome banner (only for extras) ─────────── */}
      {profile?.employment_type === "extra" && (
        <a
          href="/guide"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", marginBottom: 16, borderRadius: 14,
            background: "linear-gradient(135deg, rgba(196,120,90,0.1) 0%, rgba(196,120,90,0.04) 100%)",
            border: "1px solid rgba(196,120,90,0.15)",
            textDecoration: "none",
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--gradient-primary)",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <BookOpen size={18} style={{ color: "#fff" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Nouveau ici ?</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Consulte le guide : équipe, vestiaire, plan des tables...</div>
          </div>
          <ChevronDown size={14} style={{ color: "var(--text-tertiary)", transform: "rotate(-90deg)" }} />
        </a>
      )}

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

      {/* ── Imminent arrivals (quick-tap check) ──────────────── */}
      {imminentResas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span className="section-label">Arrivées imminentes</span>
            <Link href="/reservations" style={{ fontSize: 11, color: "var(--terra-medium)", textDecoration: "none" }}>Voir tout →</Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {imminentResas.map((r) => {
              const rm = resaToMins(r.time);
              const overdue = nowMins - rm;
              const isLate = overdue > 0;
              const isExpanded = expandedResaId === r.id;
              const hasDetails = r.notes || r.phone || r.source;
              return (
                <div key={r.id} className="card-light" style={{
                  overflow: "hidden",
                  borderLeft: isLate && overdue >= 15 ? "3px solid var(--danger)" : isLate ? "3px solid var(--warning)" : "3px solid var(--terra-medium)",
                }}>
                  <div style={{ padding: "10px 12px 10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      onClick={() => hasDetails && setExpandedResaId(isExpanded ? null : r.id)}
                      disabled={!hasDetails}
                      style={{
                        flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10,
                        background: "none", border: "none", padding: 0, textAlign: "left",
                        cursor: hasDetails ? "pointer" : "default",
                      }}
                    >
                      <div style={{ minWidth: 46, fontSize: 14, fontWeight: 700, color: "#8B5A40" }}>
                        {r.time.slice(0, 5).replace(":", "h")}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {r.covers} pers.
                          {r.table_id && ` · T.${r.table_id}`}
                          {isLate && overdue >= 15 && ` · 🔔 ${overdue}min retard`}
                        </div>
                      </div>
                      {hasDetails && (
                        <ChevronDown size={14} style={{
                          color: "var(--text-tertiary)", flexShrink: 0,
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                          transition: "transform 0.2s",
                        }} />
                      )}
                    </button>
                    <button
                      onClick={() => markResaArrived(r.id)}
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        border: "2px solid #8B5A40", background: "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", padding: 0, flexShrink: 0,
                      }}
                      aria-label="Marquer arrivé"
                    >
                      <Check size={16} strokeWidth={2.5} style={{ color: "rgba(139,90,64,0.55)" }} />
                    </button>
                  </div>
                  {isExpanded && hasDetails && (
                    <div style={{
                      padding: "0 14px 12px 70px",
                      display: "flex", flexDirection: "column", gap: 6,
                      fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5,
                    }}>
                      {r.source && (
                        <div>
                          <span style={{ color: "var(--text-tertiary)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Source</span>
                          <span style={{ marginLeft: 8 }}>{r.source}</span>
                        </div>
                      )}
                      {r.phone && (
                        <div>
                          <a href={`tel:${r.phone}`} style={{ color: "var(--terra-medium)", textDecoration: "none", fontWeight: 500 }}>{r.phone}</a>
                        </div>
                      )}
                      {r.notes && (
                        <div style={{ whiteSpace: "pre-wrap" }}>{r.notes}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Stock signal modal overlay (doesn't push content) ─── */}
      {showStockSignal && (
        <div
          onClick={() => { setShowStockSignal(false); setStockSearch(""); }}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-medium"
            style={{
              position: "relative", width: "100%", maxWidth: 512, maxHeight: "80vh",
              overflowY: "auto", padding: 16, borderRadius: "20px 20px 0 0",
              animation: "fadeInUp 0.22s ease-out",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Bell size={16} style={{ color: "var(--warning)" }} />
                <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>Signaler un manque</span>
              </div>
              <button onClick={() => { setShowStockSignal(false); setStockSearch(""); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={18} style={{ color: "var(--text-tertiary)" }} />
              </button>
            </div>

            <div style={{ position: "relative", marginBottom: 12 }}>
              <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
              <input
                type="text"
                placeholder="Nom du produit..."
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                autoFocus
                style={{
                  width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
                  background: "var(--input-bg)", padding: "12px 14px 12px 36px", fontSize: 15,
                  color: "var(--text-primary)", outline: "none",
                }}
              />
            </div>

            {/* Recent signals by this user (quick access) */}
            {stockSearch.length < 2 && recentSignals.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, padding: "0 4px" }}>
                  Récents
                </div>
                {recentSignals.map((pid) => {
                  const p = stockProducts.find((sp) => sp.id === pid);
                  if (!p) return null;
                  const flagged = alertedProductIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => !flagged && sendStockAlert(p.id)}
                      disabled={flagged}
                      style={{
                        width: "100%", textAlign: "left", border: "none", cursor: flagged ? "default" : "pointer",
                        padding: "10px 12px", borderRadius: 10, marginBottom: 4,
                        background: flagged ? "transparent" : "var(--secondary-bg)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        opacity: flagged ? 0.35 : 1,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{p.name}</span>
                      {flagged
                        ? <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Déjà signalé</span>
                        : <span style={{ fontSize: 12, fontWeight: 600, color: "var(--warning)" }}>Signaler</span>
                      }
                    </button>
                  );
                })}
              </div>
            )}

            {stockSearchResults.length > 0 && (
              <div>
                {stockSearch.length >= 2 && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, padding: "0 4px" }}>
                    Résultats
                  </div>
                )}
                {stockSearchResults.map((p) => {
                  const flagged = alertedProductIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => !flagged && sendStockAlert(p.id)}
                      disabled={flagged}
                      style={{
                        width: "100%", textAlign: "left", border: "none", cursor: flagged ? "default" : "pointer",
                        padding: "12px 14px", borderRadius: 10, marginBottom: 4,
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
            )}

            {stockSearch.length >= 2 && stockSearchResults.length === 0 && (
              <div style={{ padding: "20px 12px", textAlign: "center", color: "var(--text-tertiary)", fontSize: 13 }}>
                Aucun produit trouvé pour « {stockSearch} »
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Patron: Moment progression (absorbed from Vue) ──── */}
      {profile?.role === "patron" && tasks.length > 0 && (() => {
        const momentProgress = MOMENT_ORDER.map((m) => {
          const mt = tasks.filter((t) => t.moment === m);
          const done = mt.filter((t) => t.completed).length;
          return { moment: m, done, total: mt.length, pct: mt.length > 0 ? Math.round((done / mt.length) * 100) : 0 };
        }).filter((m) => m.total > 0);

        if (momentProgress.length === 0) return null;

        return (
          <div style={{ marginBottom: 20 }}>
            <span className="section-label" style={{ display: "block", marginBottom: 10 }}>Progression</span>
            <div style={{ display: "flex", gap: 8 }}>
              {momentProgress.map((mp) => (
                <div key={mp.moment} className="card-light" style={{ flex: 1, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: mp.pct === 100 ? "var(--terra-deep)" : "var(--text-primary)" }}>{mp.pct}%</div>
                  <div style={{ height: 3, background: "var(--secondary-bg)", borderRadius: 2, margin: "6px 0", overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, width: `${mp.pct}%`, background: "var(--gradient-primary)", transition: "width 0.6s" }} />
                  </div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{MOMENT_LABELS[mp.moment]}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

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

      {/* ── Task filter toggle (mes tâches / toutes) ────────── */}
      {tasks.length > 0 && profile?.role !== "patron" && (() => {
        const mineCount = tasks.filter((t) => t.assignedTo.includes(profile?.id || "") || t.isLibre).length;
        if (mineCount === 0) return null;
        return (
          <div style={{ display: "flex", gap: 4, marginBottom: 12, background: "var(--secondary-bg)", borderRadius: 12, padding: 4 }}>
            {([
              { key: "mine" as const, label: `Mes tâches (${mineCount})` },
              { key: "all" as const, label: `Équipe (${tasks.length})` },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => switchTaskFilter(t.key)}
                style={{
                  flex: 1, borderRadius: 8, padding: "8px 0", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 500,
                  background: taskFilter === t.key ? "var(--card-bg)" : "transparent",
                  color: taskFilter === t.key ? "var(--text-primary)" : "var(--text-tertiary)",
                  boxShadow: taskFilter === t.key ? "var(--shadow-light)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        );
      })()}

      {/* ── Tasks by moment (auto-collapse finished) ────────── */}
      {MOMENT_ORDER.map((moment, idx) => {
        const momentTasks = tasks
          .filter((t) => t.moment === moment)
          .filter((t) => {
            if (taskFilter === "all" || profile?.role === "patron") return true;
            return t.assignedTo.includes(profile?.id || "") || t.isLibre;
          });
        if (momentTasks.length === 0 && moment !== "fermeture") return null;
        const done = momentTasks.filter((t) => t.completed).length;
        const allDone = momentTasks.length > 0 && done === momentTasks.length;
        // Collapse: fermeture by default, any fully-completed moment
        const collapsed = moment === "fermeture" || allDone;
        return (
          <div key={moment}>
            <MomentSection
              name={MOMENT_LABELS[moment]}
              tasks={momentTasks}
              onToggleTask={handleToggleTask}
              defaultCollapsed={collapsed}
            />
            {idx < MOMENT_ORDER.length - 1 && <div style={{ height: 20 }} />}
          </div>
        );
      })}

      <div style={{ height: 20 }} />
    </div>
  );
}
