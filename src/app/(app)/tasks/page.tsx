"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import { ZONE_LABELS, ZONE_COLORS, MOMENT_LABELS, MOMENT_ORDER } from "@/lib/constants";
import type { Task, Zone, Moment, Day, Profile } from "@/lib/types";
import { Plus, Trash2, Edit3, Bell } from "lucide-react";

// ── Work days & labels ────────────────────────────────────
const TASK_WORK_DAYS: Day[] = ["mardi", "mercredi", "jeudi", "vendredi", "samedi"];

const SHORT_DAY_LABELS: Record<Day, string> = {
  lundi: "Lun",
  mardi: "Mar",
  mercredi: "Mer",
  jeudi: "Jeu",
  vendredi: "Ven",
  samedi: "Sam",
  dimanche: "Dim",
};

type FilterCategory = "all" | Zone;

export default function TasksPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const supabase = useRef(createClient()).current;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [staff, setStaff] = useState<Pick<Profile, "id" | "name">[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterCategory>("all");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [zone, setZone] = useState<Zone>("restaurant");
  const [moment, setMoment] = useState<Moment>("ouverture");
  const [selectedDays, setSelectedDays] = useState<Day[]>([...TASK_WORK_DAYS]);
  const [priority, setPriority] = useState(1);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [isLibre, setIsLibre] = useState(false);
  const [isReminder, setIsReminder] = useState(false);

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

  const fetchStaff = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name")
      .order("name");
    setStaff(data || []);
  }, [supabase]);

  useEffect(() => {
    fetchTasks();
    fetchStaff();
  }, [fetchTasks, fetchStaff]);

  // Guard: patron only
  if (profile && profile.role !== "patron") {
    return (
      <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div className="card-medium" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Acces reserve au patron</p>
        </div>
      </div>
    );
  }

  function resetForm() {
    setTitle("");
    setNote("");
    setZone("restaurant");
    setMoment("ouverture");
    setSelectedDays([...TASK_WORK_DAYS]);
    setPriority(1);
    setSelectedStaff([]);
    setIsLibre(false);
    setIsReminder(false);
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(task: Task) {
    setTitle(task.title);
    setNote(task.note || "");
    setZone(task.zone);
    setMoment(task.moment);
    setSelectedDays(task.days || [...TASK_WORK_DAYS]);
    setPriority(task.priority);
    setSelectedStaff(task.assigned_to || []);
    setIsLibre(task.is_libre);
    setIsReminder(task.is_reminder);
    setEditId(task.id);
    setShowForm(true);
  }

  function toggleDay(d: Day) {
    setSelectedDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  }

  function toggleStaffMember(id: string) {
    setSelectedStaff((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (!title.trim() || selectedDays.length === 0 || saving) return;
    setSaving(true);

    const payload = {
      title: title.trim(),
      note: note.trim() || null,
      zone,
      moment,
      days: selectedDays,
      priority,
      assigned_to: isLibre ? [] : selectedStaff,
      is_reminder: isReminder,
      is_libre: isLibre,
      created_by: user?.id ?? null,
    };

    let error = null;
    if (editId) {
      const { created_by, ...updatePayload } = payload;
      setTasks((prev) =>
        prev.map((t) => (t.id === editId ? { ...t, ...updatePayload } : t))
      );
      const res = await supabase.from("tasks").update(updatePayload).eq("id", editId);
      error = res.error;
    } else {
      const res = await supabase.from("tasks").insert(payload);
      error = res.error;
    }

    setSaving(false);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success(editId ? "Tâche modifiée" : "Tâche créée");
    resetForm();
    fetchTasks();
  }

  async function handleDelete(id: string) {
    const task = tasks.find((t) => t.id === id);
    const ok = await confirm({
      title: "Supprimer cette tâche ?",
      message: task?.title ? `"${task.title}" sera définitivement supprimée.` : undefined,
      variant: "danger",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;

    setDeletingId(id);
    await new Promise((r) => setTimeout(r, 300));
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setDeletingId(null);
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error("Erreur, réessaie"); fetchTasks(); return; }
    toast.success("Tâche supprimée");
    fetchTasks();
  }

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.zone === filter);

  const zones: FilterCategory[] = ["all", "bar", "terrasse", "restaurant"];

  if (loading) {
    return (
      <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-light pulse" style={{ height: 40, width: "50%", borderRadius: 8, opacity: 0.5 }} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-light pulse" style={{ height: 80, borderRadius: 8, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Taches
          </h1>
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

        {/* Zone filter pills */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {zones.map((z) => (
            <button
              key={z}
              onClick={() => setFilter(z)}
              className="pill"
              style={
                filter === z
                  ? { background: "var(--gradient-primary)", color: "#fff", flexShrink: 0 }
                  : { flexShrink: 0 }
              }
            >
              {z === "all" ? "Tout" : ZONE_LABELS[z]}
            </button>
          ))}
        </div>

        {/* ── Form Modal ──────────────────────────────────── */}
        {showForm && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 100,
            display: "flex", alignItems: "flex-end", justifyContent: "center",
          }}>
            <div
              onClick={resetForm}
              style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
            />
            <div
              className="card-medium"
              style={{
                position: "relative", width: "100%", maxWidth: 512, maxHeight: "85vh",
                overflowY: "auto", padding: 20, borderRadius: "20px 20px 0 0",
                animation: "fadeInUp 0.25s ease-out",
              }}
            >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p className="section-label">
                {editId ? "Modifier" : "Nouvelle tache"}
              </p>

              {/* Title */}
              <input
                type="text"
                placeholder="Titre de la tache"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl bg-input px-3 py-2 text-sm outline-none"
              />

              {/* Note */}
              <textarea
                placeholder="Note (optionnel)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl bg-input px-3 py-2 text-sm outline-none resize-none"
                rows={2}
              />

              {/* Zone */}
              <div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Zone</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {(Object.keys(ZONE_LABELS) as Zone[]).map((z) => (
                    <button
                      key={z}
                      onClick={() => setZone(z)}
                      className="rounded-xl px-3 py-2 text-sm font-medium"
                      style={
                        zone === z
                          ? { background: ZONE_COLORS[z], color: "#fff" }
                          : { background: "var(--secondary-bg)", color: "var(--text-secondary)" }
                      }
                    >
                      {ZONE_LABELS[z]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Moment */}
              <div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>Moment</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {MOMENT_ORDER.map((m) => (
                    <button
                      key={m}
                      onClick={() => setMoment(m)}
                      className="rounded-xl px-3 py-2 text-sm font-medium"
                      style={
                        moment === m
                          ? { background: "var(--gradient-primary)", color: "#fff" }
                          : { background: "var(--secondary-bg)", color: "var(--text-secondary)" }
                      }
                    >
                      {MOMENT_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Days */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Jours</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setSelectedDays([...TASK_WORK_DAYS])}
                      style={{ fontSize: 11, fontWeight: 500, color: "var(--terra-medium)", background: "none", border: "none", cursor: "pointer", padding: 2 }}
                    >Tout</button>
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>·</span>
                    <button
                      onClick={() => setSelectedDays([])}
                      style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", padding: 2 }}
                    >Aucun</button>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {TASK_WORK_DAYS.map((d) => (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      className="rounded-xl px-3 py-2 text-sm font-medium"
                      style={
                        selectedDays.includes(d)
                          ? { background: "var(--gradient-primary)", color: "#fff" }
                          : { background: "var(--secondary-bg)", color: "var(--text-secondary)" }
                      }
                    >
                      {SHORT_DAY_LABELS[d]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Priorité</p>
                  <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>1 = Urgent · 5 = Bas</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className="rounded-xl text-sm font-medium"
                      style={{
                        width: 36,
                        height: 36,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        ...(priority === p
                          ? { background: "var(--gradient-primary)", color: "#fff" }
                          : { background: "var(--secondary-bg)", color: "var(--text-secondary)" }),
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles row */}
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                {/* Is libre */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <div
                    onClick={() => {
                      setIsLibre(!isLibre);
                      if (!isLibre) setSelectedStaff([]);
                    }}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      background: isLibre ? "var(--color-primary)" : "var(--secondary-bg)",
                      position: "relative",
                      transition: "background 0.2s",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        background: "#fff",
                        position: "absolute",
                        top: 2,
                        left: isLibre ? 20 : 2,
                        transition: "left 0.2s",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Libre (dispo pour tous)</span>
                </label>

                {/* Is reminder */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <div
                    onClick={() => setIsReminder(!isReminder)}
                    style={{
                      width: 40,
                      height: 22,
                      borderRadius: 11,
                      background: isReminder ? "var(--color-primary)" : "var(--secondary-bg)",
                      position: "relative",
                      transition: "background 0.2s",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 9,
                        background: "#fff",
                        position: "absolute",
                        top: 2,
                        left: isReminder ? 20 : 2,
                        transition: "left 0.2s",
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Rappel</span>
                </label>
              </div>

              {/* Assigned to (hidden if libre) */}
              {!isLibre && (
                <div>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
                    Assigne a (optionnel)
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {staff.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleStaffMember(s.id)}
                        className="rounded-xl px-3 py-2 text-sm font-medium"
                        style={
                          selectedStaff.includes(s.id)
                            ? { background: "var(--gradient-primary)", color: "#fff" }
                            : { background: "var(--secondary-bg)", color: "var(--text-secondary)" }
                        }
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 rounded-xl px-3 py-2 text-sm font-medium text-white"
                  style={{
                    background: "var(--gradient-primary)",
                    opacity: saving ? 0.7 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  {saving ? "..." : editId ? "Enregistrer" : "Créer"}
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
          </div>
        )}

        {/* ── Task list ───────────────────────────────────── */}
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((task) => (
            <div
              key={task.id}
              className="card-light"
              style={{
                padding: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                transition: "all 0.3s ease",
                opacity: deletingId === task.id ? 0 : 1,
                transform: deletingId === task.id ? "translateX(-40px) scale(0.95)" : "translateX(0) scale(1)",
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {task.is_reminder && (
                    <Bell size={14} style={{ color: "var(--color-primary)", flexShrink: 0 }} />
                  )}
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                    {task.title}
                  </p>
                </div>

                {task.note && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                    {task.note}
                  </p>
                )}

                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {/* Zone badge */}
                  <span
                    className="pill"
                    style={{ background: ZONE_COLORS[task.zone], color: "#fff", fontSize: 11 }}
                  >
                    {ZONE_LABELS[task.zone]}
                  </span>

                  {/* Moment */}
                  <span className="pill" style={{ fontSize: 11 }}>
                    {MOMENT_LABELS[task.moment]}
                  </span>

                  {/* Days pills */}
                  {task.days && task.days.length > 0 && (
                    <div style={{ display: "flex", gap: 4 }}>
                      {TASK_WORK_DAYS.filter((d) => task.days.includes(d)).map((d) => (
                        <span
                          key={d}
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: "var(--secondary-bg)",
                            color: "var(--text-secondary)",
                            fontWeight: 500,
                          }}
                        >
                          {SHORT_DAY_LABELS[d]}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Priority */}
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    P{task.priority}
                  </span>

                  {/* Libre badge */}
                  {task.is_libre && (
                    <span
                      className="pill"
                      style={{ fontSize: 10, background: "var(--color-primary)", color: "#fff" }}
                    >
                      Libre
                    </span>
                  )}
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
