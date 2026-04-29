"use client";

/**
 * Planning — iOS-style monthly calendar.
 *
 * Personal view: each user sees their own shifts on a familiar
 * month grid. Patron can switch to any team member via the avatar
 * row at the top to plan their shifts.
 *
 * Tap a day → bottom sheet with that day's shifts and contextual
 * actions (patron: add/edit/delete shift; staff: request absence).
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import { haptic } from "@/lib/haptics";
import type { Schedule, Profile, AvailabilityRequest } from "@/lib/types";
import { ChevronLeft, ChevronRight, Plus, Trash2, X, CalendarOff, Check, Repeat } from "lucide-react";
import { localISODate } from "@/lib/shift-utils";

// ── Date helpers ──────────────────────────────────────────────

const FR_MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const FR_DAYS_SHORT = ["L", "M", "M", "J", "V", "S", "D"]; // Monday-first

const isoDate = localISODate;
function startOfMonth(y: number, m: number): Date { return new Date(y, m, 1); }
function endOfMonth(y: number, m: number): Date { return new Date(y, m + 1, 0); }

/** Days to render for a month grid (always 6 weeks = 42 cells, with prev/next overflow). */
function monthGridDays(year: number, month: number): Date[] {
  const firstOfMonth = startOfMonth(year, month);
  // JS getDay: Sunday=0..Saturday=6 — convert to Monday-first index
  const dayOfWeekMonFirst = (firstOfMonth.getDay() + 6) % 7;
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - dayOfWeekMonFirst);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }
  return days;
}

function todayISO(): string { return isoDate(new Date()); }

function formatLongDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

// ──────────────────────────────────────────────────────────────

export default function PlanningPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const supabase = useRef(createClient()).current;

  const isPatron = profile?.role === "patron";

  // Calendar state
  const [year, setYear] = useState<number>(() => new Date().getFullYear());
  const [month, setMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Active user (whose calendar are we looking at?). Defaults to self.
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // Data
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [availRequests, setAvailRequests] = useState<AvailabilityRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/edit shift form (patron, in sheet)
  const [shiftDraftStart, setShiftDraftStart] = useState("16:00");
  const [shiftDraftEnd, setShiftDraftEnd] = useState("01:00");
  const [savingShift, setSavingShift] = useState(false);

  // Absence request form (staff)
  const [showAvailFormForDay, setShowAvailFormForDay] = useState<string | null>(null);
  const [availReason, setAvailReason] = useState("");

  // Patron tools: recurring schedule + absence range
  const [showRecurring, setShowRecurring] = useState(false);
  const [showAbsenceRange, setShowAbsenceRange] = useState(false);

  // Initialize active user once profile loads
  useEffect(() => {
    if (!activeUserId && user?.id) setActiveUserId(user.id);
  }, [user, activeUserId]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    // Fetch a wider window than the visible month so prev/next month nav is instant.
    // Supabase select all schedules in [start - 1 month, end + 1 month] for the active user.
    const winStart = new Date(year, month - 1, 1);
    const winEnd = new Date(year, month + 2, 0);

    const [{ data: sched }, { data: staff }, { data: avail }] = await Promise.all([
      supabase.from("schedules").select("*")
        .gte("date", isoDate(winStart))
        .lte("date", isoDate(winEnd)),
      supabase.from("profiles").select("*").order("name"),
      supabase.from("availability_requests").select("*")
        .gte("date", isoDate(winStart))
        .lte("date", isoDate(winEnd)),
    ]);
    setSchedules(sched || []);
    setStaffList(staff || []);
    setAvailRequests(avail || []);
    setLoading(false);
  }, [supabase, user, year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime: any change to schedules / requests → refresh
  useEffect(() => {
    const ch = supabase.channel("planning-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "schedules" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_requests" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, fetchData]);

  // ── Derived ────────────────────────────────────────────────
  const activeProfile = staffList.find((p) => p.id === activeUserId);
  const isMyCalendar = activeUserId === user?.id;

  // Switchable users: patron sees everyone; staff only sees themselves
  const switchableUsers: Profile[] = isPatron
    ? staffList
    : staffList.filter((p) => p.id === user?.id);

  const monthDays = monthGridDays(year, month);
  const today = todayISO();

  function shiftsOn(day: string): Schedule[] {
    return schedules.filter((s) => s.date === day && s.user_id === activeUserId);
  }
  function availOn(day: string): AvailabilityRequest | undefined {
    return availRequests.find((r) => r.date === day && r.user_id === activeUserId);
  }

  // ── Navigation ─────────────────────────────────────────────
  function goPrevMonth() {
    haptic("light");
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  }
  function goNextMonth() {
    haptic("light");
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  }
  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDay(todayISO());
  }

  // ── Mutations ──────────────────────────────────────────────
  async function addShift(day: string) {
    if (!activeUserId || !user) return;
    setSavingShift(true);
    const { error } = await supabase.from("schedules").insert({
      user_id: activeUserId,
      date: day,
      start_time: shiftDraftStart,
      end_time: shiftDraftEnd,
      created_by: user.id,
    });
    setSavingShift(false);
    if (error) {
      toast.error(`Erreur : ${error.message}`);
      haptic("error");
      return;
    }
    haptic("success");
    toast.success("Shift ajouté");
  }

  async function deleteShift(id: string, askConfirm = true) {
    if (askConfirm) {
      const ok = await confirm({
        title: "Supprimer ce shift ?",
        variant: "danger",
        confirmLabel: "Supprimer",
      });
      if (!ok) return;
    }
    const { error } = await supabase.from("schedules").delete().eq("id", id);
    if (error) { toast.error("Erreur, réessaie"); return; }
    if (askConfirm) toast.success("Supprimé");
  }

  async function submitAvailRequest(day: string) {
    if (!user) return;
    const { error } = await supabase.from("availability_requests").insert({
      user_id: user.id,
      date: day,
      reason: availReason.trim() || null,
    });
    if (error) { toast.error(`Erreur : ${error.message}`); haptic("error"); return; }
    haptic("success");
    toast.success("Demande envoyée");
    setShowAvailFormForDay(null);
    setAvailReason("");
  }

  async function handleAvailDecision(id: string, status: "accepted" | "refused") {
    const { error } = await supabase.from("availability_requests").update({ status }).eq("id", id);
    if (error) { toast.error("Erreur, réessaie"); return; }
    if (status === "accepted") {
      const req = availRequests.find((r) => r.id === id);
      if (req) {
        const sched = schedules.find((s) => s.user_id === req.user_id && s.date === req.date);
        if (sched) await deleteShift(sched.id, false);
      }
    }
    haptic(status === "accepted" ? "success" : "medium");
    toast.success(status === "accepted" ? "Absence acceptée" : "Refusée");
  }

  const pendingRequests = availRequests.filter((r) => r.status === "pending");

  if (loading) {
    return (
      <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div className="card-light pulse" style={{ height: 380, borderRadius: 18, opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
      {/* Patron only: pending absence requests at top */}
      {isPatron && pendingRequests.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p className="section-label" style={{ marginBottom: 8 }}>
            Demandes d&apos;absence ({pendingRequests.length})
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingRequests.map((r) => (
              <div key={r.id} className="card-medium" style={{ padding: 12, borderLeft: "3px solid var(--warning)" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  {staffList.find((s) => s.id === r.user_id)?.name} · {formatLongDate(r.date)}
                </div>
                {r.reason && (
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 3 }}>{r.reason}</div>
                )}
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button onClick={() => handleAvailDecision(r.id, "accepted")} style={{
                    display: "flex", alignItems: "center", gap: 4, borderRadius: 8,
                    padding: "5px 10px", fontSize: 12, fontWeight: 500, color: "#fff",
                    background: "var(--gradient-primary)", border: "none", cursor: "pointer",
                  }}>
                    <Check size={12} /> Accepter
                  </button>
                  <button onClick={() => handleAvailDecision(r.id, "refused")} style={{
                    borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 500,
                    color: "var(--text-secondary)", background: "var(--secondary-bg)",
                    border: "none", cursor: "pointer",
                  }}>
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patron user switcher (avatars) */}
      {isPatron && switchableUsers.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 14 }}>
          {switchableUsers.map((u) => {
            const sel = u.id === activeUserId;
            const isMe = u.id === user?.id;
            return (
              <button
                key={u.id}
                onClick={() => { haptic("light"); setActiveUserId(u.id); setSelectedDay(null); }}
                style={{
                  flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: sel ? "var(--gradient-primary)" : "var(--secondary-bg)",
                  color: sel ? "#fff" : "var(--text-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700,
                  border: sel ? "2px solid var(--terra-deep)" : "2px solid transparent",
                  transition: "all 0.15s",
                }}>
                  {u.name[0]?.toUpperCase()}
                </div>
                <span style={{
                  fontSize: 10,
                  color: sel ? "var(--text-primary)" : "var(--text-tertiary)",
                  fontWeight: sel ? 600 : 500,
                  maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {isMe ? "Moi" : u.name.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Patron tools: bulk-add weekly + bulk-mark absent */}
      {isPatron && activeProfile && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button
            onClick={() => setShowRecurring(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10,
              background: "var(--secondary-bg)", color: "var(--terra-medium)",
              border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, minHeight: 36,
            }}
          >
            <Repeat size={13} /> Plan récurrent
          </button>
          <button
            onClick={() => setShowAbsenceRange(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10,
              background: "var(--secondary-bg)", color: "var(--text-secondary)",
              border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 600, minHeight: 36,
            }}
          >
            <CalendarOff size={13} /> Marquer absent (durée)
          </button>
        </div>
      )}

      {/* Calendar header — month nav */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: 0 }}>
            {FR_MONTHS[month]} <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>{year}</span>
          </h1>
          {!isMyCalendar && activeProfile && (
            <p style={{ fontSize: 12, color: "var(--terra-medium)", marginTop: 2, fontWeight: 500 }}>
              Calendrier de {activeProfile.name}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={goPrevMonth} aria-label="Mois précédent" style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--secondary-bg)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ChevronLeft size={18} style={{ color: "var(--text-secondary)" }} />
          </button>
          <button onClick={goToday} style={{
            padding: "0 12px", height: 36, borderRadius: 10,
            background: "var(--secondary-bg)", border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: "var(--text-secondary)",
          }}>
            Aujourd&apos;hui
          </button>
          <button onClick={goNextMonth} aria-label="Mois suivant" style={{
            width: 36, height: 36, borderRadius: 10,
            background: "var(--secondary-bg)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ChevronRight size={18} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>
      </div>

      {/* Day header row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
        {FR_DAYS_SHORT.map((d, i) => (
          <div key={i} style={{
            textAlign: "center", fontSize: 11, fontWeight: 600,
            color: i >= 5 ? "var(--terra-medium)" : "var(--text-tertiary)",
            textTransform: "uppercase", letterSpacing: "0.04em",
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Month grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2,
        background: "var(--card-bg)", borderRadius: 14,
        border: "1px solid var(--card-border)",
        padding: 4, overflow: "hidden",
      }}>
        {monthDays.map((d) => {
          const iso = isoDate(d);
          const inMonth = d.getMonth() === month;
          const isToday = iso === today;
          const isSelected = iso === selectedDay;
          const dayShifts = shiftsOn(iso);
          const hasShift = dayShifts.length > 0;
          const avail = availOn(iso);

          // Day status drives the cell's color theme:
          //   absent (accepted)  → red tint, struck date
          //   pending request    → yellow tint
          //   working            → terra dot(s)
          //   off                → nothing
          const isAbsent = avail?.status === "accepted";
          const isPending = avail?.status === "pending";

          // Background tint for absent / pending (subtle wash on the cell)
          const cellBg = isSelected
            ? "var(--gradient-primary)"
            : isAbsent
              ? "rgba(192,122,122,0.10)"
              : isPending
                ? "rgba(212,160,74,0.10)"
                : "transparent";

          // Date number color (red strike-through for absent days)
          const dateColor = isSelected
            ? "#fff"
            : isAbsent
              ? "var(--danger)"
              : isToday
                ? "var(--terra-medium)"
                : "var(--text-primary)";

          return (
            <button
              key={iso}
              onClick={() => { haptic("light"); setSelectedDay(iso); }}
              style={{
                aspectRatio: "1",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 2,
                background: cellBg,
                border: "none", cursor: "pointer",
                borderRadius: 10,
                padding: "4px 2px",
                transition: "background 0.15s",
                opacity: inMonth ? 1 : 0.3,
              }}
            >
              <div style={{
                fontSize: 14,
                fontWeight: isToday ? 700 : 500,
                color: dateColor,
                textDecoration: isAbsent && !isSelected ? "line-through" : "none",
                width: 26, height: 26,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%",
                background: isToday && !isSelected && !isAbsent ? "rgba(196,120,90,0.12)" : "transparent",
              }}>
                {d.getDate()}
              </div>
              {/* Status dots */}
              <div style={{ display: "flex", gap: 2, height: 5 }}>
                {/* Accepted absence trumps shifts visually */}
                {isAbsent ? (
                  <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: isSelected ? "rgba(255,255,255,0.85)" : "var(--danger)",
                  }} />
                ) : (
                  <>
                    {hasShift && dayShifts.slice(0, 3).map((s, i) => (
                      <div key={s.id || i} style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: isSelected ? "rgba(255,255,255,0.85)" : "var(--terra-medium)",
                      }} />
                    ))}
                    {isPending && (
                      <div style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: isSelected ? "rgba(255,255,255,0.85)" : "var(--warning)",
                      }} />
                    )}
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 12, justifyContent: "center", marginTop: 10,
        fontSize: 11, color: "var(--text-tertiary)", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--terra-medium)" }} />
          shift travaillé
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--warning)" }} />
          demande en attente
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--danger)" }} />
          absence confirmée
        </div>
      </div>

      {/* ── DAY DETAIL SHEET ─────────────────────────────────────── */}
      {selectedDay && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}
          onClick={() => setSelectedDay(null)}
        >
          <div style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
          }} />
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-medium"
            style={{
              position: "relative", width: "100%", maxWidth: 512,
              maxHeight: "80vh", overflowY: "auto",
              padding: "20px 20px 24px",
              borderRadius: "20px 20px 0 0",
              animation: "fadeInUp 0.25s ease-out",
            }}
          >
            <button onClick={() => setSelectedDay(null)} style={{
              position: "absolute", top: 14, right: 14,
              background: "none", border: "none", cursor: "pointer", padding: 4,
            }}>
              <X size={20} style={{ color: "var(--text-tertiary)" }} />
            </button>

            <h2 style={{
              fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em",
              color: "var(--text-primary)", margin: 0, marginBottom: 4,
              textTransform: "capitalize",
            }}>
              {formatLongDate(selectedDay)}
            </h2>
            {!isMyCalendar && activeProfile && (
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 14 }}>
                Pour {activeProfile.name}
              </p>
            )}

            {/* Existing shifts */}
            {(() => {
              const todayShifts = shiftsOn(selectedDay);
              if (todayShifts.length === 0) {
                return (
                  <div style={{
                    padding: "16px 0", marginTop: 12,
                    fontSize: 13, color: "var(--text-tertiary)", textAlign: "center",
                  }}>
                    Aucun shift ce jour-là.
                  </div>
                );
              }
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
                  {todayShifts.map((s) => (
                    <div key={s.id} className="card-light" style={{
                      padding: "12px 14px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      borderLeft: "3px solid var(--terra-medium)",
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                        {s.start_time.slice(0, 5).replace(":", "h")} → {s.end_time.slice(0, 5).replace(":", "h")}
                      </span>
                      {isPatron && (
                        <button onClick={() => deleteShift(s.id)} style={{
                          background: "none", border: "none", cursor: "pointer", padding: 4,
                        }} aria-label="Supprimer">
                          <Trash2 size={14} style={{ color: "var(--danger)" }} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Patron: add shift */}
            {isPatron && (
              <div style={{
                marginTop: 16, paddingTop: 16,
                borderTop: "1px solid var(--border-color)",
              }}>
                <p className="section-label" style={{ marginBottom: 10 }}>Ajouter un shift</p>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                  <input
                    type="time"
                    value={shiftDraftStart}
                    onChange={(e) => setShiftDraftStart(e.target.value)}
                    style={{
                      flex: 1, borderRadius: 10, border: "1px solid var(--border-color)",
                      background: "var(--input-bg)", padding: "10px 12px",
                      fontSize: 14, color: "var(--text-primary)", outline: "none",
                    }}
                  />
                  <span style={{ color: "var(--text-tertiary)" }}>→</span>
                  <input
                    type="time"
                    value={shiftDraftEnd}
                    onChange={(e) => setShiftDraftEnd(e.target.value)}
                    style={{
                      flex: 1, borderRadius: 10, border: "1px solid var(--border-color)",
                      background: "var(--input-bg)", padding: "10px 12px",
                      fontSize: 14, color: "var(--text-primary)", outline: "none",
                    }}
                  />
                </div>
                <button
                  onClick={() => addShift(selectedDay)}
                  disabled={savingShift}
                  style={{
                    width: "100%", padding: "10px 0", borderRadius: 12,
                    background: "var(--gradient-primary)", color: "#fff",
                    border: "none", cursor: "pointer",
                    fontSize: 14, fontWeight: 600, minHeight: 44,
                    opacity: savingShift ? 0.5 : 1,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  }}
                >
                  <Plus size={14} /> Ajouter
                </button>
              </div>
            )}

            {/* Staff: request absence (only on own calendar, only if there's a shift, only if no pending request) */}
            {!isPatron && isMyCalendar && (() => {
              const todayShifts = shiftsOn(selectedDay);
              const existing = availOn(selectedDay);
              if (todayShifts.length === 0) return null;
              if (existing) {
                return (
                  <div style={{
                    marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <CalendarOff size={14} style={{ color: "var(--text-tertiary)" }} />
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Demande d&apos;absence : <b style={{
                        color: existing.status === "pending" ? "var(--warning)"
                          : existing.status === "accepted" ? "var(--terra-deep)"
                          : "var(--danger)",
                      }}>
                        {existing.status === "pending" ? "en attente"
                          : existing.status === "accepted" ? "acceptée"
                          : "refusée"}
                      </b>
                    </span>
                  </div>
                );
              }
              return (
                <div style={{
                  marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-color)",
                }}>
                  {showAvailFormForDay === selectedDay ? (
                    <>
                      <textarea
                        placeholder="Raison (optionnel)"
                        value={availReason}
                        onChange={(e) => setAvailReason(e.target.value)}
                        rows={2}
                        style={{
                          width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
                          background: "var(--input-bg)", padding: "10px 12px",
                          fontSize: 13, color: "var(--text-primary)",
                          outline: "none", resize: "none", marginBottom: 10,
                          fontFamily: "inherit",
                        }}
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => submitAvailRequest(selectedDay)}
                          style={{
                            flex: 1, padding: "10px 0", borderRadius: 12,
                            background: "var(--gradient-primary)", color: "#fff",
                            border: "none", cursor: "pointer",
                            fontSize: 13, fontWeight: 600, minHeight: 40,
                          }}
                        >
                          Envoyer la demande
                        </button>
                        <button
                          onClick={() => { setShowAvailFormForDay(null); setAvailReason(""); }}
                          style={{
                            padding: "0 14px", borderRadius: 12,
                            background: "var(--secondary-bg)", color: "var(--text-secondary)",
                            border: "none", cursor: "pointer",
                            fontSize: 13, fontWeight: 500,
                          }}
                        >
                          Annuler
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowAvailFormForDay(selectedDay)}
                      style={{
                        width: "100%", padding: "10px 0", borderRadius: 12,
                        background: "var(--secondary-bg)", color: "var(--text-secondary)",
                        border: "1px solid var(--border-color)", cursor: "pointer",
                        fontSize: 13, fontWeight: 500, minHeight: 44,
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <CalendarOff size={14} /> Demander une absence
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── RECURRING SCHEDULE SHEET (patron) ─────────────────────── */}
      {showRecurring && activeProfile && isPatron && (
        <RecurringScheduleSheet
          activeUserName={activeProfile.name}
          activeUserId={activeUserId!}
          patronId={user!.id}
          supabase={supabase}
          existingSchedules={schedules.filter((s) => s.user_id === activeUserId)}
          onClose={() => setShowRecurring(false)}
          onApplied={(count) => {
            haptic("success");
            toast.success(`${count} shift${count > 1 ? "s" : ""} ajouté${count > 1 ? "s" : ""}`);
            setShowRecurring(false);
            fetchData();
          }}
          onError={(msg) => { haptic("error"); toast.error(msg); }}
        />
      )}

      {/* ── ABSENCE RANGE SHEET (patron) ──────────────────────────── */}
      {showAbsenceRange && activeProfile && isPatron && (
        <AbsenceRangeSheet
          activeUserName={activeProfile.name}
          activeUserId={activeUserId!}
          existingSchedules={schedules.filter((s) => s.user_id === activeUserId)}
          supabase={supabase}
          onClose={() => setShowAbsenceRange(false)}
          onApplied={(count) => {
            haptic("success");
            toast.success(`Absence enregistrée (${count} jour${count > 1 ? "s" : ""})`);
            setShowAbsenceRange(false);
            fetchData();
          }}
          onError={(msg) => { haptic("error"); toast.error(msg); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENT: Recurring schedule sheet
// Patron defines weekday × time pattern + a date range. We insert
// one schedule row for each matching day in the range, skipping
// days that already have a shift for this user (avoid duplicates).
// ─────────────────────────────────────────────────────────────

type WeekdayKey = "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";
const WEEKDAYS: { key: WeekdayKey; label: string; jsDow: number }[] = [
  { key: "lundi", label: "Lun", jsDow: 1 },
  { key: "mardi", label: "Mar", jsDow: 2 },
  { key: "mercredi", label: "Mer", jsDow: 3 },
  { key: "jeudi", label: "Jeu", jsDow: 4 },
  { key: "vendredi", label: "Ven", jsDow: 5 },
  { key: "samedi", label: "Sam", jsDow: 6 },
  { key: "dimanche", label: "Dim", jsDow: 0 },
];

interface DayPattern { enabled: boolean; start: string; end: string; }

function defaultPattern(): Record<WeekdayKey, DayPattern> {
  return {
    lundi: { enabled: false, start: "16:00", end: "01:00" },
    mardi: { enabled: false, start: "16:00", end: "01:00" },
    mercredi: { enabled: false, start: "16:00", end: "01:00" },
    jeudi: { enabled: false, start: "16:00", end: "01:00" },
    vendredi: { enabled: false, start: "16:00", end: "01:30" },
    samedi: { enabled: false, start: "16:00", end: "01:30" },
    dimanche: { enabled: false, start: "16:00", end: "01:00" },
  };
}

const isoDate2 = localISODate;

function RecurringScheduleSheet({
  activeUserName, activeUserId, patronId, supabase, existingSchedules,
  onClose, onApplied, onError,
}: {
  activeUserName: string;
  activeUserId: string;
  patronId: string;
  supabase: ReturnType<typeof createClient>;
  existingSchedules: Schedule[];
  onClose: () => void;
  onApplied: (count: number) => void;
  onError: (msg: string) => void;
}) {
  const [pattern, setPattern] = useState<Record<WeekdayKey, DayPattern>>(defaultPattern());
  const [fromDate, setFromDate] = useState<string>(() => isoDate2(new Date()));
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return isoDate2(d);
  });
  const [saving, setSaving] = useState(false);

  function togglePatternDay(k: WeekdayKey) {
    setPattern((p) => ({ ...p, [k]: { ...p[k], enabled: !p[k].enabled } }));
  }
  function setStart(k: WeekdayKey, v: string) {
    setPattern((p) => ({ ...p, [k]: { ...p[k], start: v } }));
  }
  function setEnd(k: WeekdayKey, v: string) {
    setPattern((p) => ({ ...p, [k]: { ...p[k], end: v } }));
  }

  // Compute target shifts to insert
  const targetShifts: { date: string; start_time: string; end_time: string }[] = (() => {
    const out: { date: string; start_time: string; end_time: string }[] = [];
    if (!fromDate || !toDate) return out;
    const start = new Date(fromDate + "T12:00:00");
    const end = new Date(toDate + "T12:00:00");
    if (end < start) return out;
    const existingDates = new Set(existingSchedules.map((s) => s.date));
    const cursor = new Date(start);
    while (cursor <= end) {
      const dow = cursor.getDay();
      const wd = WEEKDAYS.find((w) => w.jsDow === dow)!;
      const p = pattern[wd.key];
      if (p.enabled) {
        const iso = isoDate2(cursor);
        if (!existingDates.has(iso)) {
          out.push({ date: iso, start_time: p.start, end_time: p.end });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  })();

  async function apply() {
    if (targetShifts.length === 0) { onError("Aucun shift à créer (vérifie les jours et la plage)"); return; }
    setSaving(true);
    const rows = targetShifts.map((t) => ({
      user_id: activeUserId, date: t.date, start_time: t.start_time, end_time: t.end_time, created_by: patronId,
    }));
    const { error } = await supabase.from("schedules").insert(rows);
    setSaving(false);
    if (error) { onError(`Erreur : ${error.message}`); return; }
    onApplied(targetShifts.length);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-medium"
        style={{
          position: "relative", width: "100%", maxWidth: 512,
          maxHeight: "90vh", overflowY: "auto",
          padding: "20px 20px 24px",
          borderRadius: "20px 20px 0 0",
          animation: "fadeInUp 0.25s ease-out",
        }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14,
          background: "none", border: "none", cursor: "pointer", padding: 4,
        }}>
          <X size={20} style={{ color: "var(--text-tertiary)" }} />
        </button>

        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0, marginBottom: 4 }}>
          Plan récurrent
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
          Pour <b style={{ color: "var(--terra-medium)" }}>{activeUserName}</b>. Coche les jours, règle les heures, choisis la plage de dates → on remplit le calendrier.
        </p>

        {/* Date range */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Du</p>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{
              width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
              background: "var(--input-bg)", padding: "10px 12px",
              fontSize: 13, color: "var(--text-primary)", outline: "none",
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Au</p>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{
              width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
              background: "var(--input-bg)", padding: "10px 12px",
              fontSize: 13, color: "var(--text-primary)", outline: "none",
            }} />
          </div>
        </div>

        {/* Day rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {WEEKDAYS.map((wd) => {
            const p = pattern[wd.key];
            return (
              <div key={wd.key} className="card-light" style={{
                padding: "10px 12px",
                display: "flex", alignItems: "center", gap: 10,
                opacity: p.enabled ? 1 : 0.6,
              }}>
                <button
                  onClick={() => togglePatternDay(wd.key)}
                  style={{
                    width: 38, height: 32, borderRadius: 8,
                    background: p.enabled ? "var(--gradient-primary)" : "var(--secondary-bg)",
                    color: p.enabled ? "#fff" : "var(--text-tertiary)",
                    border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  {wd.label}
                </button>
                <input
                  type="time"
                  value={p.start}
                  onChange={(e) => setStart(wd.key, e.target.value)}
                  disabled={!p.enabled}
                  style={{
                    flex: 1, borderRadius: 8, border: "1px solid var(--border-color)",
                    background: "var(--input-bg)", padding: "6px 8px",
                    fontSize: 13, color: "var(--text-primary)", outline: "none",
                  }}
                />
                <span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>→</span>
                <input
                  type="time"
                  value={p.end}
                  onChange={(e) => setEnd(wd.key, e.target.value)}
                  disabled={!p.enabled}
                  style={{
                    flex: 1, borderRadius: 8, border: "1px solid var(--border-color)",
                    background: "var(--input-bg)", padding: "6px 8px",
                    fontSize: 13, color: "var(--text-primary)", outline: "none",
                  }}
                />
              </div>
            );
          })}
        </div>

        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 12, lineHeight: 1.5 }}>
          {targetShifts.length === 0
            ? "Aucun shift ne sera créé. Coche au moins un jour ou ajuste la plage."
            : `${targetShifts.length} shift${targetShifts.length > 1 ? "s" : ""} seront créés. Les jours qui ont déjà un shift pour ${activeUserName} sont sautés automatiquement.`}
        </p>

        <button
          onClick={apply}
          disabled={saving || targetShifts.length === 0}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12, marginTop: 14,
            background: "var(--gradient-primary)", color: "#fff",
            border: "none", cursor: saving || targetShifts.length === 0 ? "default" : "pointer",
            opacity: saving || targetShifts.length === 0 ? 0.5 : 1,
            fontSize: 14, fontWeight: 600, minHeight: 48,
          }}
        >
          {saving ? "..." : `Appliquer (${targetShifts.length})`}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SUB-COMPONENT: Absence range sheet
// Patron marks a user as absent over a date range — bulk-creates
// availability_requests with status='accepted' and removes any
// schedules in the range so the calendar reflects the absence.
// ─────────────────────────────────────────────────────────────

function AbsenceRangeSheet({
  activeUserName, activeUserId, existingSchedules, supabase, onClose, onApplied, onError,
}: {
  activeUserName: string;
  activeUserId: string;
  existingSchedules: Schedule[];
  supabase: ReturnType<typeof createClient>;
  onClose: () => void;
  onApplied: (count: number) => void;
  onError: (msg: string) => void;
}) {
  const [fromDate, setFromDate] = useState<string>(() => isoDate2(new Date()));
  const [toDate, setToDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return isoDate2(d);
  });
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  // Compute affected days
  const affectedDays: string[] = (() => {
    if (!fromDate || !toDate) return [];
    const start = new Date(fromDate + "T12:00:00");
    const end = new Date(toDate + "T12:00:00");
    if (end < start) return [];
    const out: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      out.push(isoDate2(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  })();

  const conflictShiftIds = existingSchedules.filter((s) => affectedDays.includes(s.date)).map((s) => s.id);

  async function apply() {
    if (affectedDays.length === 0) { onError("Plage vide"); return; }
    setSaving(true);

    // 1. Insert availability_requests with status='accepted' for each day
    const requestRows = affectedDays.map((d) => ({
      user_id: activeUserId,
      date: d,
      reason: reason.trim() || null,
      status: "accepted" as const,
    }));
    const { error: reqErr } = await supabase.from("availability_requests").insert(requestRows);
    if (reqErr) {
      setSaving(false);
      onError(`Erreur absence : ${reqErr.message}`);
      return;
    }

    // 2. Delete conflicting schedules (the user won't work those days)
    if (conflictShiftIds.length > 0) {
      const { error: delErr } = await supabase.from("schedules").delete().in("id", conflictShiftIds);
      if (delErr) {
        setSaving(false);
        onError(`Erreur suppression shifts : ${delErr.message}`);
        return;
      }
    }

    setSaving(false);
    onApplied(affectedDays.length);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "flex-end", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      }} />
      <div
        onClick={(e) => e.stopPropagation()}
        className="card-medium"
        style={{
          position: "relative", width: "100%", maxWidth: 512,
          maxHeight: "85vh", overflowY: "auto",
          padding: "20px 20px 24px",
          borderRadius: "20px 20px 0 0",
          animation: "fadeInUp 0.25s ease-out",
        }}
      >
        <button onClick={onClose} style={{
          position: "absolute", top: 14, right: 14,
          background: "none", border: "none", cursor: "pointer", padding: 4,
        }}>
          <X size={20} style={{ color: "var(--text-tertiary)" }} />
        </button>

        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: 0, marginBottom: 4 }}>
          Marquer absent (durée)
        </h2>
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 16 }}>
          <b style={{ color: "var(--terra-medium)" }}>{activeUserName}</b> ne sera pas présent·e sur la plage choisie. Les shifts existants seront supprimés automatiquement.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Du</p>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{
              width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
              background: "var(--input-bg)", padding: "10px 12px",
              fontSize: 13, color: "var(--text-primary)", outline: "none",
            }} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Au (inclus)</p>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{
              width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
              background: "var(--input-bg)", padding: "10px 12px",
              fontSize: 13, color: "var(--text-primary)", outline: "none",
            }} />
          </div>
        </div>

        <div>
          <p style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>Raison (optionnel)</p>
          <textarea
            placeholder="Ex: arrêt maladie, congés payés, formation…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            style={{
              width: "100%", borderRadius: 10, border: "1px solid var(--border-color)",
              background: "var(--input-bg)", padding: "10px 12px",
              fontSize: 13, color: "var(--text-primary)",
              outline: "none", resize: "none",
              fontFamily: "inherit",
            }}
          />
        </div>

        <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 12, lineHeight: 1.5 }}>
          {affectedDays.length} jour{affectedDays.length > 1 ? "s" : ""} d&apos;absence
          {conflictShiftIds.length > 0 ? ` · ${conflictShiftIds.length} shift${conflictShiftIds.length > 1 ? "s" : ""} sera${conflictShiftIds.length > 1 ? "ont" : ""} supprimé${conflictShiftIds.length > 1 ? "s" : ""}` : ""}.
        </p>

        <button
          onClick={apply}
          disabled={saving || affectedDays.length === 0}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12, marginTop: 14,
            background: "var(--danger)", color: "#fff",
            border: "none", cursor: saving || affectedDays.length === 0 ? "default" : "pointer",
            opacity: saving || affectedDays.length === 0 ? 0.5 : 1,
            fontSize: 14, fontWeight: 600, minHeight: 48,
          }}
        >
          {saving ? "..." : "Confirmer l'absence"}
        </button>
      </div>
    </div>
  );
}
