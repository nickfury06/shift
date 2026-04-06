"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { ZONE_LABELS, MOMENT_LABELS, DAY_LABELS, MOMENT_ORDER } from "@/lib/constants";
import type { Task, Zone, Moment, Day } from "@/lib/types";
import { Plus, Trash2, Edit3 } from "lucide-react";

type FilterCategory = "all" | Zone;

export default function TasksPage() {
  const { profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>("all");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [zone, setZone] = useState<Zone>("restaurant");
  const [moment, setMoment] = useState<Moment>("ouverture");
  const [day, setDay] = useState<Day>("lundi");
  const [priority, setPriority] = useState(0);
  const [description, setDescription] = useState("");

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("zone")
      .order("moment")
      .order("priority", { ascending: true });
    setTasks((data as Task[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

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

  function resetForm() {
    setTitle("");
    setZone("restaurant");
    setMoment("ouverture");
    setDay("lundi");
    setPriority(0);
    setDescription("");
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(task: Task) {
    setTitle(task.title);
    setZone(task.zone);
    setMoment(task.moment);
    setDay(task.day);
    setPriority(task.priority);
    setDescription(task.description || "");
    setEditId(task.id);
    setShowForm(true);
  }

  async function handleSave() {
    if (!title.trim()) return;

    const payload = {
      title: title.trim(),
      zone,
      moment,
      day,
      priority,
      description: description.trim() || null,
    };

    if (editId) {
      await supabase.from("tasks").update(payload).eq("id", editId);
    } else {
      await supabase.from("tasks").insert(payload);
    }

    resetForm();
    fetchTasks();
  }

  async function handleDelete(id: string) {
    await supabase.from("tasks").delete().eq("id", id);
    fetchTasks();
  }

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.zone === filter);

  const zones: FilterCategory[] = ["all", "restaurant", "terrasse", "bar_salle", "bar_backbar"];

  if (loading) {
    return (
      <div className="p-4 pb-28 max-w-lg mx-auto space-y-4">
        <div className="bg-card rounded-lg animate-pulse h-10 w-1/2" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-lg animate-pulse h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Taches</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {zones.map((z) => (
          <button
            key={z}
            onClick={() => setFilter(z)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === z
                ? "text-white"
                : "pill"
            }`}
            style={filter === z ? { background: "var(--gradient-primary)" } : undefined}
          >
            {z === "all" ? "Toutes" : ZONE_LABELS[z]}
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-base font-semibold tracking-tight">
            {editId ? "Modifier" : "Nouvelle tache"}
          </h3>

          <input
            type="text"
            placeholder="Titre de la tache"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl bg-input px-3 py-2 text-sm outline-none"
          />

          <textarea
            placeholder="Description (optionnel)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl bg-input px-3 py-2 text-sm outline-none resize-none"
            rows={2}
          />

          <div className="grid grid-cols-2 gap-2">
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value as Zone)}
              className="rounded-xl bg-input px-3 py-2 text-sm"
            >
              {(Object.keys(ZONE_LABELS) as Zone[]).map((z) => (
                <option key={z} value={z}>{ZONE_LABELS[z]}</option>
              ))}
            </select>

            <select
              value={moment}
              onChange={(e) => setMoment(e.target.value as Moment)}
              className="rounded-xl bg-input px-3 py-2 text-sm"
            >
              {MOMENT_ORDER.map((m) => (
                <option key={m} value={m}>{MOMENT_LABELS[m]}</option>
              ))}
            </select>

            <select
              value={day}
              onChange={(e) => setDay(e.target.value as Day)}
              className="rounded-xl bg-input px-3 py-2 text-sm"
            >
              {(Object.keys(DAY_LABELS) as Day[]).map((d) => (
                <option key={d} value={d}>{DAY_LABELS[d]}</option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Priorite"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              className="rounded-xl bg-input px-3 py-2 text-sm"
              min={0}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 rounded-xl px-3 py-2 text-sm font-medium text-white"
              style={{ background: "var(--gradient-primary)" }}
            >
              {editId ? "Enregistrer" : "Creer"}
            </button>
            <button
              onClick={resetForm}
              className="rounded-xl px-3 py-2 text-sm font-medium bg-secondary text-muted-foreground"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Task list */}
      <div className="space-y-2 stagger-children">
        {filtered.map((task) => (
          <div key={task.id} className="glass-card p-3 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{task.title}</p>
              {task.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
              )}
              <div className="flex gap-1.5 mt-1.5 flex-wrap">
                <span className="pill text-[10px]">{ZONE_LABELS[task.zone]}</span>
                <span className="pill text-[10px]">{MOMENT_LABELS[task.moment]}</span>
                <span className="pill text-[10px]">{DAY_LABELS[task.day]}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => startEdit(task)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary"
                aria-label="Modifier"
              >
                <Edit3 size={14} className="text-muted-foreground" />
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-secondary"
                aria-label="Supprimer"
              >
                <Trash2 size={14} className="text-destructive" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="glass-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucune tache</p>
          </div>
        )}
      </div>
    </div>
  );
}
