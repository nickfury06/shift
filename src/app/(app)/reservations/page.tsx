"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, formatDateFr, formatTime, getNow } from "@/lib/shift-utils";
import { SEATING_LABELS, SEATING_ICONS, TYPE_LABELS, SOURCE_LABELS, SOURCE_ICONS, TABLE_ZONE_LABELS } from "@/lib/constants";
import type { Reservation, VenueTable, ReservationSeating, ReservationType, ReservationSource } from "@/lib/types";
import { Plus, ChevronLeft, ChevronRight, Check, Trash2, X, Users, Armchair } from "lucide-react";

export default function ReservationsPage() {
  const { profile, user } = useAuth();
  const supabase = useRef(createClient()).current;

  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<VenueTable[]>([]);
  const [dateOffset, setDateOffset] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [covers, setCovers] = useState(2);
  const [time, setTime] = useState("20:00");
  const [seating, setSeating] = useState<ReservationSeating>("terrasse");
  const [type, setType] = useState<ReservationType>("diner");
  const [source, setSource] = useState<ReservationSource>("telephone");
  const [tableId, setTableId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const shiftDate = getShiftDate();
  const viewDate = (() => {
    const d = new Date(shiftDate);
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().split("T")[0];
  })();
  const viewDateLabel = formatDateFr(viewDate);
  const isToday = dateOffset === 0;

  const fetchData = useCallback(async () => {
    const [resaRes, tableRes] = await Promise.all([
      supabase
        .from("reservations")
        .select("*")
        .eq("date", viewDate)
        .order("time", { ascending: true }),
      supabase
        .from("venue_tables")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);
    setReservations((resaRes.data as Reservation[]) || []);
    setTables((tableRes.data as VenueTable[]) || []);
    setLoading(false);
  }, [supabase, viewDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("reservations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations", filter: `date=eq.${viewDate}` },
        () => fetchData()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabase, viewDate, fetchData]);

  // ── Capacity calculations ─────────────────────────────
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);
  const bookedCovers = reservations.reduce((sum, r) => sum + r.covers, 0);
  const insideCovers = reservations.filter((r) => r.seating === "interieur").reduce((sum, r) => sum + r.covers, 0);
  const outsideCovers = reservations.filter((r) => r.seating === "terrasse").reduce((sum, r) => sum + r.covers, 0);
  const insideCapacity = tables.filter((t) => t.zone === "restaurant").reduce((sum, t) => sum + t.capacity, 0);
  const outsideCapacity = tables.filter((t) => t.zone !== "restaurant" && t.zone !== "bar").reduce((sum, t) => sum + t.capacity, 0);

  // Tables available for assignment (filter by seating choice & capacity)
  const availableTables = tables
    .filter((t) => {
      if (seating === "interieur") return t.zone === "restaurant";
      return t.zone === "terrasse" || t.zone === "terrasse_couverte";
    })
    .filter((t) => t.capacity >= covers || t.max_capacity >= covers);

  // Tables already booked for this date
  const bookedTableIds = new Set(reservations.filter((r) => r.table_id).map((r) => r.table_id));

  function resetForm() {
    setName("");
    setCovers(2);
    setTime("20:00");
    setSeating("terrasse");
    setType("diner");
    setSource("telephone");
    setTableId(null);
    setNotes("");
    setShowForm(false);
  }

  async function handleSave() {
    if (!name.trim() || !user || saving) return;
    setSaving(true);

    const payload = {
      name: name.trim(),
      covers,
      time,
      date: viewDate,
      seating,
      type,
      source,
      table_id: tableId,
      notes: notes.trim() || null,
      created_by: user.id,
    };

    await supabase.from("reservations").insert(payload);
    setSaving(false);
    resetForm();
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

  // Overdue helper
  function getOverdueMin(resaTime: string): number {
    if (!isToday) return 0;
    const now = getNow();
    const [h, m] = resaTime.split(":").map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    const resTime = new Date(now);
    resTime.setHours(h, m, 0);
    const diff = Math.floor((now.getTime() - resTime.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  }

  const attendu = reservations.filter((r) => r.status === "attendu");
  const arrived = reservations.filter((r) => r.status === "arrive");

  if (loading) {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-light" style={{ height: 72, borderRadius: 16, marginBottom: 10, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">

      {/* ── Header ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
          Réservations
        </h1>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus size={16} />
          Ajouter
        </button>
      </div>

      {/* ── Date nav ───────────────────────────────────────── */}
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

      {/* ── Capacity summary ───────────────────────────────── */}
      <div className="card-medium" style={{ padding: 14, marginBottom: 20, display: "flex", justifyContent: "space-around", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "var(--text-primary)" }}>
            {reservations.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Résas</div>
        </div>
        <div style={{ width: 1, background: "var(--border-color)" }} />
        <div>
          <div style={{ fontSize: 20, fontWeight: 600, color: bookedCovers > totalCapacity ? "var(--danger)" : "var(--text-primary)" }}>
            {bookedCovers}<span style={{ fontSize: 13, fontWeight: 400, color: "var(--text-tertiary)" }}>/{totalCapacity}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Couverts</div>
        </div>
        <div style={{ width: 1, background: "var(--border-color)" }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)" }}>
            🏠 {insideCovers}/{insideCapacity}
          </div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-secondary)", marginTop: 2 }}>
            ☀️ {outsideCovers}/{outsideCapacity}
          </div>
        </div>
      </div>

      {/* ── Reservation list ───────────────────────────────── */}
      {attendu.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: arrived.length > 0 ? 24 : 0 }}>
          {attendu.map((resa) => {
            const overdue = getOverdueMin(resa.time);
            const tableInfo = resa.table_id ? tables.find((t) => t.id === resa.table_id) : null;
            return (
              <div
                key={resa.id}
                className="card-medium"
                style={{
                  padding: "12px 14px",
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "all 0.3s ease",
                  opacity: deletingId === resa.id ? 0 : 1,
                  transform: deletingId === resa.id ? "translateX(-40px)" : "translateX(0)",
                  borderLeft: overdue >= 15 ? `3px solid ${overdue >= 30 ? "var(--danger)" : "var(--warning)"}` : undefined,
                }}
              >
                {/* Time */}
                <div style={{ fontSize: 14, fontWeight: 600, color: "#8B5A40", minWidth: 42, flexShrink: 0 }}>
                  {formatTime(resa.time)}
                </div>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{resa.name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, color: "#A85D3F",
                      background: "rgba(196,120,90,0.08)", padding: "2px 7px", borderRadius: 6,
                    }}>
                      {resa.covers} pers.
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap", fontSize: 12, color: "var(--text-secondary)" }}>
                    <span>{SEATING_ICONS[resa.seating]} {SEATING_LABELS[resa.seating]}</span>
                    <span style={{ color: "var(--text-tertiary)" }}>&middot;</span>
                    <span>{TYPE_LABELS[resa.type]}</span>
                    {tableInfo && (
                      <>
                        <span style={{ color: "var(--text-tertiary)" }}>&middot;</span>
                        <span style={{ fontWeight: 500 }}>Table {tableInfo.id}</span>
                      </>
                    )}
                    {resa.notes && (
                      <span style={{ fontSize: 11, color: "var(--warning)", fontWeight: 500 }}>
                        ⚠️ {resa.notes}
                      </span>
                    )}
                    {overdue >= 15 && (
                      <span style={{ fontSize: 11, fontWeight: 600, color: overdue >= 30 ? "var(--danger)" : "var(--warning)" }}>
                        🔔 {overdue}min retard
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={() => toggleArrived(resa)}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      border: "2px solid #8B5A40", background: "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", padding: 0,
                    }}
                    aria-label="Marquer arrivé"
                  >
                    <Check size={16} strokeWidth={2.5} style={{ color: "rgba(139,90,64,0.5)" }} />
                  </button>
                  <button
                    onClick={() => handleDelete(resa.id)}
                    style={{
                      width: 36, height: 36, borderRadius: "50%",
                      background: "transparent", border: "none",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", padding: 0,
                    }}
                    aria-label="Supprimer"
                  >
                    <Trash2 size={14} style={{ color: "var(--text-tertiary)" }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Arrived section */}
      {arrived.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
            Arrivés ({arrived.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {arrived.map((resa) => (
              <div
                key={resa.id}
                className="card-light"
                style={{
                  padding: "10px 14px", opacity: 0.55,
                  display: "flex", alignItems: "center", gap: 12,
                  transition: "all 0.3s ease",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 500, color: "#8B5A40", minWidth: 42 }}>
                  {formatTime(resa.time)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{resa.name}</span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 8 }}>{resa.covers} pers.</span>
                </div>
                <button
                  onClick={() => toggleArrived(resa)}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    border: "2px solid #8B5A40", background: "#8B5A40",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", padding: 0,
                  }}
                  aria-label="Annuler arrivée"
                >
                  <Check size={14} strokeWidth={2.5} style={{ color: "#fff" }} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {reservations.length === 0 && (
        <div className="card-light" style={{ padding: 32, textAlign: "center" }}>
          <Armchair size={28} style={{ color: "var(--text-tertiary)", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Aucune réservation</p>
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
            Appuie sur &quot;Ajouter&quot; pour en créer une
          </p>
        </div>
      )}

      {/* ── Add reservation modal ──────────────────────────── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={resetForm} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }} />
          <div
            className="card-medium"
            style={{
              position: "relative", width: "100%", maxWidth: 512, maxHeight: "90vh",
              overflowY: "auto", padding: 20, borderRadius: "20px 20px 0 0",
              animation: "fadeInUp 0.25s ease-out",
            }}
          >
            {/* Close button */}
            <button
              onClick={resetForm}
              style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", padding: 4 }}
            >
              <X size={20} style={{ color: "var(--text-tertiary)" }} />
            </button>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p className="section-label">Nouvelle réservation</p>

              {/* Name */}
              <input
                type="text"
                placeholder="Nom"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                style={{
                  width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                  background: "var(--input-bg)", padding: "10px 12px", fontSize: 14,
                  color: "var(--text-primary)", outline: "none",
                }}
              />

              {/* Covers + Time row */}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Personnes</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      onClick={() => setCovers(Math.max(1, covers - 1))}
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "var(--secondary-bg)", border: "none", cursor: "pointer",
                        fontSize: 18, color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      −
                    </button>
                    <span style={{ fontSize: 18, fontWeight: 600, color: "var(--text-primary)", minWidth: 28, textAlign: "center" }}>
                      {covers}
                    </span>
                    <button
                      onClick={() => setCovers(covers + 1)}
                      style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: "var(--secondary-bg)", border: "none", cursor: "pointer",
                        fontSize: 18, color: "var(--text-secondary)", display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Heure</p>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    style={{
                      width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                      background: "var(--input-bg)", padding: "8px 12px", fontSize: 14,
                      color: "var(--text-primary)", outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* Seating */}
              <div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Emplacement</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["terrasse", "interieur"] as ReservationSeating[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSeating(s); setTableId(null); }}
                      style={{
                        flex: 1, borderRadius: 12, padding: "10px 0", border: "none", cursor: "pointer",
                        fontSize: 14, fontWeight: 500,
                        background: seating === s ? "var(--gradient-primary)" : "var(--secondary-bg)",
                        color: seating === s ? "#fff" : "var(--text-secondary)",
                        transition: "all 0.2s",
                      }}
                    >
                      {SEATING_ICONS[s]} {SEATING_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type */}
              <div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Type</p>
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
                        transition: "all 0.2s",
                      }}
                    >
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source */}
              <div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Source</p>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["telephone", "instagram", "walk-in"] as ReservationSource[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSource(s)}
                      style={{
                        flex: 1, borderRadius: 12, padding: "8px 0", border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 500,
                        background: source === s ? "var(--gradient-primary)" : "var(--secondary-bg)",
                        color: source === s ? "#fff" : "var(--text-secondary)",
                        transition: "all 0.2s",
                      }}
                    >
                      {SOURCE_ICONS[s]} {SOURCE_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table assignment */}
              <div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Table (optionnel)
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button
                    onClick={() => setTableId(null)}
                    style={{
                      borderRadius: 10, padding: "6px 12px", border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 500,
                      background: tableId === null ? "var(--gradient-primary)" : "var(--secondary-bg)",
                      color: tableId === null ? "#fff" : "var(--text-secondary)",
                    }}
                  >
                    Aucune
                  </button>
                  {availableTables.map((t) => {
                    const isBooked = bookedTableIds.has(t.id);
                    const isSelected = tableId === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => !isBooked && setTableId(isSelected ? null : t.id)}
                        disabled={isBooked}
                        style={{
                          borderRadius: 10, padding: "6px 10px", border: "none", cursor: isBooked ? "not-allowed" : "pointer",
                          fontSize: 12, fontWeight: 500,
                          opacity: isBooked ? 0.35 : 1,
                          background: isSelected ? "var(--gradient-primary)" : "var(--secondary-bg)",
                          color: isSelected ? "#fff" : "var(--text-secondary)",
                        }}
                      >
                        {t.id} <span style={{ fontSize: 10, opacity: 0.7 }}>({t.capacity}p)</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Détails (allergènes, enfants, demandes...)
                </p>
                <textarea
                  placeholder="Ex: allergie gluten, 2 enfants, anniversaire..."
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

              {/* Submit */}
              <button
                onClick={handleSave}
                disabled={!name.trim() || saving}
                style={{
                  width: "100%", borderRadius: 12, padding: "12px 0",
                  fontSize: 14, fontWeight: 500, color: "#fff",
                  background: "var(--gradient-primary)", border: "none", cursor: "pointer",
                  opacity: !name.trim() || saving ? 0.5 : 1,
                  transition: "opacity 0.2s",
                }}
              >
                {saving ? "..." : "Confirmer la réservation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
