"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ZONE_OPTIONS, ZONE_LABELS, MOMENT_ORDER, MOMENT_LABELS, WORK_DAYS, DAY_LABELS } from "@/lib/constants";
import type { Task, Profile, Zone, Moment, DayOfWeek } from "@/lib/types";
import { Plus, Pencil, Trash2, X } from "lucide-react";

export default function TasksPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [editing, setEditing] = useState<Task | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filterMoment, setFilterMoment] = useState<Moment | "all">("all");

  // Form state
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [zone, setZone] = useState<Zone>("restaurant");
  const [moment, setMoment] = useState<Moment>("ouverture");
  const [priority, setPriority] = useState(3);
  const [days, setDays] = useState<DayOfWeek[]>([...WORK_DAYS]);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [isReminder, setIsReminder] = useState(false);
  const [isLibre, setIsLibre] = useState(false);

  useEffect(() => {
    if (!profile || profile.role !== "patron") {
      router.push("/ce-soir");
      return;
    }

    async function load() {
      const [{ data: tasksData }, { data: staffData }] = await Promise.all([
        supabase.from("tasks").select("*").order("moment").order("priority"),
        supabase.from("profiles").select("*").neq("role", "patron"),
      ]);
      setTasks(tasksData || []);
      setStaffList(staffData || []);
      setLoading(false);
    }

    load();
  }, [profile, router, supabase]);

  function resetForm() {
    setTitle("");
    setNote("");
    setZone("restaurant");
    setMoment("ouverture");
    setPriority(3);
    setDays([...WORK_DAYS]);
    setAssignedTo([]);
    setIsReminder(false);
    setIsLibre(false);
    setEditing(null);
    setShowForm(false);
  }

  function startEdit(task: Task) {
    setTitle(task.title);
    setNote(task.note || "");
    setZone(task.zone);
    setMoment(task.moment);
    setPriority(task.priority);
    setDays(task.days);
    setAssignedTo(task.assigned_to);
    setIsReminder(task.is_reminder);
    setIsLibre(task.is_libre);
    setEditing(task);
    setShowForm(true);
  }

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || !profile) return;

    const taskData = {
      title: title.trim(),
      note: note.trim() || null,
      zone,
      moment,
      priority,
      days,
      assigned_to: isLibre ? [] : assignedTo,
      is_reminder: isReminder,
      is_libre: isLibre,
      created_by: profile.id,
    };

    if (editing) {
      const { data } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", editing.id)
        .select()
        .single();
      if (data) setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
    } else {
      const { data } = await supabase
        .from("tasks")
        .insert(taskData)
        .select()
        .single();
      if (data) setTasks((prev) => [...prev, data]);
    }

    resetForm();
  }, [title, note, zone, moment, priority, days, assignedTo, isReminder, isLibre, editing, profile, supabase]);

  async function handleDelete(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function toggleDay(day: DayOfWeek) {
    setDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function toggleStaff(id: string) {
    setAssignedTo((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  const filtered = filterMoment === "all"
    ? tasks
    : tasks.filter((t) => t.moment === filterMoment);

  if (loading) {
    return <div className="p-4 max-w-lg mx-auto space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-card animate-pulse" />)}</div>;
  }

  if (!profile || profile.role !== "patron") return null;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)" }}>Tâches</h1>
        <Button size="sm" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} className="mr-1" /> Nouvelle
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <Button
          variant={filterMoment === "all" ? "default" : "secondary"}
          size="sm"
          onClick={() => setFilterMoment("all")}
        >
          Toutes
        </Button>
        {MOMENT_ORDER.map((m) => (
          <Button
            key={m}
            variant={filterMoment === m ? "default" : "secondary"}
            size="sm"
            onClick={() => setFilterMoment(m)}
          >
            {MOMENT_LABELS[m]}
          </Button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 p-4 rounded-lg bg-card space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">{editing ? "Modifier" : "Nouvelle tâche"}</h3>
            <button onClick={resetForm}><X size={18} className="text-muted-foreground" /></button>
          </div>

          <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Note (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />

          <div className="grid grid-cols-2 gap-2">
            <Select value={zone} onValueChange={(v) => setZone(v as Zone)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ZONE_OPTIONS.map((z) => (
                  <SelectItem key={z} value={z}>{ZONE_LABELS[z]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={moment} onValueChange={(v) => setMoment(v as Moment)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOMENT_ORDER.map((m) => (
                  <SelectItem key={m} value={m}>{MOMENT_LABELS[m]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Priorité</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  className="w-8 h-8 rounded text-xs font-bold transition-colors"
                  style={{
                    background: priority === p ? "var(--primary)" : "var(--secondary)",
                    color: priority === p ? "var(--primary-foreground)" : "var(--foreground)",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Jours</label>
            <div className="flex gap-1 flex-wrap">
              {WORK_DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className="px-2 py-1 rounded text-xs transition-colors"
                  style={{
                    background: days.includes(d) ? "var(--primary)" : "var(--secondary)",
                    color: days.includes(d) ? "var(--primary-foreground)" : "var(--foreground)",
                  }}
                >
                  {DAY_LABELS[d].slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isReminder} onCheckedChange={(c) => setIsReminder(!!c)} />
              Rappel (non-cochable)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isLibre} onCheckedChange={(c) => setIsLibre(!!c)} />
              Tâche libre
            </label>
          </div>

          {!isLibre && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Assigné à</label>
              <div className="flex gap-1 flex-wrap">
                {staffList.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleStaff(s.id)}
                    className="px-2 py-1 rounded text-xs transition-colors"
                    style={{
                      background: assignedTo.includes(s.id) ? "var(--primary)" : "var(--secondary)",
                      color: assignedTo.includes(s.id) ? "var(--primary-foreground)" : "var(--foreground)",
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full">
            {editing ? "Enregistrer" : "Créer la tâche"}
          </Button>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2">
        {filtered.map((task) => (
          <div key={task.id} className="p-3 rounded-lg bg-card flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{task.title}</span>
                <Badge variant="secondary" className="text-xs">{MOMENT_LABELS[task.moment]}</Badge>
                <Badge variant="outline" className="text-xs">{ZONE_LABELS[task.zone]}</Badge>
                {task.is_libre && <Badge variant="outline" className="text-xs border-dashed">libre</Badge>}
                {task.is_reminder && <Badge variant="outline" className="text-xs">🔔</Badge>}
              </div>
              {task.note && <p className="text-xs text-muted-foreground mt-0.5">{task.note}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">
                {task.is_libre
                  ? "Tout le monde"
                  : task.assigned_to.map((id) => staffList.find((s) => s.id === id)?.name || "?").join(", ")}
              </p>
            </div>
            <div className="flex gap-1 ml-2">
              <button onClick={() => startEdit(task)} className="p-1.5 rounded hover:bg-secondary">
                <Pencil size={14} className="text-muted-foreground" />
              </button>
              <button onClick={() => handleDelete(task.id)} className="p-1.5 rounded hover:bg-secondary">
                <Trash2 size={14} className="text-destructive" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
