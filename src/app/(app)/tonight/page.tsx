"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, getShiftDay, formatDateFr, formatTime } from "@/lib/shift-utils";
import { MOMENT_LABELS, MOMENT_ORDER, ZONE_LABELS, ZONE_COLORS, SEATING_LABELS, SEATING_ICONS } from "@/lib/constants";
import type {
  Task,
  OneOffTask,
  TaskCompletion,
  ManagerMessage,
  Event,
  Reservation,
  Moment,
  Zone,
} from "@/lib/types";
import MessageBanner from "@/components/MessageBanner";
import MomentSection from "@/components/MomentSection";
import TaskCard from "@/components/TaskCard";
import { Check } from "lucide-react";

interface MergedTask {
  id: string;
  title: string;
  zone?: string;
  zoneKey?: Zone;
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

  // Capitalize first letter for display (e.g. "Mar 1 avril")
  const dateLabelShort = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1, 3) + " " + dateLabel.split(" ").slice(1).join(" ");

  const fetchData = useCallback(async () => {
    if (!profile) return;

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

    const completions = (compRes.data as TaskCompletion[]) || [];
    const completedIds = new Set(completions.map((c) => c.task_id));

    const recurring: MergedTask[] = ((taskRes.data as Task[]) || []).map((t) => ({
      id: t.id,
      title: t.title,
      zone: ZONE_LABELS[t.zone] || t.zone,
      zoneKey: t.zone,
      description: t.description,
      completed: completedIds.has(t.id),
      moment: t.moment,
      isOneOff: false,
    }));

    const oneOff: MergedTask[] = ((oneOffRes.data as OneOffTask[]) || []).map((t) => ({
      id: t.id,
      title: t.title,
      zone: ZONE_LABELS[t.zone] || t.zone,
      zoneKey: t.zone,
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

  async function unmarkArrived(id: string) {
    await supabase
      .from("reservations")
      .update({ status: "attendu", arrived_by: null })
      .eq("id", id);
    fetchData();
  }

  // ── Loading skeleton ──────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: "0 20px", paddingBottom: 96, maxWidth: 512, margin: "0 auto" }}>
        <div style={{ height: 40, background: "var(--card-bg)", borderRadius: 16, marginBottom: 16, opacity: 0.5 }} />
        <div style={{ height: 80, background: "var(--card-bg)", borderRadius: 16, marginBottom: 16, opacity: 0.5 }} />
        <div style={{ height: 120, background: "var(--card-bg)", borderRadius: 16, marginBottom: 16, opacity: 0.5 }} />
        <div style={{ height: 160, background: "var(--card-bg)", borderRadius: 16, opacity: 0.5 }} />
      </div>
    );
  }

  const confirmedResas = reservations.filter((r) => r.status === "attendu");
  const arrivedResas = reservations.filter((r) => r.status === "arrive");
  const allDisplayResas = [...confirmedResas, ...arrivedResas];
  const totalCovers = reservations.reduce((sum, r) => sum + r.covers, 0);

  return (
    <div style={{ padding: "0 20px", paddingBottom: 96, maxWidth: 512, margin: "0 auto" }}>

      {/* ── Compact Header ──────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 0 20px",
          fontSize: 14,
          color: "var(--text-secondary)",
        }}
      >
        <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
          {profile?.name}
        </span>
        <span style={{ color: "var(--text-tertiary)" }}>&middot;</span>
        <span>{dateLabelShort}</span>
        <span className="pill" style={{ marginLeft: 2 }}>
          16h&rarr;1h
        </span>
      </div>

      {/* ── Manager Messages ────────────────────────────────── */}
      {messages.length > 0 && (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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

      {/* Gap between sections */}
      {messages.length > 0 && <div style={{ height: 28 }} />}

      {/* ── Event Card ──────────────────────────────────────── */}
      {event && (
        <>
          <div
            className="card-medium"
            style={{
              background:
                "linear-gradient(135deg, rgba(196,120,90,0.04) 0%, rgba(196,120,90,0.01) 100%)",
              border: "1px solid rgba(196,120,90,0.1)",
              padding: "14px 16px",
            }}
          >
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              {event.title}
            </div>
            {event.description && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: "var(--text-secondary)",
                  marginTop: 4,
                }}
              >
                {event.description}
              </div>
            )}
            {(event.start_time || event.end_time) && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 400,
                  color: "var(--text-secondary)",
                  marginTop: 4,
                }}
              >
                {formatTime(event.start_time)}
                {event.end_time ? ` - ${formatTime(event.end_time)}` : ""}
              </div>
            )}
          </div>
          <div style={{ height: 28 }} />
        </>
      )}

      {/* ── Reservations ────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-tertiary)",
          }}
        >
          Réservations
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#8B5A40",
            background: "rgba(139,90,64,0.1)",
            padding: "4px 10px",
            borderRadius: 8,
            letterSpacing: 0,
          }}
        >
          {reservations.length} résas &middot; {totalCovers} couverts
        </span>
      </div>

      {allDisplayResas.length > 0 ? (
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {allDisplayResas.map((resa) => {
            const isArrived = resa.status === "arrive";
            const seatingIcon = SEATING_ICONS[resa.seating] || "";
            const seatingLabel = SEATING_LABELS[resa.seating] || "";
            return (
              <div
                key={resa.id}
                className="card-medium"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  opacity: isArrived ? 0.5 : 1,
                  transition: "opacity 0.4s ease",
                }}
              >
                {/* Time */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#8B5A40",
                    minWidth: 42,
                    flexShrink: 0,
                  }}
                >
                  {formatTime(resa.time)}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    {resa.name}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#A85D3F",
                        background: "rgba(196,120,90,0.08)",
                        padding: "2px 7px",
                        borderRadius: 6,
                      }}
                    >
                      {resa.covers} pers.
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-secondary)",
                      marginTop: 3,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    <span>
                      {seatingIcon} {seatingLabel}
                    </span>
                    {resa.notes && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--warning)",
                          fontWeight: 500,
                        }}
                      >
                        ⚠️ {resa.notes}
                      </span>
                    )}
                    {isArrived && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#8B5A40",
                          background: "rgba(139,90,64,0.1)",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        ✓ Arrivé
                      </span>
                    )}
                  </div>
                </div>

                {/* Check button */}
                <button
                  onClick={() =>
                    isArrived ? unmarkArrived(resa.id) : markArrived(resa.id)
                  }
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    border: `2px solid #8B5A40`,
                    background: isArrived ? "#8B5A40" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    padding: 0,
                    transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                  aria-label={isArrived ? "Annuler arrivée" : "Marquer arrivé"}
                >
                  <Check
                    size={18}
                    strokeWidth={2.5}
                    style={{
                      color: isArrived ? "#fff" : "rgba(139,90,64,0.5)",
                      transition: "all 0.3s ease",
                    }}
                  />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div
          className="card-medium"
          style={{
            padding: "16px",
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          Aucune réservation ce soir
        </div>
      )}

      {/* Gap */}
      <div style={{ height: 28 }} />

      {/* ── Moment Sections (Tasks) ─────────────────────────── */}
      {MOMENT_ORDER.map((moment, idx) => {
        const momentTasks = tasks.filter((t) => t.moment === moment);
        // If no tasks for this moment, skip
        if (momentTasks.length === 0 && moment !== "fermeture") return null;

        return (
          <div key={moment}>
            <MomentSection
              name={MOMENT_LABELS[moment]}
              tasks={momentTasks}
              onToggleTask={handleToggleTask}
            />
            {idx < MOMENT_ORDER.length - 1 && <div style={{ height: 28 }} />}
          </div>
        );
      })}

      {/* ── Free Tasks ──────────────────────────────────────── */}
      {freeTasks.length > 0 && (
        <>
          <div style={{ height: 28 }} />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--text-tertiary)",
                opacity: 0.8,
              }}
            >
              Tâches libres
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {freeTasks.map((task) => (
              <TaskCard
                key={task.id}
                id={task.id}
                title={task.title}
                zone={task.zone}
                zoneKey={task.zoneKey}
                description={task.description}
                completed={task.completed}
                isLibre
                onToggle={handleToggleTask}
              />
            ))}
          </div>
        </>
      )}

      {/* Extra bottom padding for nav clearance */}
      <div style={{ height: 20 }} />
    </div>
  );
}
