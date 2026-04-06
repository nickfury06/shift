"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Schedule, Profile, AvailabilityRequest } from "@/lib/types";
import { Plus, Trash2, X, CalendarOff } from "lucide-react";

export default function PlanningPage() {
  const { profile, user } = useAuth();
  const supabase = createClient();
  const isPatron = profile?.role === "patron";

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [availRequests, setAvailRequests] = useState<AvailabilityRequest[]>([]);
  const [showAddShift, setShowAddShift] = useState(false);
  const [showAvailForm, setShowAvailForm] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Add shift form
  const [newUserId, setNewUserId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("16:00");
  const [newEnd, setNewEnd] = useState("01:00");

  // Availability form
  const [availReason, setAvailReason] = useState("");

  // Next 7 days
  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [{ data: sched }, { data: staff }, { data: avail }] = await Promise.all([
        supabase.from("schedules").select("*").gte("date", days[0]).lte("date", days[6]),
        supabase.from("profiles").select("*"),
        supabase.from("availability_requests").select("*").gte("date", days[0]),
      ]);
      setSchedules(sched || []);
      setStaffList(staff || []);
      setAvailRequests(avail || []);
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    return `${dayNames[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
  };

  const today = days[0];
  const isToday = (d: string) => d === today;

  async function addShift() {
    if (!newUserId || !newDate) return;
    const { data } = await supabase.from("schedules").insert({
      user_id: newUserId, date: newDate, start_time: newStart, end_time: newEnd, created_by: user?.id,
    }).select().single();
    if (data) setSchedules((prev) => [...prev, data]);
    setShowAddShift(false);
    setNewUserId(""); setNewDate("");
  }

  async function deleteShift(id: string) {
    await supabase.from("schedules").delete().eq("id", id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  }

  async function submitAvailRequest(date: string) {
    if (!user) return;
    const { data } = await supabase.from("availability_requests").insert({
      user_id: user.id, date, reason: availReason || null,
    }).select().single();
    if (data) setAvailRequests((prev) => [...prev, data]);
    setShowAvailForm(null); setAvailReason("");
  }

  async function handleAvailDecision(id: string, status: "accepted" | "refused") {
    const { data } = await supabase.from("availability_requests").update({ status }).eq("id", id).select().single();
    if (data) {
      setAvailRequests((prev) => prev.map((r) => r.id === id ? data : r));
      if (status === "accepted") {
        const req = availRequests.find((r) => r.id === id);
        if (req) {
          const sched = schedules.find((s) => s.user_id === req.user_id && s.date === req.date);
          if (sched) await deleteShift(sched.id);
        }
      }
    }
  }

  if (loading) {
    return <div className="p-4 max-w-lg mx-auto space-y-3">{[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-lg bg-card animate-pulse" />)}</div>;
  }

  if (!profile) return null;

  const pendingAvail = availRequests.filter((r) => r.status === "pending");

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Planning</h1>
        {isPatron && (
          <Button size="sm" onClick={() => setShowAddShift(!showAddShift)}>
            <Plus size={14} className="mr-1" /> Shift
          </Button>
        )}
      </div>

      {/* Patron: pending availability requests */}
      {isPatron && pendingAvail.length > 0 && (
        <div className="mb-4 space-y-2">
          <h3 className="text-sm font-medium text-primary">Demandes d&apos;indisponibilité</h3>
          {pendingAvail.map((r) => (
            <div key={r.id} className="p-3 rounded-lg glass-card border-l-[3px] border-l-warning">
              <p className="text-sm font-medium">{staffList.find((s) => s.id === r.user_id)?.name} — {formatDay(r.date)}</p>
              {r.reason && <p className="text-xs text-muted-foreground">{r.reason}</p>}
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => handleAvailDecision(r.id, "accepted")}>Accepter</Button>
                <Button size="sm" variant="secondary" onClick={() => handleAvailDecision(r.id, "refused")}>Refuser</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add shift form (patron) */}
      {showAddShift && isPatron && (
        <div className="mb-4 p-4 rounded-lg glass-card space-y-3">
          <div className="flex justify-between"><h3 className="font-medium text-sm">Nouveau shift</h3><button onClick={() => setShowAddShift(false)}><X size={16} className="text-muted-foreground" /></button></div>
          <Select value={newUserId} onValueChange={setNewUserId}>
            <SelectTrigger><SelectValue placeholder="Employé" /></SelectTrigger>
            <SelectContent>
              {staffList.filter((s) => s.role !== "patron").map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <div className="flex gap-2 items-center">
            <Input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            <span className="text-muted-foreground">→</span>
            <Input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
          </div>
          <Button className="w-full" onClick={addShift}>Ajouter</Button>
        </div>
      )}

      {/* Schedule grid */}
      {days.map((day) => {
        const daySchedules = schedules
          .filter((s) => s.date === day)
          .filter((s) => isPatron || s.user_id === user?.id);

        const myAvail = availRequests.find((r) => r.user_id === user?.id && r.date === day);
        const mySchedule = schedules.find((s) => s.user_id === user?.id && s.date === day);

        return (
          <div key={day} className="mb-3">
            <h3 className={`text-sm font-medium mb-1.5 ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
              {formatDay(day)} {isToday(day) && "· Aujourd'hui"}
            </h3>
            {daySchedules.length === 0 ? (
              <div className="p-2.5 rounded-lg glass-card text-xs text-muted-foreground">
                {isPatron ? "Aucun shift" : "Repos"}
              </div>
            ) : (
              <div className="space-y-1">
                {daySchedules.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg glass-card">
                    <div className="flex items-center gap-2">
                      {isPatron && <span className="text-sm font-medium">{staffList.find((p) => p.id === s.user_id)?.name}</span>}
                      <span className="text-sm">{s.start_time.slice(0, 5)} → {s.end_time.slice(0, 5)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isPatron && !myAvail && mySchedule?.id === s.id && (
                        <button onClick={() => setShowAvailForm(day)} className="p-1 rounded hover:bg-secondary">
                          <CalendarOff size={14} className="text-muted-foreground" />
                        </button>
                      )}
                      {myAvail && myAvail.date === day && (
                        <Badge variant={myAvail.status === "pending" ? "secondary" : myAvail.status === "accepted" ? "default" : "destructive"} className="text-xs">
                          {myAvail.status === "pending" ? "En attente" : myAvail.status === "accepted" ? "Acceptée" : "Refusée"}
                        </Badge>
                      )}
                      {isPatron && <button onClick={() => deleteShift(s.id)} className="p-1 rounded hover:bg-secondary"><Trash2 size={14} className="text-destructive" /></button>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Availability request inline form */}
            {showAvailForm === day && (
              <div className="mt-2 p-3 rounded-lg glass-card space-y-2">
                <Textarea placeholder="Raison (optionnel)" value={availReason} onChange={(e) => setAvailReason(e.target.value)} rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => submitAvailRequest(day)}>Envoyer</Button>
                  <Button size="sm" variant="secondary" onClick={() => setShowAvailForm(null)}>Annuler</Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
