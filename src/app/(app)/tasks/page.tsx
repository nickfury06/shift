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
      <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div className="card-medium" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Acces reserve au patron</p>
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
      <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-light" style={{ height: 40, width: "50%", borderRadius: 8, opacity: 0.5 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-light" style={{ height: 80, borderRadius: 8, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 16 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Taches</h1>
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
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {zones.map((z) => (
            <button
              key={z}
              onClick={() => setFilter(z)}
              className={`pill ${filter === z ? "" : ""}`}
              style={filter === z ? { background: "var(--gradient-primary)", color: "#fff", flexShrink: 0 } : { flexShrink: 0 }}
            >
              {z === "all" ? "Toutes" : ZONE_LABELS[z]}
            </button>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div className="card-medium" style={{ padding: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p className="section-label">
                {editId ? "Modifier" : "Nouvelle tache"}
              </p>

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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
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

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleSave}
                  className="flex-1 rounded-xl px-3 py-2 text-sm font-medium text-white"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {editId ? "Enregistrer" : "Creer"}
                </button>
                <button
                  onClick={resetForm}
                  className="rounded-xl px-3 py-2 text-sm font-medium"
                  style={{ background: "var(--secondary-bg)", color: "var(--text-secondary)" }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Task list */}
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((task) => (
            <div key={task.id} className="card-light" style={{ padding: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{task.title}</p>
                {task.description && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{task.description}</p>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  <span className="pill">{ZONE_LABELS[task.zone]}</span>
                  <span className="pill">{MOMENT_LABELS[task.moment]}</span>
                  <span className="pill">{DAY_LABELS[task.day]}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                <button
                  onClick={() => startEdit(task)}
                  className="flex items-center justify-center rounded-lg hover:bg-secondary"
                  style={{ width: 32, height: 32 }}
                  aria-label="Modifier"
                >
                  <Edit3 size={14} style={{ color: "var(--text-tertiary)" }} />
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="flex items-center justify-center rounded-lg hover:bg-secondary"
                  style={{ width: 32, height: 32 }}
                  aria-label="Supprimer"
                >
                  <Trash2 size={14} className="text-destructive" />
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="card-light" style={{ padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Aucune tache</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
