"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, getShiftDay, formatDateFr, formatTime } from "@/lib/shift-utils";
import { MOMENT_LABELS, MOMENT_ORDER, ZONE_LABELS } from "@/lib/constants";
import type {
  Task,
  OneOffTask,
  TaskCompletion,
  ManagerMessage,
  Event,
  Reservation,
  Moment,
} from "@/lib/types";
import MessageBanner from "@/components/MessageBanner";
import MomentSection from "@/components/MomentSection";
import TaskCard from "@/components/TaskCard";
import { CalendarDays, Users, Check, Trash2 } from "lucide-react";

interface MergedTask {
  id: string;
  title: string;
  zone?: string;
  description?: string | null;
  completed: boolean;
  moment: Moment;
  isOneOff: boolean;
}

export default function TonightPage() {
  const { profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tasks, setTasks] = useState<MergedTask[]>([]);
  const [freeTasks, setFreeTasks] = useState<MergedTask[]>([]);

  const shiftDate = getShiftDate();
  const shiftDay = getShiftDay();
  const dateLabel = formatDateFr(shiftDate);

  const fetchData = useCallback(async () => {
    if (!profile) return;

    // Fetch all data in parallel
    const [msgRes, eventRes, resaRes, taskRes, oneOffRes, compRes] =
      await Promise.all([
        supabase
          .from("manager_messages")
          .select("*")
          .eq("date", shiftDate)
          .order("created_at", { ascending: false }),
        supabase
          .from("events")
          .select("*")
          .eq("date", shiftDate)
          .limit(1)
          .maybeSingle(),
        supabase
          .from("reservations")
          .select("*")
          .eq("date", shiftDate)
          .order("time", { ascending: true }),
        supabase
          .from("tasks")
          .select("*")
          .eq("day", shiftDay)
          .order("priority", { ascending: true }),
        supabase
          .from("one_off_tasks")
          .select("*")
          .eq("date", shiftDate)
          .order("priority", { ascending: true }),
        supabase
          .from("task_completions")
          .select("*")
          .eq("date", shiftDate),
      ]);

    setMessages((msgRes.data as ManagerMessage[]) || []);
    setEvent((eventRes.data as Event) || null);
    setReservations((resaRes.data as Reservation[]) || []);

    // Merge recurring + one-off tasks
    const completions = (compRes.data as TaskCompletion[]) || [];
    const completedIds = new Set(completions.map((c) => c.task_id));

    const recurring: MergedTask[] = ((taskRes.data as Task[]) || []).map((t) => ({
      id: t.id,
      title: t.title,
      zone: ZONE_LABELS[t.zone] || t.zone,
      description: t.description,
      completed: completedIds.has(t.id),
      moment: t.moment,
      isOneOff: false,
    }));

    const oneOff: MergedTask[] = ((oneOffRes.data as OneOffTask[]) || []).map((t) => ({
      id: t.id,
      title: t.title,
      zone: ZONE_LABELS[t.zone] || t.zone,
      description: t.description,
      completed: t.completed,
      moment: t.moment,
      isOneOff: true,
    }));

    const allTasks = [...recurring, ...oneOff];
    const momentTasks = allTasks.filter((t) =>
      MOMENT_ORDER.includes(t.moment)
    );
    const free = allTasks.filter(
      (t) => !MOMENT_ORDER.includes(t.moment)
    );

    setTasks(momentTasks);
    setFreeTasks(free);
    setLoading(false);
  }, [profile, supabase, shiftDate, shiftDay]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("tonight-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_completions", filter: `date=eq.${shiftDate}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "one_off_tasks", filter: `date=eq.${shiftDate}` },
        () => fetchData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `date=eq.${shiftDate}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, shiftDate, fetchData]);

  // ── Toggle task completion ────────────────────────────────
  async function handleToggleTask(taskId: string, completed: boolean) {
    if (!profile) return;

    const task = [...tasks, ...freeTasks].find((t) => t.id === taskId);
    if (!task) return;

    if (task.isOneOff) {
      await supabase
        .from("one_off_tasks")
        .update({ completed })
        .eq("id", taskId);
    } else {
      if (completed) {
        await supabase.from("task_completions").insert({
          task_id: taskId,
          user_id: profile.id,
          date: shiftDate,
          moment: task.moment,
        });
      } else {
        await supabase
          .from("task_completions")
          .delete()
          .eq("task_id", taskId)
          .eq("date", shiftDate);
      }
    }

    // Optimistic update
    const update = (list: MergedTask[]) =>
      list.map((t) => (t.id === taskId ? { ...t, completed } : t));
    setTasks(update);
    setFreeTasks(update);
  }

  // ── Reservation actions ───────────────────────────────────
  async function markArrived(id: string) {
    if (!profile) return;
    await supabase
      .from("reservations")
      .update({ status: "arrive", arrived_by: profile.id })
      .eq("id", id);
    fetchData();
  }

  async function cancelReservation(id: string) {
    await supabase
      .from("reservations")
      .update({ status: "attendu" })
      .eq("id", id);
    fetchData();
  }

  // ── Loading skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <div className="p-4 pb-28 max-w-lg mx-auto space-y-4">
        <div className="bg-card rounded-lg animate-pulse h-10 w-3/4" />
        <div className="bg-card rounded-lg animate-pulse h-24" />
        <div className="bg-card rounded-lg animate-pulse h-32" />
        <div className="bg-card rounded-lg animate-pulse h-48" />
      </div>
    );
  }

  const confirmedResas = reservations.filter(
    (r) => r.status === "attendu"
  );
  const totalCovers = confirmedResas.reduce((sum, r) => sum + r.covers, 0);

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto space-y-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {profile?.name} <span className="text-muted-foreground font-normal">· {dateLabel}</span>
        </h1>
        <div className="mt-1">
          <span className="pill">{shiftDay}</span>
        </div>
      </div>

      {/* ── Manager messages ───────────────────────────────── */}
      {messages.length > 0 && (
        <div className="space-y-2 stagger-children">
          {messages.map((msg) => (
            <MessageBanner
              key={msg.id}
              content={msg.content}
              author={msg.title}
              priority={msg.priority}
            />
          ))}
        </div>
      )}

      {/* ── Event card ─────────────────────────────────────── */}
      {event && (
        <div
          className="glass-card p-4"
          style={{ background: "var(--gradient-warm)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <CalendarDays size={16} className="text-primary" />
            <h3 className="text-base font-semibold tracking-tight text-gradient">
              {event.title}
            </h3>
          </div>
          {event.description && (
            <p className="text-sm text-muted-foreground">{event.description}</p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {formatTime(event.start_time)}
            {event.end_time ? ` - ${formatTime(event.end_time)}` : ""}
          </p>
        </div>
      )}

      {/* ── Reservations summary ───────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Reservations</h2>
          <span className="pill">
            <Users size={12} className="inline mr-1" />
            {totalCovers} couverts · {confirmedResas.length} tables
          </span>
        </div>

        {confirmedResas.length > 0 ? (
          <div className="space-y-2 stagger-children">
            {confirmedResas.slice(0, 4).map((resa) => (
              <div key={resa.id} className="glass-card p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{resa.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(resa.time)} · {resa.covers} pers.
                    {resa.notes && ` · ${resa.notes}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  {resa.status !== "arrive" && (
                    <button
                      onClick={() => markArrived(resa.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
                      aria-label="Marquer arrive"
                    >
                      <Check size={16} className="text-success" />
                    </button>
                  )}
                  <button
                    onClick={() => cancelReservation(resa.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
                    aria-label="Annuler"
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground text-center">
              Aucune reservation ce soir
            </p>
          </div>
        )}
      </div>

      {/* ── Moment sections ────────────────────────────────── */}
      {MOMENT_ORDER.map((moment) => {
        const momentTasks = tasks.filter((t) => t.moment === moment);
        return (
          <MomentSection
            key={moment}
            name={MOMENT_LABELS[moment]}
            tasks={momentTasks}
            onToggleTask={handleToggleTask}
          />
        );
      })}

      {/* ── Free tasks ─────────────────────────────────────── */}
      {freeTasks.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-base font-semibold tracking-tight">Taches libres</h2>
          <div className="space-y-2 stagger-children">
            {freeTasks.map((task) => (
              <TaskCard
                key={task.id}
                id={task.id}
                title={task.title}
                zone={task.zone}
                description={task.description}
                completed={task.completed}
                onToggle={handleToggleTask}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
