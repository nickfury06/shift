"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import type { Ritual, Event, Day } from "@/lib/types";
import { Plus, Trash2, Edit3, X, Calendar, Repeat } from "lucide-react";

const DAY_OPTIONS: { value: Day; label: string }[] = [
  { value: "mardi", label: "Mardi" },
  { value: "mercredi", label: "Mercredi" },
  { value: "jeudi", label: "Jeudi" },
  { value: "vendredi", label: "Vendredi" },
  { value: "samedi", label: "Samedi" },
];

export default function EventsPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const supabase = useRef(createClient()).current;

  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"rituels" | "events">("rituels");

  // Ritual form
  const [showRitualForm, setShowRitualForm] = useState(false);
  const [editRitualId, setEditRitualId] = useState<string | null>(null);
  const [rDay, setRDay] = useState<Day>("mardi");
  const [rTime, setRTime] = useState("");
  const [rName, setRName] = useState("");
  const [rDescription, setRDescription] = useState("");
  const [rOrganizer, setROrganizer] = useState("");

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [eDate, setEDate] = useState("");
  const [eTime, setETime] = useState("");
  const [eName, setEName] = useState("");
  const [eDescription, setEDescription] = useState("");

  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    const [ritRes, evtRes] = await Promise.all([
      supabase.from("rituals").select("*").order("sort_order"),
      supabase.from("events").select("*").order("date", { ascending: false }).limit(20),
    ]);
    setRituals((ritRes.data as Ritual[]) || []);
    setEvents((evtRes.data as Event[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (profile?.role !== "patron") {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div className="card-medium" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Accès réservé au patron</p>
        </div>
      </div>
    );
  }

  function resetRitualForm() {
    setRDay("mardi"); setRTime(""); setRName(""); setRDescription(""); setROrganizer("");
    setEditRitualId(null); setShowRitualForm(false);
  }

  function startEditRitual(r: Ritual) {
    setRDay(r.day); setRTime(r.time); setRName(r.name);
    setRDescription(r.description || ""); setROrganizer(r.organizer || "");
    setEditRitualId(r.id); setShowRitualForm(true);
  }

  async function saveRitual() {
    if (!rName.trim() || !rTime.trim() || saving) return;
    setSaving(true);
    const payload = {
      day: rDay, time: rTime.trim(), name: rName.trim(),
      description: rDescription.trim() || null,
      organizer: rOrganizer.trim() || null,
    };
    let error = null;
    if (editRitualId) {
      const res = await supabase.from("rituals").update(payload).eq("id", editRitualId);
      error = res.error;
    } else {
      const res = await supabase.from("rituals").insert({ ...payload, sort_order: rituals.length + 1 });
      error = res.error;
    }
    setSaving(false);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success(editRitualId ? "Rituel modifié" : "Rituel créé");
    resetRitualForm();
    fetchData();
  }

  async function deleteRitual(id: string) {
    const r = rituals.find((x) => x.id === id);
    const ok = await confirm({
      title: "Supprimer ce rituel ?",
      message: r?.name ? `"${r.name}" sera supprimé.` : undefined,
      variant: "danger",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    const { error } = await supabase.from("rituals").delete().eq("id", id);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success("Rituel supprimé");
    fetchData();
  }

  async function toggleRitual(id: string, active: boolean) {
    await supabase.from("rituals").update({ active }).eq("id", id);
    fetchData();
  }

  function resetEventForm() {
    setEDate(""); setETime(""); setEName(""); setEDescription("");
    setShowEventForm(false);
  }

  async function saveEvent() {
    if (!eName.trim() || !eDate || !user || saving) return;
    setSaving(true);
    const { error } = await supabase.from("events").insert({
      title: eName.trim(),
      description: eDescription.trim() || null,
      date: eDate,
      start_time: eTime || null,
      created_by: user.id,
    });
    setSaving(false);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success("Événement créé");
    resetEventForm();
    fetchData();
  }

  async function deleteEvent(id: string) {
    const ok = await confirm({
      title: "Supprimer cet événement ?",
      variant: "danger",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success("Événement supprimé");
    fetchData();
  }

  // Group rituals by day
  const ritualsByDay = DAY_OPTIONS.map((d) => ({
    ...d,
    items: rituals.filter((r) => r.day === d.value),
  })).filter((d) => d.items.length > 0);

  if (loading) {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-light pulse" style={{ height: 56, borderRadius: 16, marginBottom: 10, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Événements
        </h1>
        <button
          onClick={() => tab === "rituels" ? setShowRitualForm(true) : setShowEventForm(true)}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--secondary-bg)", borderRadius: 14, padding: 4 }}>
        {([
          { key: "rituels" as const, label: "Rituels", icon: <Repeat size={14} /> },
          { key: "events" as const, label: "Ponctuels", icon: <Calendar size={14} /> },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              borderRadius: 10, padding: "10px 0", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500,
              background: tab === t.key ? "var(--card-bg)" : "transparent",
              color: tab === t.key ? "var(--text-primary)" : "var(--text-tertiary)",
              boxShadow: tab === t.key ? "var(--shadow-light)" : "none",
              transition: "all 0.2s",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ═══ RITUELS ═════════════════════════════════════ */}
      {tab === "rituels" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {ritualsByDay.map((day) => (
            <div key={day.value}>
              <p className="section-label" style={{ marginBottom: 8 }}>{day.label}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {day.items.map((r) => (
                  <div key={r.id} className="card-light" style={{
                    padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10,
                    opacity: r.active ? 1 : 0.4,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--terra-medium)" }}>{r.time}</span>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{r.name}</span>
                      </div>
                      {r.description && (
                        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.4 }}>{r.description}</p>
                      )}
                      {r.organizer && (
                        <p style={{ fontSize: 11, color: "var(--terra-medium)", marginTop: 2 }}>Animé par {r.organizer}</p>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {/* Toggle active */}
                      <button
                        onClick={() => toggleRitual(r.id, !r.active)}
                        style={{
                          width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                          background: r.active ? "var(--gradient-primary)" : "var(--secondary-bg)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, color: r.active ? "#fff" : "var(--text-tertiary)",
                        }}
                        title={r.active ? "Désactiver" : "Activer"}
                      >
                        {r.active ? "ON" : "OFF"}
                      </button>
                      <button onClick={() => startEditRitual(r)} style={{ width: 32, height: 32, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Edit3 size={14} style={{ color: "var(--text-tertiary)" }} />
                      </button>
                      <button onClick={() => deleteRitual(r.id)} style={{ width: 32, height: 32, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Trash2 size={14} style={{ color: "var(--text-tertiary)" }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {ritualsByDay.length === 0 && (
            <div className="card-light" style={{ padding: 32, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Aucun rituel configuré</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ EVENTS PONCTUELS ════════════════════════════ */}
      {tab === "events" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {events.map((e) => (
            <div key={e.id} className="card-light" style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {e.start_time && <span style={{ fontSize: 12, fontWeight: 600, color: "var(--terra-medium)" }}>{e.start_time}</span>}
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{e.title}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>{e.date}</div>
                {e.description && <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{e.description}</p>}
              </div>
              <button onClick={() => deleteEvent(e.id)} style={{ width: 32, height: 32, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trash2 size={14} style={{ color: "var(--text-tertiary)" }} />
              </button>
            </div>
          ))}
          {events.length === 0 && (
            <div className="card-light" style={{ padding: 32, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Aucun événement ponctuel</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ RITUAL FORM MODAL ═══════════════════════════ */}
      {showRitualForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={resetRitualForm} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div className="card-medium" style={{
            position: "relative", width: "100%", maxWidth: 512, maxHeight: "85vh",
            overflowY: "auto", padding: 20, borderRadius: "20px 20px 0 0",
            animation: "fadeInUp 0.25s ease-out",
          }}>
            <button onClick={resetRitualForm} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <X size={20} style={{ color: "var(--text-tertiary)" }} />
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>
                {editRitualId ? "Modifier le rituel" : "Nouveau rituel"}
              </p>

              {/* Day */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAY_OPTIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setRDay(d.value)}
                    style={{
                      padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
                      fontSize: 13, fontWeight: 500,
                      background: rDay === d.value ? "var(--gradient-primary)" : "var(--secondary-bg)",
                      color: rDay === d.value ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <input type="text" placeholder="Heure (ex: 21h)" value={rTime} onChange={(e) => setRTime(e.target.value)}
                  style={{ flex: 1, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", outline: "none" }} />
                <input type="text" placeholder="Nom" value={rName} onChange={(e) => setRName(e.target.value)}
                  style={{ flex: 2, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", outline: "none" }} />
              </div>

              <input type="text" placeholder="Animé par (optionnel)" value={rOrganizer} onChange={(e) => setROrganizer(e.target.value)}
                style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", outline: "none" }} />

              <textarea placeholder="Description — comment ça se passe, quoi préparer..." value={rDescription} onChange={(e) => setRDescription(e.target.value)} rows={3}
                style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", outline: "none", resize: "none" }} />

              <button onClick={saveRitual} disabled={!rName.trim() || !rTime.trim() || saving}
                style={{ width: "100%", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 600, color: "#fff", background: "var(--gradient-primary)", border: "none", cursor: "pointer", opacity: !rName.trim() || !rTime.trim() || saving ? 0.5 : 1 }}>
                {saving ? "..." : editRitualId ? "Enregistrer" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ EVENT FORM MODAL ════════════════════════════ */}
      {showEventForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={resetEventForm} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div className="card-medium" style={{
            position: "relative", width: "100%", maxWidth: 512, maxHeight: "85vh",
            overflowY: "auto", padding: 20, borderRadius: "20px 20px 0 0",
            animation: "fadeInUp 0.25s ease-out",
          }}>
            <button onClick={resetEventForm} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <X size={20} style={{ color: "var(--text-tertiary)" }} />
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>Nouvel événement</p>

              <input type="text" placeholder="Nom de l'événement" value={eName} onChange={(e) => setEName(e.target.value)}
                style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", outline: "none" }} />

              <div style={{ display: "flex", gap: 10 }}>
                <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)}
                  style={{ flex: 1, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", outline: "none" }} />
                <input type="text" placeholder="Heure (ex: 22h)" value={eTime} onChange={(e) => setETime(e.target.value)}
                  style={{ flex: 1, borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 14, color: "var(--text-primary)", outline: "none" }} />
              </div>

              <textarea placeholder="Description (optionnel)" value={eDescription} onChange={(e) => setEDescription(e.target.value)} rows={3}
                style={{ width: "100%", borderRadius: 12, border: "1px solid var(--border-color)", background: "var(--input-bg)", padding: "10px 12px", fontSize: 13, color: "var(--text-primary)", outline: "none", resize: "none" }} />

              <button onClick={saveEvent} disabled={!eName.trim() || !eDate || saving}
                style={{ width: "100%", borderRadius: 14, padding: "14px 0", fontSize: 15, fontWeight: 600, color: "#fff", background: "var(--gradient-primary)", border: "none", cursor: "pointer", opacity: !eName.trim() || !eDate || saving ? 0.5 : 1 }}>
                {saving ? "..." : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
