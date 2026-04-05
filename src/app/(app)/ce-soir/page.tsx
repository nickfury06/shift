"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, getShiftDay, getGreeting, formatDateFr, formatTime } from "@/lib/shift-utils";
import { MOMENT_ORDER } from "@/lib/constants";
import type { Task, OneOffTask, TaskCompletion, Reservation, ManagerMessage, Schedule, Event, Moment, Debrief } from "@/lib/types";
import MessageBanner from "@/components/MessageBanner";
import MomentSection from "@/components/MomentSection";
import TaskCard from "@/components/TaskCard";
import { Check, Trash2, TrendingUp } from "lucide-react";
import { SEATING_ICONS, TYPE_LABELS, SOURCE_ICONS, DEBRIEF_CATEGORIES, scoreColor } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

export default function CeSoirPage() {
  const { profile, user } = useAuth();
  const supabase = createClient();
  const shiftDate = getShiftDate();
  const shiftDay = getShiftDay();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [oneOffTasks, setOneOffTasks] = useState<OneOffTask[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [mySchedule, setMySchedule] = useState<Schedule | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [recentDebriefs, setRecentDebriefs] = useState<Debrief[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch all data
  useEffect(() => {
    if (!user || !profile) return;

    async function fetchData() {
      const [
        { data: tasksData },
        { data: oneOffData },
        { data: completionsData },
        { data: resData },
        { data: msgData },
        { data: scheduleData },
        { data: eventData },
        { data: profilesData },
      ] = await Promise.all([
        supabase.from("tasks").select("*"),
        supabase.from("one_off_tasks").select("*").eq("date", shiftDate),
        supabase.from("task_completions").select("*").eq("shift_date", shiftDate),
        supabase.from("reservations").select("*").eq("date", shiftDate),
        supabase.from("messages").select("*").eq("date", shiftDate),
        supabase.from("schedules").select("*").eq("user_id", user!.id).eq("date", shiftDate).maybeSingle(),
        supabase.from("events").select("*").eq("date", shiftDate).maybeSingle(),
        supabase.from("profiles").select("id, name"),
      ]);

      setTasks(tasksData || []);
      setOneOffTasks(oneOffData || []);
      setCompletions(completionsData || []);
      setReservations(resData || []);
      setMessages(msgData || []);
      setMySchedule(scheduleData || null);
      setEvent(eventData || null);

      // Load recent debriefs for responsable/patron
      if (profile?.role === "responsable" || profile?.role === "patron") {
        const { data: debData } = await supabase
          .from("debriefs")
          .select("*")
          .order("date", { ascending: false })
          .limit(5);
        setRecentDebriefs(debData || []);
      }

      const profileMap: Record<string, string> = {};
      profilesData?.forEach((p: { id: string; name: string }) => {
        profileMap[p.id] = p.name;
      });
      setProfiles(profileMap);
      setLoading(false);
    }

    fetchData();
  }, [user, profile, shiftDate, supabase]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("ce-soir-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_completions", filter: `shift_date=eq.${shiftDate}` }, () => {
        supabase.from("task_completions").select("*").eq("shift_date", shiftDate).then(({ data }) => {
          if (data) setCompletions(data);
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `date=eq.${shiftDate}` }, () => {
        supabase.from("reservations").select("*").eq("date", shiftDate).then(({ data }) => {
          if (data) setReservations(data);
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `date=eq.${shiftDate}` }, () => {
        supabase.from("messages").select("*").eq("date", shiftDate).then(({ data }) => {
          if (data) setMessages(data);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, shiftDate]);

  // Filter tasks for current user and day
  const myTasks = useMemo(() => {
    const recurring = tasks.filter((t) => {
      if (!t.days.includes(shiftDay)) return false;
      if (t.is_libre) return true; // tâches libres visible to all
      if (profile?.role === "patron") return true;
      return t.assigned_to.includes(user?.id || "");
    });
    const oneOff = oneOffTasks.filter((t) => {
      if (t.is_libre) return true;
      if (profile?.role === "patron") return true;
      return t.assigned_to.includes(user?.id || "");
    });
    return [...recurring, ...oneOff];
  }, [tasks, oneOffTasks, shiftDay, profile, user]);

  // Completed task IDs for current user
  const completedTaskIds = useMemo(() => {
    const ids = new Set<string>();
    completions.forEach((c) => {
      if (c.completed_by === user?.id) ids.add(c.task_id);
    });
    return ids;
  }, [completions, user]);

  // Check if ouverture is complete (for moment locking)
  const ouvertureProgress = useMemo(() => {
    const ouvertureTasks = myTasks.filter((t) => t.moment === "ouverture" && !t.is_reminder);
    const done = ouvertureTasks.filter((t) => completedTaskIds.has(t.id)).length;
    return { done, total: ouvertureTasks.length, complete: ouvertureTasks.length === 0 || done === ouvertureTasks.length };
  }, [myTasks, completedTaskIds]);
  const ouvertureComplete = ouvertureProgress.complete;

  // Toggle task completion
  const handleToggle = useCallback(async (taskId: string, moment: Moment) => {
    if (!user) return;

    const existing = completions.find(
      (c) => c.task_id === taskId && c.completed_by === user.id
    );

    if (existing) {
      // Optimistic update
      setCompletions((prev) => prev.filter((c) => c.id !== existing.id));
      const { error } = await supabase.from("task_completions").delete().eq("id", existing.id);
      if (error) {
        // Revert
        setCompletions((prev) => [...prev, existing]);
      }
    } else {
      const taskType = tasks.find((t) => t.id === taskId) ? "recurring" : "one_off";
      const newCompletion = {
        task_id: taskId,
        task_type: taskType,
        shift_date: shiftDate,
        completed_by: user.id,
        moment,
      };

      // Optimistic update
      const tempId = crypto.randomUUID();
      setCompletions((prev) => [...prev, { ...newCompletion, id: tempId, completed_at: new Date().toISOString() } as TaskCompletion]);

      const { data, error } = await supabase.from("task_completions").insert(newCompletion).select().single();
      if (error) {
        setCompletions((prev) => prev.filter((c) => c.id !== tempId));
      } else if (data) {
        setCompletions((prev) => prev.map((c) => (c.id === tempId ? data : c)));
      }
    }
  }, [user, completions, tasks, shiftDate, supabase]);

  // Reservation actions with feedback
  const [busyResaId, setBusyResaId] = useState<string | null>(null);

  async function markArrived(id: string) {
    setBusyResaId(id);
    const { data } = await supabase.from("reservations").update({
      status: "arrive", arrived_by: user?.id,
    }).eq("id", id).select().single();
    if (data) setReservations((prev) => prev.map((r) => r.id === id ? data : r));
    setBusyResaId(null);
  }

  async function markAttendu(id: string) {
    setBusyResaId(id);
    const { data } = await supabase.from("reservations").update({
      status: "attendu", arrived_by: null,
    }).eq("id", id).select().single();
    if (data) setReservations((prev) => prev.map((r) => r.id === id ? data : r));
    setBusyResaId(null);
  }

  async function deleteReservation(id: string) {
    setBusyResaId(id);
    await supabase.from("reservations").delete().eq("id", id);
    setReservations((prev) => prev.filter((r) => r.id !== id));
    setBusyResaId(null);
  }

  function getOverdueMin(r: Reservation): number {
    if (r.status !== "attendu") return 0;
    const now = new Date();
    const [h, m] = r.time.split(":").map(Number);
    const resTime = new Date();
    resTime.setHours(h, m, 0);
    const diff = Math.floor((now.getTime() - resTime.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  }

  // Reservation summary
  const totalResas = reservations.length;
  const totalCovers = reservations.reduce((sum, r) => sum + r.covers, 0);
  const sortedResas = useMemo(() =>
    [...reservations].sort((a, b) => a.time.localeCompare(b.time)),
    [reservations]
  );
  const attenduResas = sortedResas.filter((r) => r.status === "attendu");
  const arriveResas = sortedResas.filter((r) => r.status === "arrive");

  // Group tasks by moment + separate tâches libres
  const tasksByMoment = useMemo(() => {
    const grouped: Record<string, (Task | OneOffTask)[]> = {};
    MOMENT_ORDER.forEach((m) => {
      grouped[m] = myTasks.filter((t) => t.moment === m && !t.is_libre);
    });
    return grouped;
  }, [myTasks]);

  const tachesLibres = useMemo(() => myTasks.filter((t) => t.is_libre), [myTasks]);

  if (loading || !profile) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-card animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)" }}>
          {getGreeting()} {profile.name}
        </h1>
        <p className="text-sm text-muted-foreground capitalize">
          {formatDateFr(shiftDate)}
        </p>
        {mySchedule && (
          <p className="text-sm mt-0.5">
            {formatTime(mySchedule.start_time)} → {formatTime(mySchedule.end_time)}
          </p>
        )}
      </div>

      {/* Manager messages */}
      {messages.length > 0 && (
        <div className="mb-6 space-y-2">
          {messages.map((m) => (
            <MessageBanner
              key={m.id}
              message={m}
              authorName={profiles[m.created_by]}
            />
          ))}
        </div>
      )}

      {/* Tonight's event */}
      {event && (
        <div className="mb-6 p-3 rounded-lg bg-card border border-primary/20">
          <p className="text-sm font-medium text-primary">{event.title}</p>
          {event.description && (
            <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
          )}
        </div>
      )}

      {/* Reservations */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">Réservations</h2>
          <span className="text-sm font-bold text-primary">
            {totalResas > 0 ? `${totalResas} résas · ${totalCovers} couverts` : "Aucune résa"}
          </span>
        </div>

        {attenduResas.length > 0 && (
          <div className="space-y-2 mb-3">
            {attenduResas.map((r) => {
              const overdue = getOverdueMin(r);
              return (
                <div key={r.id} className={`p-3 rounded-lg bg-card ${overdue >= 30 ? "border-l-[3px] border-l-destructive" : overdue >= 15 ? "border-l-[3px] border-l-warning" : ""}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{r.name}</span>
                        <span className="text-xs text-primary">{r.covers}p</span>
                        <span className="text-xs">{SEATING_ICONS[r.seating]}</span>
                        <Badge variant="secondary" className="text-xs">{TYPE_LABELS[r.type]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatTime(r.time)}</p>
                      {r.notes && <p className="text-xs text-primary mt-0.5">{r.notes}</p>}
                      {overdue >= 15 && (
                        <p className="text-xs mt-1" style={{ color: overdue >= 30 ? "var(--destructive)" : "var(--warning)" }}>
                          En retard — {overdue} min
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => markArrived(r.id)} disabled={busyResaId === r.id} className="p-2.5 rounded hover:bg-secondary disabled:opacity-40" title="Arrivé">
                        {busyResaId === r.id ? <span className="text-xs">...</span> : <Check size={18} className="text-success" />}
                      </button>
                      <button onClick={() => deleteReservation(r.id)} disabled={busyResaId === r.id} className="p-2.5 rounded hover:bg-secondary disabled:opacity-40" title="Supprimer">
                        <Trash2 size={18} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {arriveResas.length > 0 && (
          <div className="space-y-1">
            {arriveResas.map((r) => (
              <div key={r.id} className="p-2 rounded-lg bg-card opacity-50 flex justify-between items-center">
                <span className="text-xs">
                  {formatTime(r.time)} — {r.name} ({r.covers}p) ✓
                </span>
                <button onClick={() => markAttendu(r.id)} className="text-xs text-muted-foreground">Annuler</button>
              </div>
            ))}
          </div>
        )}

        {reservations.length === 0 && (
          <p className="text-sm text-muted-foreground p-3 rounded-lg bg-card">Aucune résa pour ce soir</p>
        )}
      </div>

      {/* Tasks by moment */}
      {MOMENT_ORDER.map((moment) => (
        <MomentSection
          key={moment}
          moment={moment}
          tasks={tasksByMoment[moment] || []}
          completedTaskIds={completedTaskIds}
          onToggle={handleToggle}
          locked={moment === "fermeture" && !ouvertureComplete}
          lockedMessage={!ouvertureComplete ? `Complète l'ouverture pour débloquer (${ouvertureProgress.done}/${ouvertureProgress.total})` : undefined}
        />
      ))}

      {/* Tâches libres */}
      {tachesLibres.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 text-muted-foreground">Tâches libres</h2>
          <div className="space-y-2">
            {tachesLibres.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                completed={completedTaskIds.has(task.id)}
                onToggle={() => handleToggle(task.id, task.moment as Moment)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Responsable section: team debriefs + domain badge */}
      {profile.role === "responsable" && (
        <div className="mb-6">
          {/* Recent team debriefs */}
          {recentDebriefs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={14} className="text-muted-foreground" />
                <h2 className="text-sm font-medium text-muted-foreground">Debriefs de l&apos;équipe</h2>
              </div>
              <div className="space-y-2">
                {recentDebriefs.map((d) => (
                  <div key={d.id} className="p-3 rounded-lg bg-card">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium">{profiles[d.user_id] || "?"}</span>
                        <span className="text-xs text-muted-foreground ml-2">{d.date}</span>
                      </div>
                      <span className="font-bold" style={{ color: scoreColor(d.global_score) }}>
                        {d.global_score}/5
                      </span>
                    </div>
                    {/* Mini scores */}
                    <div className="grid grid-cols-4 gap-2 mt-1.5">
                      {DEBRIEF_CATEGORIES.map((cat) => {
                        const score = d[`${cat.key}_score` as keyof Debrief] as number;
                        return (
                          <div key={cat.key} className="text-center">
                            <p className="text-xs font-bold" style={{ color: scoreColor(score) }}>{score}</p>
                            <p className="text-[10px] text-muted-foreground">{cat.label}</p>
                          </div>
                        );
                      })}
                    </div>
                    {d.suggestions && (
                      <p className="text-xs text-primary mt-1.5">💡 {d.suggestions}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
