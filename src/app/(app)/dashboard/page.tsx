"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, getShiftDay, formatDateFr } from "@/lib/shift-utils";
import { MOMENT_LABELS, MOMENT_ORDER } from "@/lib/constants";
import { scoreColor } from "@/lib/constants";
import type { TaskCompletion, Task, Debrief, Profile } from "@/lib/types";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { ListChecks, Users, ArrowRight, TrendingUp, CheckCircle2, Star } from "lucide-react";

export default function DashboardPage() {
  const { profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<Profile[]>([]);

  const shiftDate = getShiftDate();
  const shiftDay = getShiftDay();

  const fetchData = useCallback(async () => {
    const [taskRes, compRes, debriefRes, staffRes] = await Promise.all([
      supabase.from("tasks").select("*").order("priority", { ascending: true }),
      supabase.from("task_completions").select("*").eq("date", shiftDate),
      supabase
        .from("debriefs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("profiles")
        .select("*")
        .in("role", ["staff", "responsable"]),
    ]);

    // Filter tasks client-side for today's day (PG array filter doesn't work)
    const allTasks = (taskRes.data as Task[]) || [];
    setTasks(allTasks.filter((t) => t.days && t.days.includes(shiftDay)));
    setCompletions((compRes.data as TaskCompletion[]) || []);
    setDebriefs((debriefRes.data as Debrief[]) || []);
    setStaffProfiles((staffRes.data as Profile[]) || []);
    setLoading(false);
  }, [supabase, shiftDate, shiftDay]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime: sync task completions + tasks changes
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_completions", filter: `date=eq.${shiftDate}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debriefs" },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, shiftDate, fetchData]);

  // Guard: patron only
  if (profile && profile.role !== "patron") {
    return (
      <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div className="card-medium" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Acces reserve au patron</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-light" style={{ height: 40, width: "75%", borderRadius: 8, opacity: 0.5 }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-light" style={{ height: 96, borderRadius: 8, opacity: 0.5 }} />
            ))}
          </div>
          <div className="card-light" style={{ height: 160, borderRadius: 8, opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const completedIds = new Set(completions.map((c) => c.task_id));
  const doneTasks = tasks.filter((t) => completedIds.has(t.id)).length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const avgScore =
    debriefs.length > 0
      ? (debriefs.reduce((s, d) => s + d.global_rating, 0) / debriefs.length).toFixed(1)
      : "--";

  // Moment progress
  const momentProgress = MOMENT_ORDER.map((m) => {
    const momentTasks = tasks.filter((t) => t.moment === m);
    const done = momentTasks.filter((t) => completedIds.has(t.id)).length;
    const total = momentTasks.length;
    return { moment: m, done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  // Staff progress
  const staffProgress = staffProfiles.map((sp) => {
    const userCompletions = completions.filter((c) => c.user_id === sp.id).length;
    return { name: sp.name, count: userCompletions };
  });

  return (
    <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Dashboard</h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>{formatDateFr(shiftDate)}</p>
          </div>
          <ThemeToggle />
        </div>

        {/* 3 stat cards */}
        <div>
          <p className="section-label" style={{ marginBottom: 8 }}>Statistiques</p>
          <div className="stagger" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div className="card-medium" style={{ padding: 16, textAlign: "center" }}>
              <CheckCircle2 size={20} style={{ margin: "0 auto 8px", color: "var(--terra-deep)" }} />
              <p style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)" }}>{completionRate}%</p>
              <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Completion</p>
            </div>
            <div className="card-medium" style={{ padding: 16, textAlign: "center" }}>
              <TrendingUp size={20} style={{ margin: "0 auto 8px", color: "var(--terra-deep)" }} />
              <p style={{ fontSize: 24, fontWeight: 600, color: "var(--text-primary)" }}>{doneTasks}/{totalTasks}</p>
              <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Taches</p>
            </div>
            <div className="card-medium" style={{ padding: 16, textAlign: "center" }}>
              <Star size={20} style={{ margin: "0 auto 8px", color: "var(--terra-deep)" }} />
              <p style={{ fontSize: 24, fontWeight: 600, color: typeof avgScore === "string" && avgScore !== "--" ? scoreColor(parseFloat(avgScore)) : "var(--text-primary)" }}>
                {avgScore}
              </p>
              <p style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Score moyen</p>
            </div>
          </div>
        </div>

        {/* Moment progress */}
        <div>
          <p className="section-label" style={{ marginBottom: 8 }}>Progression par moment</p>
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {momentProgress.map((mp) => (
              <div key={mp.moment} className="card-light" style={{ padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{MOMENT_LABELS[mp.moment]}</span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{mp.done}/{mp.total}</span>
                </div>
                <div style={{ height: 6, width: "100%", overflow: "hidden", borderRadius: 999, background: "var(--secondary-bg)" }}>
                  <div
                    style={{
                      height: "100%",
                      borderRadius: 999,
                      transition: "all 500ms",
                      width: `${mp.pct}%`,
                      background: "var(--gradient-primary)",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff progress */}
        {staffProgress.length > 0 && (
          <div>
            <p className="section-label" style={{ marginBottom: 8 }}>Equipe ce soir</p>
            <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {staffProgress.map((sp) => (
                <div key={sp.name} className="card-light" style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{sp.name}</span>
                  <span className="pill-count">{sp.count} tache{sp.count !== 1 ? "s" : ""}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent debriefs */}
        {debriefs.length > 0 && (
          <div>
            <p className="section-label" style={{ marginBottom: 8 }}>Derniers debriefs</p>
            <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {debriefs.slice(0, 5).map((d) => (
                <div key={d.id} className="card-light" style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                      {staffProfiles.find((s) => s.id === d.user_id)?.name || "Staff"}
                    </span>
                    {d.suggestions && (
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.suggestions}</p>
                    )}
                  </div>
                  <span
                    style={{ fontSize: 18, fontWeight: 600, marginLeft: 16, color: scoreColor(d.global_rating) }}
                  >
                    {d.global_rating}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="stagger" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Link href="/tasks" className="card-medium" style={{ padding: 16, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <ListChecks size={18} style={{ color: "var(--terra-deep)" }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Gerer les taches</span>
            <ArrowRight size={14} style={{ marginLeft: "auto", color: "var(--text-tertiary)" }} />
          </Link>
          <Link href="/staff" className="card-medium" style={{ padding: 16, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
            <Users size={18} style={{ color: "var(--terra-deep)" }} />
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Equipe</span>
            <ArrowRight size={14} style={{ marginLeft: "auto", color: "var(--text-tertiary)" }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
