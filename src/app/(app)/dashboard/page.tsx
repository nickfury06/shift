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
      supabase.from("tasks").select("*").eq("day", shiftDay),
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

    setTasks((taskRes.data as Task[]) || []);
    setCompletions((compRes.data as TaskCompletion[]) || []);
    setDebriefs((debriefRes.data as Debrief[]) || []);
    setStaffProfiles((staffRes.data as Profile[]) || []);
    setLoading(false);
  }, [supabase, shiftDate, shiftDay]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Guard: patron only
  if (profile && profile.role !== "patron") {
    return (
      <div className="p-4 pb-28 max-w-lg mx-auto">
        <div className="glass-card p-6 text-center">
          <p className="text-muted-foreground">Acces reserve au patron</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 pb-28 max-w-lg mx-auto space-y-4">
        <div className="bg-card rounded-lg animate-pulse h-10 w-3/4" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-lg animate-pulse h-24" />
          ))}
        </div>
        <div className="bg-card rounded-lg animate-pulse h-40" />
      </div>
    );
  }

  const totalTasks = tasks.length;
  const completedIds = new Set(completions.map((c) => c.task_id));
  const doneTasks = tasks.filter((t) => completedIds.has(t.id)).length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const avgScore =
    debriefs.length > 0
      ? (debriefs.reduce((s, d) => s + d.score, 0) / debriefs.length).toFixed(1)
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
    <div className="p-4 pb-28 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">{formatDateFr(shiftDate)}</p>
        </div>
        <ThemeToggle />
      </div>

      {/* 3 stat cards */}
      <div className="grid grid-cols-3 gap-2 stagger-children">
        <div className="glass-card p-3 text-center">
          <CheckCircle2 size={20} className="mx-auto text-success mb-1" />
          <p className="text-2xl font-semibold">{completionRate}%</p>
          <p className="text-[10px] text-muted-foreground">Completion</p>
        </div>
        <div className="glass-card p-3 text-center">
          <TrendingUp size={20} className="mx-auto text-primary mb-1" />
          <p className="text-2xl font-semibold">{doneTasks}/{totalTasks}</p>
          <p className="text-[10px] text-muted-foreground">Taches</p>
        </div>
        <div className="glass-card p-3 text-center">
          <Star size={20} className="mx-auto text-warning mb-1" />
          <p className="text-2xl font-semibold" style={{ color: typeof avgScore === "string" && avgScore !== "--" ? scoreColor(parseFloat(avgScore)) : undefined }}>
            {avgScore}
          </p>
          <p className="text-[10px] text-muted-foreground">Score moyen</p>
        </div>
      </div>

      {/* Moment progress */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold tracking-tight">Progression par moment</h2>
        <div className="space-y-2 stagger-children">
          {momentProgress.map((mp) => (
            <div key={mp.moment} className="glass-card p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{MOMENT_LABELS[mp.moment]}</span>
                <span className="text-xs text-muted-foreground">{mp.done}/{mp.total}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
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
        <div className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">Equipe ce soir</h2>
          <div className="space-y-2 stagger-children">
            {staffProgress.map((sp) => (
              <div key={sp.name} className="glass-card p-3 flex items-center justify-between">
                <span className="text-sm font-medium">{sp.name}</span>
                <span className="pill">{sp.count} tache{sp.count !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent debriefs */}
      {debriefs.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold tracking-tight">Derniers debriefs</h2>
          <div className="space-y-2 stagger-children">
            {debriefs.slice(0, 5).map((d) => (
              <div key={d.id} className="glass-card p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium capitalize">{d.category}</span>
                  {d.comment && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{d.comment}</p>
                  )}
                </div>
                <span
                  className="text-lg font-semibold ml-3"
                  style={{ color: scoreColor(d.score) }}
                >
                  {d.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-2 stagger-children">
        <Link href="/tasks" className="glass-card glass-card-hover p-4 flex items-center gap-2">
          <ListChecks size={18} className="text-primary" />
          <span className="text-sm font-medium">Gerer les taches</span>
          <ArrowRight size={14} className="ml-auto text-muted-foreground" />
        </Link>
        <Link href="/staff" className="glass-card glass-card-hover p-4 flex items-center gap-2">
          <Users size={18} className="text-primary" />
          <span className="text-sm font-medium">Equipe</span>
          <ArrowRight size={14} className="ml-auto text-muted-foreground" />
        </Link>
      </div>
    </div>
  );
}
