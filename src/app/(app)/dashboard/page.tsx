"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, getShiftDay, formatDateFr } from "@/lib/shift-utils";
import { MOMENT_LABELS, MOMENT_ORDER } from "@/lib/constants";
import type { TaskCompletion, Task, Debrief, Profile, Reservation, StockAlert } from "@/lib/types";

const RATING_COLORS = ["", "#D44", "#D88", "#B89070", "#8B6A50", "#6B4A30"];

export default function DashboardPage() {
  const { profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);

  const shiftDate = getShiftDate();
  const shiftDay = getShiftDay();

  const fetchData = useCallback(async () => {
    const [taskRes, compRes, debriefRes, staffRes, resaRes, alertRes] = await Promise.all([
      supabase.from("tasks").select("*").order("priority", { ascending: true }),
      supabase.from("task_completions").select("*").eq("date", shiftDate),
      supabase.from("debriefs").select("*").eq("date", shiftDate).order("created_at"),
      supabase.from("profiles").select("*").in("role", ["staff", "responsable"]),
      supabase.from("reservations").select("*").eq("date", shiftDate),
      supabase.from("stock_alerts").select("*").eq("acknowledged", false),
    ]);

    const allTasks = (taskRes.data as Task[]) || [];
    setTasks(allTasks.filter((t) => t.days && t.days.includes(shiftDay)));
    setCompletions((compRes.data as TaskCompletion[]) || []);
    setDebriefs((debriefRes.data as Debrief[]) || []);
    setStaffProfiles((staffRes.data as Profile[]) || []);
    setReservations((resaRes.data as Reservation[]) || []);
    setStockAlerts((alertRes.data as StockAlert[]) || []);
    setLoading(false);
  }, [supabase, shiftDate, shiftDay]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel("dashboard-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_completions", filter: `date=eq.${shiftDate}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "debriefs" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `date=eq.${shiftDate}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_alerts" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, shiftDate, fetchData]);

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
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} style={{ flex: 1, height: 72, background: "var(--card-bg)", borderRadius: 16, opacity: 0.5 }} />)}
        </div>
        {[1, 2].map((i) => <div key={i} style={{ height: 80, background: "var(--card-bg)", borderRadius: 16, marginBottom: 10, opacity: 0.5 }} />)}
      </div>
    );
  }

  const completedIds = new Set(completions.map((c) => c.task_id));
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => completedIds.has(t.id)).length;
  const taskPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalCovers = reservations.reduce((sum, r) => sum + r.covers, 0);
  const arrivedResas = reservations.filter((r) => r.status === "arrive").length;

  const avgDebrief = debriefs.length > 0
    ? (debriefs.reduce((s, d) => s + d.global_rating, 0) / debriefs.length)
    : 0;

  // Staff progress with assigned tasks
  const staffProgress = staffProfiles.map((sp) => {
    const assigned = tasks.filter((t) => !t.is_libre && t.assigned_to.includes(sp.id));
    const done = assigned.filter((t) => completedIds.has(t.id)).length;
    return { id: sp.id, name: sp.name, total: assigned.length, done };
  }).filter((s) => s.total > 0);

  // Moment progress
  const momentProgress = MOMENT_ORDER.map((m) => {
    const mt = tasks.filter((t) => t.moment === m);
    const done = mt.filter((t) => completedIds.has(t.id)).length;
    return { moment: m, done, total: mt.length, pct: mt.length > 0 ? Math.round((done / mt.length) * 100) : 0 };
  });

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Vue d&apos;ensemble</h1>
        <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>{formatDateFr(shiftDate)}</p>
      </div>

      {/* ── KPIs ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
        <div className="card-medium" style={{ padding: "16px" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{taskPct}%</div>
          <div style={{ height: 4, background: "var(--secondary-bg)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 2, width: `${taskPct}%`, background: taskPct === 100 ? "var(--terra-deep)" : "var(--gradient-primary)", transition: "width 0.6s" }} />
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 6 }}>{doneTasks}/{totalTasks} tâches</p>
        </div>

        <div className="card-medium" style={{ padding: "16px" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)" }}>{reservations.length}</div>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
            {totalCovers} couverts · {arrivedResas} arrivés
          </p>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>Réservations</p>
        </div>

        <div className="card-medium" style={{ padding: "16px" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: avgDebrief > 0 ? RATING_COLORS[Math.round(avgDebrief)] : "var(--text-tertiary)" }}>
            {avgDebrief > 0 ? avgDebrief.toFixed(1) : "—"}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
            {debriefs.length > 0 ? `${debriefs.length} debrief${debriefs.length > 1 ? "s" : ""}` : "Pas encore de debrief"}
          </p>
        </div>

        <div className="card-medium" style={{ padding: "16px" }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: stockAlerts.length > 0 ? "var(--warning)" : "var(--text-primary)" }}>
            {stockAlerts.length}
          </div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>
            Alertes stock
          </p>
        </div>
      </div>

      {/* ── Progression par moment ────────────────────────── */}
      <div style={{ marginBottom: 20 }}>
        <p className="section-label" style={{ marginBottom: 10 }}>Progression</p>
        <div style={{ display: "flex", gap: 8 }}>
          {momentProgress.map((mp) => (
            <div key={mp.moment} className="card-light" style={{ flex: 1, padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: mp.pct === 100 ? "var(--terra-deep)" : "var(--text-primary)" }}>{mp.pct}%</div>
              <div style={{ height: 3, background: "var(--secondary-bg)", borderRadius: 2, margin: "6px 0", overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 2, width: `${mp.pct}%`, background: "var(--gradient-primary)", transition: "width 0.6s" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{MOMENT_LABELS[mp.moment]}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Équipe ───────────────────────────────────────── */}
      {staffProgress.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p className="section-label" style={{ marginBottom: 10 }}>Équipe</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {staffProgress.map((sp) => {
              const pct = sp.total > 0 ? Math.round((sp.done / sp.total) * 100) : 0;
              return (
                <div key={sp.id} className="card-light" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>{sp.name}</span>
                  <div style={{ width: 60, height: 4, background: "var(--secondary-bg)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", borderRadius: 2, width: `${pct}%`, background: pct === 100 ? "var(--terra-deep)" : "var(--gradient-primary)", transition: "width 0.6s" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", minWidth: 36, textAlign: "right" }}>{sp.done}/{sp.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Debriefs du soir ──────────────────────────────── */}
      {debriefs.length > 0 && (
        <div>
          <p className="section-label" style={{ marginBottom: 10 }}>Debriefs</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {debriefs.map((d) => {
              const name = staffProfiles.find((s) => s.id === d.user_id)?.name || "Staff";
              return (
                <div key={d.id} className="card-light" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", flex: 1 }}>{name}</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: RATING_COLORS[d.global_rating] }}>{d.global_rating}/5</span>
                  {d.incidents && <span style={{ fontSize: 11, color: "var(--warning)" }}>⚠️</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}
