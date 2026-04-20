"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, formatDateFr, formatTime, getNow } from "@/lib/shift-utils";
import { SEATING_LABELS, SEATING_ICONS, TYPE_LABELS, SOURCE_LABELS, SOURCE_ICONS } from "@/lib/constants";
import type { Reservation, VenueTable, ReservationSeating, ReservationType, ReservationSource } from "@/lib/types";
import type { Profile } from "@/lib/types";
import { Plus, ChevronLeft, ChevronRight, Check, Trash2, X, Armchair, Phone, ChevronDown, Heart, ThumbsUp, ThumbsDown, List, Map } from "lucide-react";
import FloorPlan from "@/components/FloorPlan";

export default function ReservationsPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [dateOffset, setDateOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [view, setView] = useState<"list" | "plan">("list");
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const isPatron = profile?.role === "patron";

  // Form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [covers, setCovers] = useState(2);
  const [formDate, setFormDate] = useState("");
  const [time, setTime] = useState("20:00");
  const [seating, setSeating] = useState<ReservationSeating>("terrasse");
  const [type, setType] = useState<ReservationType>("diner");
  const [source, setSource] = useState<ReservationSource>("telephone");
  const [tableId, setTableId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isFnF, setIsFnF] = useState(false);

  const shiftDate = getShiftDate();
  const viewDate = (() => {
    const d = new Date(shiftDate);
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().split("T")[0];
  })();
  const viewDateLabel = formatDateFr(viewDate);
  const isToday = dateOffset === 0;

  const fetchData = useCallback(async () => {
    const [resaRes, tableRes, profRes] = await Promise.all([
      supabase.from("reservations").select("*").eq("date", viewDate).order("time", { ascending: true }),
      supabase.from("venue_tables").select("*").order("sort_order", { ascending: true }),
      supabase.from("profiles").select("id, name"),
    ]);
    setReservations((resaRes.data as Reservation[]) || []);
    setTables((tableRes.data as VenueTable[]) || []);
    const map: Record<string, string> = {};
    ((profRes.data as Pick<Profile, "id" | "name">[]) || []).forEach((p) => { map[p.id] = p.name; });
    setProfileMap(map);
    setLoading(false);
  }, [supabase, viewDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase
      .channel("reservations-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `date=eq.${viewDate}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, viewDate, fetchData]);

  // ── Capacity ──────────────────────────────────────────
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  const bookedCovers = reservations.reduce((sum, r) => sum + r.covers, 0);

  // For form: tables filtered by seating
  const formTables = tables.filter((t) => {
    if (seating === "interieur") return t.zone === "restaurant";
    if (seating === "bar") return t.zone === "bar";
    return t.zone === "terrasse" || t.zone === "terrasse_couverte";
  });
  // For the date the form targets
  const formTargetDate = formDate || viewDate;
  const [formDateResas, setFormDateResas] = useState<Reservation[]>([]);

  // Fetch resas for the form's selected date (for table availability)
  useEffect(() => {
    if (!showForm) return;
    if (formTargetDate === viewDate) {
      setFormDateResas(reservations);
      return;
    }
    supabase.from("reservations").select("*").eq("date", formTargetDate).then(({ data }) => {
      setFormDateResas((data as Reservation[]) || []);
    });
  }, [showForm, formTargetDate, viewDate, reservations, supabase]);

  const bookedTableIds = new Set(formDateResas.filter((r) => r.table_id).map((r) => r.table_id));

  function openForm() {
    setName("");
    setPhone("");
    setCovers(2);
    setFormDate(viewDate);
    setTime("20:00");
    setSeating("terrasse");
    setType("diner");
    setSource("telephone");
    setTableId(null);
    setNotes("");
    setIsFnF(false);
    setShowDetails(false);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim() || !user || saving) return;
    setSaving(true);
    const { error } = await supabase.from("reservations").insert({
      name: name.trim(),
      phone: phone.trim() || null,
      covers,
      time,
      date: formTargetDate,
      seating,
      type,
      source,
      table_id: tableId,
      notes: notes.trim() || null,
      created_by: user.id,
      fnf_requested_by: isFnF ? user.id : null,
      fnf_status: isFnF ? "pending" : null,
    });
    setSaving(false);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success(isFnF ? "Réservation créée, F&F en attente" : "Réservation créée");
    setShowForm(false);
    fetchData();
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await new Promise((r) => setTimeout(r, 250));
    setReservations((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null);
    await supabase.from("reservations").delete().eq("id", id);
  }

  async function toggleArrived(resa: Reservation) {
    if (!profile) return;
    if (resa.status === "arrive") {
      await supabase.from("reservations").update({ status: "attendu", arrived_by: null }).eq("id", resa.id);
    } else {
      await supabase.from("reservations").update({ status: "arrive", arrived_by: profile.id }).eq("id", resa.id);
    }
    fetchData();
  }

  async function requestFnF(resaId: string) {
    if (!user) return;
    await supabase.from("reservations").update({
      fnf_requested_by: user.id,
      fnf_status: "pending",
    }).eq("id", resaId);
    fetchData();
  }

  async function respondFnF(resaId: string, status: "accepted" | "refused") {
    await supabase.from("reservations").update({ fnf_status: status }).eq("id", resaId);
    fetchData();
  }

  async function cancelFnF(resaId: string) {
    await supabase.from("reservations").update({
      fnf_requested_by: null,
      fnf_status: null,
    }).eq("id", resaId);
    fetchData();
  }

  function getOverdueMin(resaTime: string): number {
    if (!isToday) return 0;
    const now = getNow();
    const [h, m] = resaTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    const rt = new Date(now);
    rt.setHours(h, m, 0);
    const diff = Math.floor((now.getTime() - rt.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  }

  const attendu = reservations.filter((r) => r.status === "attendu");
  const arrived = reservations.filter((r) => r.status === "arrive");

  if (loading) {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-light pulse" style={{ height: 72, borderRadius: 16, marginBottom: 10, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Réservations
        </h1>
        <button
          onClick={openForm}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* Date nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={() => setDateOffset((o) => o - 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <ChevronLeft size={20} style={{ color: "var(--text-secondary)" }} />
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
          {isToday ? "Ce soir" : viewDateLabel}
        </span>
        <button onClick={() => setDateOffset((o) => o + 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <ChevronRight size={20} style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>

      {/* Capacity summary — compact single row */}
      <div className="card-medium" style={{ padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: bookedCovers > totalCapacity ? "var(--danger)" : "var(--text-primary)" }}>
            {bookedCovers}
          </span>
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>/{totalCapacity} couverts</span>
        </div>
        <div style={{ width: 1, height: 20, background: "var(--border-color)" }} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          {reservations.length} résa{reservations.length > 1 ? "s" : ""}
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8, fontSize: 11, color: "var(--text-tertiary)" }}>
          <span>☀️{reservations.filter((r) => r.seating === "terrasse").reduce((s, r) => s + r.covers, 0)}</span>
          <span>🏠{reservations.filter((r) => r.seating === "interieur").reduce((s, r) => s + r.covers, 0)}</span>
          <span>🍸{reservations.filter((r) => r.seating === "bar").reduce((s, r) => s + r.covers, 0)}</span>
        </div>
      </div>

      {/* View toggle: Liste / Plan */}
      <div style={{ display: "flex", gap: 4, background: "var(--secondary-bg)", borderRadius: 10, padding: 3, marginBottom: 16 }}>
        {([
          { key: "list" as const, label: "Liste", icon: <List size={13} /> },
          { key: "plan" as const, label: "Plan", icon: <Map size={13} /> },
        ]).map((v) => (
          <button
            key={v.key}
            onClick={() => setView(v.key)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 500,
              background: view === v.key ? "var(--card-bg)" : "transparent",
              color: view === v.key ? "var(--text-primary)" : "var(--text-tertiary)",
              boxShadow: view === v.key ? "var(--shadow-light)" : "none",
              transition: "all 0.2s",
            }}
          >
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {/* Plan view */}
      {view === "plan" && (
        <FloorPlan tables={tables} reservations={reservations} />
      )}

      {/* Reservation list — attendu */}
      {view === "list" && attendu.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: arrived.length > 0 ? 24 : 0 }}>
          {attendu.map((resa) => {
            const overdue = getOverdueMin(resa.time);
            const tbl = resa.table_id ? tables.find((t) => t.id === resa.table_id) : null;
            return (
              <div
                key={resa.id}
                className="card-medium"
                style={{
                  padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
                  transition: "all 0.3s ease",
                  opacity: deletingId === resa.id ? 0 : 1,
                  transform: deletingId === resa.id ? "translateX(-40px)" : "translateX(0)",
                  borderLeft: overdue >= 15 ? `3px solid ${overdue >= 30 ? "var(--danger)" : "var(--warning)"}` : undefined,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: "#8B5A40", minWidth: 42, flexShrink: 0 }}>
                  {formatTime(resa.time)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{resa.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#A85D3F", background: "rgba(196,120,90,0.08)", padding: "2px 7px", borderRadius: 6 }}>
                      {resa.covers} pers.
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
                    <span>{SEATING_ICONS[resa.seating]} {SEATING_LABELS[resa.seating]}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>&middot;</span>
                    <span>{TYPE_LABELS[resa.type]}</span>
                    {tbl && (
                      <>
                        <span style={{ color: "var(--text-tertiary)" }}>&middot;</span>
                        <span style={{ fontWeight: 500 }}>T.{tbl.id}</span>
                      </>
                    )}
                    {resa.phone && (
                      <a href={`tel:${resa.phone}`} style={{ color: "#8B5A40", fontWeight: 500, textDecoration: "none", display: "flex", alignItems: "center", gap: 2 }}>
                        <Phone size={10} /> {resa.phone}
                      </a>
                    )}
                  </div>
                  {resa.notes && (
                    <div style={{ fontSize: 11, color: "var(--warning)", fontWeight: 500, marginTop: 3 }}>
                      ⚠️ {resa.notes}
                    </div>
                  )}
                  {overdue >= 15 && (
                    <div style={{ fontSize: 11, fontWeight: 600, color: overdue >= 30 ? "var(--danger)" : "var(--warning)", marginTop: 2 }}>
                      🔔 {overdue}min de retard
                    </div>
                  )}
                  {/* F&F badge */}
                  {resa.fnf_status && (
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6, marginTop: 4,
                      padding: "4px 10px", borderRadius: 8,
                      background: resa.fnf_status === "accepted" ? "rgba(139,90,64,0.1)"
                        : resa.fnf_status === "refused" ? "rgba(200,60,60,0.08)"
                        : "rgba(200,170,50,0.1)",
                      fontSize: 11, fontWeight: 600,
                    }}>
                      <Heart size={12} style={{
                        color: resa.fnf_status === "accepted" ? "#8B5A40"
                          : resa.fnf_status === "refused" ? "var(--danger)"
                          : "var(--warning)",
                        fill: resa.fnf_status === "accepted" ? "#8B5A40" : "none",
                      }} />
                      <span style={{
                        color: resa.fnf_status === "accepted" ? "#8B5A40"
                          : resa.fnf_status === "refused" ? "var(--danger)"
                          : "var(--warning)",
                      }}>
                        F&F {resa.fnf_status === "pending" ? `— ${profileMap[resa.fnf_requested_by!] || "Staff"}` : resa.fnf_status === "accepted" ? "accepté" : "refusé"}
                      </span>
                      {/* Patron: approve/refuse buttons */}
                      {isPatron && resa.fnf_status === "pending" && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); respondFnF(resa.id, "accepted"); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, marginLeft: 4 }}
                          >
                            <ThumbsUp size={14} style={{ color: "#8B5A40" }} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); respondFnF(resa.id, "refused"); }}
                            style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}
                          >
                            <ThumbsDown size={14} style={{ color: "var(--danger)" }} />
                          </button>
                        </>
                      )}
                      {/* Staff can cancel their own pending request */}
                      {!isPatron && resa.fnf_status === "pending" && resa.fnf_requested_by === user?.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); cancelFnF(resa.id); }}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 2, marginLeft: 2 }}
                        >
                          <X size={12} style={{ color: "var(--text-tertiary)" }} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                  {/* F&F request button (staff only, no existing request) */}
                  {!resa.fnf_status && (
                    <button
                      onClick={() => requestFnF(resa.id)}
                      title="Demander F&F"
                      style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "transparent", border: "1px dashed var(--border-color)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer", padding: 0,
                      }}
                    >
                      <Heart size={14} style={{ color: "var(--text-tertiary)" }} />
                    </button>
                  )}
                  <button onClick={() => toggleArrived(resa)} style={{ width: 36, height: 36, borderRadius: "50%", border: "2px solid #8B5A40", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                    <Check size={16} strokeWidth={2.5} style={{ color: "rgba(139,90,64,0.5)" }} />
                  </button>
                  <button onClick={() => handleDelete(resa.id)} style={{ width: 36, height: 36, borderRadius: "50%", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                    <Trash2 size={14} style={{ color: "var(--text-tertiary)" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Arrived */}
      {view === "list" && arrived.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Arrivés ({arrived.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {arrived.map((resa) => (
              <div key={resa.id} className="card-light" style={{ padding: "10px 14px", opacity: 0.5, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#8B5A40", minWidth: 42 }}>{formatTime(resa.time)}</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{resa.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 8 }}>{resa.covers} pers.</span>
                </div>
                <button onClick={() => toggleArrived(resa)} style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #8B5A40", background: "#8B5A40", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}>
                  <Check size={14} strokeWidth={2.5} style={{ color: "#fff" }} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {view === "list" && reservations.length === 0 && (
        <div className="card-light" style={{ padding: 32, textAlign: "center" }}>
          <Armchair size={28} style={{ color: "var(--text-tertiary)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Aucune réservation</p>
        </div>
      )}

      {/* ── FORM MODAL ───────────────────────────────────── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={() => setShowForm(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div
            className="card-medium"
            style={{
              position: "relative", width: "100%", maxWidth: 512, maxHeight: "92vh",
              overflowY: "auto", padding: "24px 20px", borderRadius: "20px 20px 0 0",
              animation: "fadeInUp 0.25s ease-out",
            }}
          >
            <button onClick={() => setShowForm(false)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <X size={20} style={{ color: "var(--text-tertiary)" }} />
            </button>

            <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 20 }}>
              Nouvelle réservation
            </p>

            {/* ── Row 1: Nom + Téléphone ─────────────────── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <input
                type="text"
                placeholder="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                style={{
                  flex: 2, borderRadius: 12, border: "1px solid var(--border-color)",
                  background: "var(--input-bg)", padding: "12px 14px", fontSize: 15,
                  color: "var(--text-primary)", outline: "none",
                }}
              />
              <div style={{ flex: 1, position: "relative" }}>
                <Phone size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
                <input
                  type="tel"
                  placeholder="Tél."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                    background: "var(--input-bg)", padding: "12px 14px 12px 32px", fontSize: 14,
                    color: "var(--text-primary)", outline: "none",
                  }}
                />
              </div>
            </div>

            {/* ── Row 2: Personnes ────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 8 }}>Nombre de personnes</p>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCovers(n)}
                    style={{
                      flex: 1, height: 42, borderRadius: 10, border: "none", cursor: "pointer",
                      fontSize: 15, fontWeight: 600,
                      background: covers === n ? "var(--gradient-primary)" : "var(--secondary-bg)",
                      color: covers === n ? "#fff" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => {
                    const v = prompt("Nombre de personnes ?");
                    if (v && !isNaN(Number(v)) && Number(v) > 0) setCovers(Number(v));
                  }}
                  style={{
                    flex: 1, height: 42, borderRadius: 10, border: "none", cursor: "pointer",
                    fontSize: 13, fontWeight: 500,
                    background: covers > 8 ? "var(--gradient-primary)" : "var(--secondary-bg)",
                    color: covers > 8 ? "#fff" : "var(--text-tertiary)",
                  }}
                >
                  {covers > 8 ? covers : "9+"}
                </button>
              </div>
            </div>

            {/* ── Row 3: Date + Heure ────────────────────── */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Date</p>
                <input
                  type="date"
                  value={formDate || viewDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  style={{
                    width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                    background: "var(--input-bg)", padding: "10px 12px", fontSize: 14,
                    color: "var(--text-primary)", outline: "none",
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Heure</p>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{
                    width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                    background: "var(--input-bg)", padding: "10px 12px", fontSize: 14,
                    color: "var(--text-primary)", outline: "none",
                  }}
                />
              </div>
            </div>

            {/* ── Row 4: Emplacement (3 gros boutons) ────── */}
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 8 }}>Emplacement</p>
              <div style={{ display: "flex", gap: 8 }}>
                {(["terrasse", "interieur", "bar"] as ReservationSeating[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setSeating(s); setTableId(null); }}
                    style={{
                      flex: 1, borderRadius: 12, padding: "12px 0", border: "none", cursor: "pointer",
                      fontSize: 14, fontWeight: 500, textAlign: "center",
                      background: seating === s ? "var(--gradient-primary)" : "var(--secondary-bg)",
                      color: seating === s ? "#fff" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ fontSize: 20, marginBottom: 2 }}>{SEATING_ICONS[s]}</div>
                    {SEATING_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Row 5: Type ────────────────────────────── */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 8 }}>
                {(["diner", "drinks"] as ReservationType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    style={{
                      flex: 1, borderRadius: 12, padding: "10px 0", border: "none", cursor: "pointer",
                      fontSize: 14, fontWeight: 500,
                      background: type === t ? "var(--gradient-primary)" : "var(--secondary-bg)",
                      color: type === t ? "#fff" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >
                    {t === "diner" ? "🍽️" : "🥂"} {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* ── F&F toggle ────────────────────────────── */}
            <button
              onClick={() => setIsFnF(!isFnF)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "12px 14px", borderRadius: 12, border: "none", cursor: "pointer",
                background: isFnF ? "rgba(139,90,64,0.1)" : "var(--secondary-bg)",
                transition: "all 0.2s",
                marginBottom: 4,
              }}
            >
              <Heart
                size={18}
                style={{
                  color: isFnF ? "#8B5A40" : "var(--text-tertiary)",
                  fill: isFnF ? "#8B5A40" : "none",
                  transition: "all 0.2s",
                }}
              />
              <span style={{ fontSize: 14, fontWeight: 500, color: isFnF ? "#8B5A40" : "var(--text-secondary)" }}>
                Family & Friends
              </span>
              {isFnF && (
                <span style={{ marginLeft: "auto", fontSize: 11, color: "#8B5A40", fontWeight: 400 }}>
                  Demande envoyée au patron
                </span>
              )}
            </button>

            {/* ── Plus de détails (collapsible) ──────────── */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "10px 0", background: "none", border: "none",
                borderTop: "1px solid var(--border-color)",
                cursor: "pointer", marginBottom: showDetails ? 12 : 0,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
                Plus de détails
              </span>
              <ChevronDown
                size={16}
                style={{
                  color: "var(--text-tertiary)",
                  transition: "transform 0.2s",
                  transform: showDetails ? "rotate(180deg)" : "rotate(0)",
                }}
              />
            </button>

            {showDetails && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
                {/* Source */}
                <div>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Source</p>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["telephone", "instagram", "walk-in"] as ReservationSource[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSource(s)}
                        style={{
                          flex: 1, borderRadius: 10, padding: "8px 0", border: "none", cursor: "pointer",
                          fontSize: 12, fontWeight: 500,
                          background: source === s ? "var(--gradient-primary)" : "var(--secondary-bg)",
                          color: source === s ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {SOURCE_ICONS[s]} {SOURCE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Table</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      onClick={() => setTableId(null)}
                      style={{
                        borderRadius: 8, padding: "6px 12px", border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 500,
                        background: tableId === null ? "var(--gradient-primary)" : "var(--secondary-bg)",
                        color: tableId === null ? "#fff" : "var(--text-secondary)",
                      }}
                    >
                      Auto
                    </button>
                    {formTables.map((t) => {
                      const booked = bookedTableIds.has(t.id);
                      const sel = tableId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => !booked && setTableId(sel ? null : t.id)}
                          disabled={booked}
                          style={{
                            borderRadius: 8, padding: "6px 10px", border: "none",
                            cursor: booked ? "not-allowed" : "pointer",
                            fontSize: 12, fontWeight: 500, opacity: booked ? 0.3 : 1,
                            background: sel ? "var(--gradient-primary)" : "var(--secondary-bg)",
                            color: sel ? "#fff" : "var(--text-secondary)",
                          }}
                        >
                          {t.id} ({t.capacity}p)
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 6 }}>Notes</p>
                  <textarea
                    placeholder="Allergènes, enfants, anniversaire..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                      background: "var(--input-bg)", padding: "10px 12px", fontSize: 13,
                      color: "var(--text-primary)", outline: "none", resize: "none",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              style={{
                width: "100%", borderRadius: 14, padding: "14px 0", marginTop: 8,
                fontSize: 15, fontWeight: 600, color: "#fff",
                background: "var(--gradient-primary)", border: "none", cursor: "pointer",
                opacity: !name.trim() || saving ? 0.5 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {saving ? "..." : "Confirmer"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
