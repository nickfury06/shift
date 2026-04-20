"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { Debrief, Reservation, TaskCompletion, Task } from "@/lib/types";
import { TrendingUp, Star, Users, AlertTriangle } from "lucide-react";

const RATING_COLORS = ["", "#D44", "#D88", "#B89070", "#8B6A50", "#6B4A30"];
const DAYS_FR = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Period = 7 | 30 | 90;

export default function AnalyticsPage() {
  const { profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(30);
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  const fetchData = useCallback(async () => {
    const start = new Date();
    start.setDate(start.getDate() - period);
    const startStr = start.toISOString().split("T")[0];

    const [debRes, resRes, compRes, taskRes] = await Promise.all([
      supabase.from("debriefs").select("*").gte("date", startStr).order("date"),
      supabase.from("reservations").select("*").gte("date", startStr).order("date"),
      supabase.from("task_completions").select("*").gte("date", startStr),
      supabase.from("tasks").select("*"),
    ]);
    setDebriefs((debRes.data as Debrief[]) || []);
    setReservations((resRes.data as Reservation[]) || []);
    setCompletions((compRes.data as TaskCompletion[]) || []);
    setTasks((taskRes.data as Task[]) || []);
    setLoading(false);
  }, [supabase, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
        {[1, 2, 3].map((i) => <div key={i} className="card-light pulse" style={{ height: 80, borderRadius: 16, marginBottom: 10 }} />)}
      </div>
    );
  }

  // Compute metrics
  const avgRating = debriefs.length > 0 ? debriefs.reduce((s, d) => s + d.global_rating, 0) / debriefs.length : 0;
  const avgService = debriefs.length > 0 ? debriefs.reduce((s, d) => s + d.service_rating, 0) / debriefs.length : 0;
  const avgTeam = debriefs.length > 0 ? debriefs.reduce((s, d) => s + d.team_rating, 0) / debriefs.length : 0;
  const incidentCount = debriefs.filter((d) => d.incidents).length;

  const totalCovers = reservations.reduce((sum, r) => sum + r.covers, 0);
  const avgCoversPerDay = period > 0 ? totalCovers / period : 0;

  // Busy days breakdown
  const daysBreakdown: Record<number, { covers: number; count: number }> = {};
  reservations.forEach((r) => {
    const d = new Date(r.date).getDay();
    if (!daysBreakdown[d]) daysBreakdown[d] = { covers: 0, count: 0 };
    daysBreakdown[d].covers += r.covers;
    daysBreakdown[d].count += 1;
  });
  const maxCovers = Math.max(1, ...Object.values(daysBreakdown).map((d) => d.covers));

  // Affluence distribution
  const affluenceCount: Record<string, number> = { calme: 0, normal: 0, charge: 0, rush: 0 };
  debriefs.forEach((d) => { affluenceCount[d.affluence] = (affluenceCount[d.affluence] || 0) + 1; });
  const totalAff = Object.values(affluenceCount).reduce((s, v) => s + v, 0);

  // Task completion trend (by date)
  const dateCompletions: Record<string, { done: number; total: number }> = {};
  reservations.forEach((r) => {
    if (!dateCompletions[r.date]) dateCompletions[r.date] = { done: 0, total: 0 };
  });
  // Using tasks.length per day as total
  Object.keys(dateCompletions).forEach((date) => {
    const dayOfWeek = new Date(date).getDay();
    const dayName = ["dimanche","lundi","mardi","mercredi","jeudi","vendredi","samedi"][dayOfWeek];
    const dayTasks = tasks.filter((t) => t.days.includes(dayName as never));
    dateCompletions[date].total = dayTasks.length;
    dateCompletions[date].done = completions.filter((c) => c.date === date).length;
  });

  // Ratings over time (7 buckets)
  const buckets: { label: string; ratings: number[]; date: string }[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * Math.ceil(period / 7));
    const iso = d.toISOString().split("T")[0];
    buckets.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, ratings: [], date: iso });
  }
  debriefs.forEach((d) => {
    const bucket = buckets.find((b, i) => {
      const next = buckets[i + 1];
      return d.date >= b.date && (!next || d.date < next.date);
    });
    if (bucket) bucket.ratings.push(d.global_rating);
  });

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Analytics
        </h1>
        <div style={{ display: "flex", gap: 4, background: "var(--secondary-bg)", borderRadius: 10, padding: 3 }}>
          {([7, 30, 90] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 500,
                background: period === p ? "var(--card-bg)" : "transparent",
                color: period === p ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: period === p ? "var(--shadow-light)" : "none",
                transition: "all 0.2s",
              }}
            >{p}j</button>
          ))}
        </div>
      </div>

      {/* Top KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 24 }}>
        <div className="card-medium" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Star size={13} style={{ color: "var(--terra-medium)" }} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Note moyenne</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: avgRating > 0 ? RATING_COLORS[Math.round(avgRating)] : "var(--text-tertiary)" }}>
            {avgRating > 0 ? avgRating.toFixed(1) : "—"}<span style={{ fontSize: 14, color: "var(--text-tertiary)" }}>/5</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            {debriefs.length} debrief{debriefs.length > 1 ? "s" : ""}
          </div>
        </div>

        <div className="card-medium" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Users size={13} style={{ color: "var(--terra-medium)" }} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Couverts</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)" }}>
            {totalCovers}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            ~{avgCoversPerDay.toFixed(0)}/jour
          </div>
        </div>

        <div className="card-medium" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <TrendingUp size={13} style={{ color: "var(--terra-medium)" }} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Service</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: avgService > 0 ? RATING_COLORS[Math.round(avgService)] : "var(--text-tertiary)" }}>
            {avgService > 0 ? avgService.toFixed(1) : "—"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            Équipe: <b style={{ color: avgTeam > 0 ? RATING_COLORS[Math.round(avgTeam)] : "var(--text-tertiary)" }}>{avgTeam > 0 ? avgTeam.toFixed(1) : "—"}</b>
          </div>
        </div>

        <div className="card-medium" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <AlertTriangle size={13} style={{ color: incidentCount > 0 ? "var(--warning)" : "var(--text-tertiary)" }} />
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Incidents</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: incidentCount > 0 ? "var(--warning)" : "var(--text-primary)" }}>
            {incidentCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
            Signalés en debrief
          </div>
        </div>
      </div>

      {/* Ratings trend */}
      {debriefs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="section-label" style={{ marginBottom: 10 }}>Tendance des notes</p>
          <div className="card-light" style={{ padding: 16 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginBottom: 8 }}>
              {buckets.map((b) => {
                const avg = b.ratings.length > 0 ? b.ratings.reduce((s, v) => s + v, 0) / b.ratings.length : 0;
                const height = avg > 0 ? (avg / 5) * 100 : 0;
                return (
                  <div key={b.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <div style={{
                      width: "100%", height: `${height}%`, minHeight: avg > 0 ? 4 : 0,
                      background: avg > 0 ? RATING_COLORS[Math.round(avg)] : "var(--secondary-bg)",
                      borderRadius: 4, transition: "height 0.6s",
                    }} />
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{b.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Busy days */}
      {Object.keys(daysBreakdown).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="section-label" style={{ marginBottom: 10 }}>Jours les plus chargés</p>
          <div className="card-light" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
            {[2, 3, 4, 5, 6].map((d) => {
              const data = daysBreakdown[d] || { covers: 0, count: 0 };
              const pct = (data.covers / maxCovers) * 100;
              return (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", minWidth: 32 }}>{DAYS_FR[d]}</span>
                  <div style={{ flex: 1, height: 12, background: "var(--secondary-bg)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 6, width: `${pct}%`,
                      background: "var(--gradient-primary)",
                      transition: "width 0.6s",
                    }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", minWidth: 50, textAlign: "right" }}>
                    {data.covers}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Affluence distribution */}
      {totalAff > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p className="section-label" style={{ marginBottom: 10 }}>Répartition affluence</p>
          <div className="card-light" style={{ padding: 16 }}>
            <div style={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
              {(["calme","normal","charge","rush"] as const).map((k, i) => {
                const pct = (affluenceCount[k] / totalAff) * 100;
                const colors = ["#B5B0A8","#8A857E","#C4785A","#8B5A40"];
                return pct > 0 ? <div key={k} style={{ width: `${pct}%`, background: colors[i] }} /> : null;
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11 }}>
              {(["calme","normal","charge","rush"] as const).map((k, i) => {
                const colors = ["#B5B0A8","#8A857E","#C4785A","#8B5A40"];
                const labels = { calme: "Calme", normal: "Normal", charge: "Chargé", rush: "Rush" };
                return (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: colors[i] }} />
                    <span style={{ color: "var(--text-secondary)" }}>{labels[k]}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>{affluenceCount[k]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {debriefs.length === 0 && reservations.length === 0 && (
        <div className="card-light" style={{ padding: 32, textAlign: "center" }}>
          <TrendingUp size={28} style={{ color: "var(--text-tertiary)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Pas encore assez de données</p>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
            Les tendances apparaîtront au fur et à mesure
          </p>
        </div>
      )}

      <div style={{ height: 20 }} />
    </div>
  );
}
