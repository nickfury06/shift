"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate } from "@/lib/shift-utils";
import type { Schedule, Profile, AvailabilityRequest } from "@/lib/types";
import { Plus, Trash2, X, CalendarOff, Check } from "lucide-react";

export default function PlanningPage() {
  const { profile, user } = useAuth();
  const supabase = useRef(createClient()).current;
  const isPatron = profile?.role === "patron";

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [availRequests, setAvailRequests] = useState<AvailabilityRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAvailForm, setShowAvailForm] = useState<string | null>(null); // date string
  const [availReason, setAvailReason] = useState("");

  // Add shift form
  const [newUserId, setNewUserId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("16:00");
  const [newEnd, setNewEnd] = useState("01:00");

  // Next 7 days
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }

  const fetchData = useCallback(async () => {
    const [{ data: sched }, { data: staff }, { data: avail }] = await Promise.all([
      supabase.from("schedules").select("*").gte("date", days[0]).lte("date", days[6]),
      supabase.from("profiles").select("*").order("name"),
      supabase.from("availability_requests").select("*").gte("date", days[0]),
    ]);
    setSchedules(sched || []);
    setStaffList(staff || []);
    setAvailRequests(avail || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const today = getShiftDate();

  function formatDay(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
  }

  async function addShift() {
    if (!newUserId || !newDate || !user) return;
    const { error } = await supabase.from("schedules").insert({
      user_id: newUserId, date: newDate, start_time: newStart, end_time: newEnd, created_by: user.id,
    });
    if (!error) {
      setShowAddForm(false);
      setNewUserId("");
      setNewDate("");
      fetchData();
    }
  }

  async function deleteShift(id: string) {
    await supabase.from("schedules").delete().eq("id", id);
    fetchData();
  }

  async function submitAvailRequest(date: string) {
    if (!user) return;
    await supabase.from("availability_requests").insert({
      user_id: user.id, date, reason: availReason.trim() || null,
    });
    setShowAvailForm(null);
    setAvailReason("");
    fetchData();
  }

  async function handleAvailDecision(id: string, status: "accepted" | "refused") {
    await supabase.from("availability_requests").update({ status }).eq("id", id);
    if (status === "accepted") {
      const req = availRequests.find((r) => r.id === id);
      if (req) {
        const sched = schedules.find((s) => s.user_id === req.user_id && s.date === req.date);
        if (sched) await deleteShift(sched.id);
      }
    }
    fetchData();
  }

  const pendingRequests = availRequests.filter((r) => r.status === "pending");

  if (loading) {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card-light pulse" style={{ height: 48, borderRadius: 16, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Planning</h1>
        {isPatron && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              display: "flex", alignItems: "center", gap: 6, borderRadius: 12,
              padding: "8px 16px", fontSize: 14, fontWeight: 500, color: "#fff",
              background: "var(--gradient-primary)", border: "none", cursor: "pointer",
            }}
          >
            <Plus size={16} /> Shift
          </button>
        )}
      </div>

      {/* Patron: pending absence requests */}
      {isPatron && pendingRequests.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <span className="section-label" style={{ display: "block", marginBottom: 8 }}>Demandes d&apos;absence</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingRequests.map((r) => (
              <div key={r.id} className="card-medium" style={{ padding: 16, borderLeft: "3px solid var(--warning)" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                  {staffList.find((s) => s.id === r.user_id)?.name} — {formatDay(r.date)}
                </div>
                {r.reason && (
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>{r.reason}</div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button
                    onClick={() => handleAvailDecision(r.id, "accepted")}
                    style={{
                      display: "flex", alignItems: "center", gap: 4, borderRadius: 10,
                      padding: "6px 14px", fontSize: 13, fontWeight: 500, color: "#fff",
                      background: "var(--gradient-primary)", border: "none", cursor: "pointer",
                    }}
                  >
                    <Check size={14} /> Accepter
                  </button>
                  <button
                    onClick={() => handleAvailDecision(r.id, "refused")}
                    style={{
                      borderRadius: 10, padding: "6px 14px", fontSize: 13, fontWeight: 500,
                      color: "var(--text-secondary)", background: "var(--secondary-bg)",
                      border: "1px solid var(--border-color)", cursor: "pointer",
                    }}
                  >
                    Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add shift form (patron) */}
      {showAddForm && isPatron && (
        <div className="card-medium" style={{ padding: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="section-label">Nouveau shift</span>
            <button onClick={() => setShowAddForm(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
              <X size={16} style={{ color: "var(--text-tertiary)" }} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <select
              value={newUserId}
              onChange={(e) => setNewUserId(e.target.value)}
              style={{
                width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                background: "var(--input-bg)", padding: "10px 12px", fontSize: 14,
                color: "var(--text-primary)", outline: "none",
              }}
            >
              <option value="">Choisir un employé</option>
              {staffList.filter((s) => s.role !== "patron").map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
              style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)}
                style={{ flex: 1, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", outline: "none" }}
              />
              <span style={{ color: "var(--text-tertiary)" }}>→</span>
              <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)}
                style={{ flex: 1, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", outline: "none" }}
              />
            </div>
            <button onClick={addShift} disabled={!newUserId || !newDate}
              style={{ width: "100%", borderRadius: 12, padding: "10px 0", fontSize: 14, fontWeight: 500, color: "#fff", background: "var(--gradient-primary)", border: "none", cursor: "pointer", opacity: !newUserId || !newDate ? 0.5 : 1 }}
            >
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* Schedule by day */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {days.map((day) => {
          const daySchedules = schedules
            .filter((s) => s.date === day)
            .filter((s) => isPatron || s.user_id === user?.id);

          const isToday = day === today;
          const mySchedule = schedules.find((s) => s.user_id === user?.id && s.date === day);
          const myAvailReq = availRequests.find((r) => r.user_id === user?.id && r.date === day);

          return (
            <div key={day}>
              <div style={{
                fontSize: 13, fontWeight: 600, letterSpacing: "0.04em",
                color: isToday ? "var(--terra-medium)" : "var(--text-tertiary)",
                marginBottom: 8, textTransform: "uppercase",
              }}>
                {formatDay(day)} {isToday && "· Aujourd'hui"}
              </div>

              {daySchedules.length === 0 ? (
                <div className="card-light" style={{ padding: "12px 16px", fontSize: 13, color: "var(--text-tertiary)" }}>
                  {isPatron ? "Aucun shift" : "Repos"}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {daySchedules.map((s) => (
                    <div key={s.id} className="card-light" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {isPatron && (
                          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                            {staffList.find((p) => p.id === s.user_id)?.name}
                          </span>
                        )}
                        <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>
                          {s.start_time.slice(0, 5)} → {s.end_time.slice(0, 5)}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {/* Staff: request absence button */}
                        {!isPatron && mySchedule?.id === s.id && !myAvailReq && (
                          <button
                            onClick={() => setShowAvailForm(day)}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                            title="Demander une absence"
                          >
                            <CalendarOff size={16} style={{ color: "var(--text-tertiary)" }} />
                          </button>
                        )}
                        {/* Show request status */}
                        {myAvailReq && myAvailReq.date === day && (
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                            background: myAvailReq.status === "pending" ? "var(--secondary-bg)"
                              : myAvailReq.status === "accepted" ? "rgba(139,90,64,0.1)"
                              : "rgba(200,90,90,0.1)",
                            color: myAvailReq.status === "pending" ? "var(--text-secondary)"
                              : myAvailReq.status === "accepted" ? "var(--terra-deep)"
                              : "var(--danger)",
                          }}>
                            {myAvailReq.status === "pending" ? "En attente" : myAvailReq.status === "accepted" ? "Acceptée" : "Refusée"}
                          </span>
                        )}
                        {isPatron && (
                          <button onClick={() => deleteShift(s.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                            <Trash2 size={14} style={{ color: "var(--danger)" }} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Absence request inline form */}
              {showAvailForm === day && (
                <div className="card-medium" style={{ padding: 16, marginTop: 8 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Demander une absence</span>
                    <textarea
                      placeholder="Raison (optionnel)"
                      value={availReason}
                      onChange={(e) => setAvailReason(e.target.value)}
                      rows={2}
                      style={{
                        width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                        background: "var(--input-bg)", padding: "10px 12px", fontSize: 14,
                        color: "var(--text-primary)", outline: "none", resize: "none",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => submitAvailRequest(day)}
                        style={{
                          borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 500,
                          color: "#fff", background: "var(--gradient-primary)", border: "none", cursor: "pointer",
                        }}
                      >
                        Envoyer
                      </button>
                      <button
                        onClick={() => { setShowAvailForm(null); setAvailReason(""); }}
                        style={{
                          borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 500,
                          color: "var(--text-secondary)", background: "var(--secondary-bg)",
                          border: "1px solid var(--border-color)", cursor: "pointer",
                        }}
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
