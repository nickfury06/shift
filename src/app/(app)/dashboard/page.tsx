"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getShiftDate, getShiftDay, formatDateFr } from "@/lib/shift-utils";
import { MOMENT_ORDER, MOMENT_LABELS, scoreColor } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Task, TaskCompletion, Reservation, Schedule, ManagerMessage, Event, Debrief, Profile } from "@/lib/types";
import { Users, Calendar, UtensilsCrossed, Settings } from "lucide-react";

export default function DashboardPage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const shiftDate = getShiftDate();
  const shiftDay = getShiftDay();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile && profile.role !== "patron") {
      router.push("/ce-soir");
      return;
    }
    if (!user) return;

    async function load() {
      const [
        { data: t }, { data: c }, { data: r }, { data: s },
        { data: m }, { data: e }, { data: d }, { data: p },
      ] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("task_completions").select("*").eq("shift_date", shiftDate),
        supabase.from("reservations").select("*").eq("date", shiftDate),
        supabase.from("schedules").select("*").eq("date", shiftDate),
        supabase.from("messages").select("*").eq("date", shiftDate),
        supabase.from("events").select("*").eq("date", shiftDate).maybeSingle(),
        supabase.from("debriefs").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("profiles").select("*"),
      ]);
      setTasks(t || []); setCompletions(c || []); setReservations(r || []);
      setSchedules(s || []); setMessages(m || []); setEvent(e || null);
      setDebriefs(d || []); setAllProfiles(p || []);
      setLoading(false);
    }
    load();

    // Realtime
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_completions", filter: `shift_date=eq.${shiftDate}` }, () => {
        supabase.from("task_completions").select("*").eq("shift_date", shiftDate).then(({ data }) => { if (data) setCompletions(data); });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `date=eq.${shiftDate}` }, () => {
        supabase.from("reservations").select("*").eq("date", shiftDate).then(({ data }) => { if (data) setReservations(data); });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile, user, router, supabase, shiftDate]);

  const profileMap = useMemo(() => {
    const m: Record<string, Profile> = {};
    allProfiles.forEach((p) => { m[p.id] = p; });
    return m;
  }, [allProfiles]);

  const staffOnDuty = schedules.map((s) => profileMap[s.user_id]).filter(Boolean);
  const totalCovers = reservations.reduce((sum, r) => sum + r.covers, 0);

  const todayTasks = tasks.filter((t) => t.days.includes(shiftDay));

  // Per-moment progress
  const momentStats = MOMENT_ORDER.map((moment) => {
    const mTasks = todayTasks.filter((t) => t.moment === moment && !t.is_reminder && !t.is_libre);
    const done = mTasks.filter((t) => completions.some((c) => c.task_id === t.id)).length;
    return { moment, done, total: mTasks.length };
  });

  // Per-staff progress
  const staffStats = staffOnDuty.map((staff) => {
    const staffTasks = todayTasks.filter((t) => !t.is_reminder && (t.assigned_to.includes(staff.id) || t.is_libre));
    const staffCompletions = completions.filter((c) => c.completed_by === staff.id);
    const assignedDone = todayTasks.filter((t) => t.assigned_to.includes(staff.id) && !t.is_reminder && staffCompletions.some((c) => c.task_id === t.id)).length;
    const assignedTotal = todayTasks.filter((t) => t.assigned_to.includes(staff.id) && !t.is_reminder).length;
    const libresDone = todayTasks.filter((t) => t.is_libre && staffCompletions.some((c) => c.task_id === t.id)).length;
    const pct = assignedTotal > 0 ? Math.round((assignedDone / assignedTotal) * 100) : 0;
    return { staff, assignedDone, assignedTotal, libresDone, pct };
  });

  if (loading || !profile) {
    return <div className="p-4 max-w-lg mx-auto"><div className="h-32 bg-card rounded-lg animate-pulse" /></div>;
  }

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => router.push("/tasks")}>
            <Settings size={14} className="mr-1" /> Tâches
          </Button>
          <Button size="sm" variant="secondary" onClick={() => router.push("/staff")}>
            <Users size={14} className="mr-1" /> Staff
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6 capitalize">{formatDateFr(shiftDate)}</p>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        <div className="p-3 rounded-lg glass-card text-center">
          <p className="text-2xl font-bold text-primary">{staffOnDuty.length}</p>
          <p className="text-xs text-muted-foreground">Staff</p>
        </div>
        <div className="p-3 rounded-lg glass-card text-center">
          <p className="text-2xl font-bold text-primary">{reservations.length}</p>
          <p className="text-xs text-muted-foreground">Résas</p>
        </div>
        <div className="p-3 rounded-lg glass-card text-center">
          <p className="text-2xl font-bold text-primary">{totalCovers}</p>
          <p className="text-xs text-muted-foreground">Couverts</p>
        </div>
      </div>

      {/* Event */}
      {event && (
        <div className="mb-4 p-3 rounded-lg glass-card border border-primary/20">
          <p className="text-sm font-medium text-primary">{event.title}</p>
          {event.description && <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>}
        </div>
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <div className="mb-4 space-y-1">
          {messages.map((m) => (
            <div key={m.id} className="p-2 rounded text-sm glass-card border-l-[3px] border-l-primary">{m.content}</div>
          ))}
        </div>
      )}

      {/* Moment progress */}
      <div className="mb-6">
        <h2 className="text-sm font-medium mb-2 text-muted-foreground">Progression des tâches</h2>
        <div className="space-y-2">
          {momentStats.map(({ moment, done, total }) => {
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div key={moment} className="p-3 rounded-lg glass-card">
                <div className="flex justify-between text-sm mb-1">
                  <span>{MOMENT_LABELS[moment]}</span>
                  <span style={{ color: pct === 100 ? "var(--success)" : "var(--muted-foreground)" }}>{done}/{total}</span>
                </div>
                <Progress value={pct} className="h-1.5" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Staff progress */}
      <div className="mb-6">
        <h2 className="text-sm font-medium mb-2 text-muted-foreground">Suivi staff</h2>
        <div className="space-y-2">
          {staffStats.map(({ staff, assignedDone, assignedTotal, libresDone, pct }) => (
            <div key={staff.id} className="p-3 rounded-lg glass-card flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{ background: pct === 100 ? "var(--success)" : "var(--primary)", color: "var(--primary-foreground)" }}
              >
                {pct}%
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{staff.name}</p>
                <p className="text-xs text-muted-foreground">
                  {assignedDone}/{assignedTotal} tâches
                  {libresDone > 0 && <span className="text-primary"> +{libresDone} libres</span>}
                </p>
              </div>
              <div className="w-16">
                <Progress value={pct} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent debriefs */}
      {debriefs.length > 0 && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-medium text-muted-foreground">Derniers debriefs</h2>
            <button onClick={() => router.push("/debriefs")} className="text-xs text-primary">Voir tous</button>
          </div>
          <div className="space-y-2">
            {debriefs.map((d) => (
              <div key={d.id} className="p-3 rounded-lg glass-card">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{profileMap[d.user_id]?.name || "?"}</span>
                  <span className="font-bold" style={{ color: scoreColor(d.global_score) }}>{d.global_score}/5</span>
                </div>
                {d.suggestions && (
                  <p className="text-xs text-primary mt-1">💡 {d.suggestions}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
