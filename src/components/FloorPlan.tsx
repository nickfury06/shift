"use client";

/**
 * FloorPlan — SVG-based venue layout
 *
 * Viewer (everyone): shows spaces as rectangles and tables as circles,
 *   colored by booking status. Tap a table to see its reservation.
 *
 * Editor (patron): tap ✏️ to enter edit mode.
 *   • Add space: tap a preset button to drop a labeled rectangle
 *   • Drag space body: move
 *   • Drag space corner: resize
 *   • Tap space: rename, recolor, or delete
 *   • Drag tables anywhere (auto-assigns to whichever space they sit in)
 *
 * Coordinates live in an abstract 1000×700 SVG viewBox — scales to any
 * screen width while keeping numbers stable across devices.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import type { VenueTable, VenueSpace, Reservation } from "@/lib/types";
import { Plus, Pencil, Check, Trash2, X as XIcon, Move } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface FloorPlanProps {
  tables: VenueTable[];
  reservations?: Reservation[];
  onTableTap?: (table: VenueTable) => void;
}

const VIEWBOX_W = 1000;
const VIEWBOX_H = 700;
const TABLE_RADIUS = 24;
const MIN_SPACE_W = 120;
const MIN_SPACE_H = 80;

const SPACE_PRESETS: { label: string; zone: VenueSpace["zone"]; color: string }[] = [
  { label: "Terrasse", zone: "terrasse", color: "#D4A04A" },
  { label: "Terrasse couverte", zone: "terrasse_couverte", color: "#B89070" },
  { label: "Restaurant", zone: "restaurant", color: "#C4785A" },
  { label: "Bar", zone: "bar", color: "#8B5A40" },
];

type Drag =
  | { kind: "space"; id: string; offsetX: number; offsetY: number }
  | { kind: "resize"; id: string; startW: number; startH: number; startX: number; startY: number }
  | { kind: "table"; id: string; offsetX: number; offsetY: number }
  | null;

export default function FloorPlan({ tables, reservations = [], onTableTap }: FloorPlanProps) {
  const { profile } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const supabase = useRef(createClient()).current;
  const svgRef = useRef<SVGSVGElement>(null);

  const canEdit = profile?.role === "patron";

  const [editing, setEditing] = useState(false);
  const [spaces, setSpaces] = useState<VenueSpace[]>([]);
  const [localTables, setLocalTables] = useState<VenueTable[]>(tables);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Drag>(null);

  useEffect(() => { setLocalTables(tables); }, [tables]);

  // ── Load spaces ────────────────────────────────────────────
  const fetchSpaces = useCallback(async () => {
    const { data } = await supabase.from("venue_spaces").select("*").order("sort_order");
    setSpaces((data as VenueSpace[]) || []);
  }, [supabase]);

  useEffect(() => { fetchSpaces(); }, [fetchSpaces]);

  // ── Helpers ────────────────────────────────────────────────
  const bookedTableIds = new Set(
    reservations.filter((r) => r.table_id).map((r) => r.table_id)
  );

  function svgPoint(e: React.PointerEvent | PointerEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = VIEWBOX_W / rect.width;
    const scaleY = VIEWBOX_H / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function spaceAtPoint(x: number, y: number): VenueSpace | null {
    for (let i = spaces.length - 1; i >= 0; i--) {
      const s = spaces[i];
      if (x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height) return s;
    }
    return null;
  }

  // ── Mutations (patron) ─────────────────────────────────────
  async function addSpace(preset: (typeof SPACE_PRESETS)[number]) {
    haptic("medium");
    const { data, error } = await supabase.from("venue_spaces").insert({
      name: preset.label,
      zone: preset.zone,
      color: preset.color,
      x: 80,
      y: 80,
      width: 320,
      height: 220,
      sort_order: spaces.length,
    }).select().single();
    if (error) { toast.error("Erreur, réessaie"); return; }
    setSpaces((prev) => [...prev, data as VenueSpace]);
    setSelectedSpaceId(data.id);
  }

  async function updateSpace(id: string, patch: Partial<VenueSpace>) {
    setSpaces((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    await supabase.from("venue_spaces").update(patch).eq("id", id);
  }

  async function deleteSpace(id: string) {
    const ok = await confirm({
      title: "Supprimer cet espace ?",
      message: "Les tables ne seront pas supprimées, juste détachées.",
      variant: "danger",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    haptic("warning");
    setSpaces((prev) => prev.filter((s) => s.id !== id));
    setSelectedSpaceId(null);
    await supabase.from("venue_spaces").delete().eq("id", id);
  }

  async function persistTablePosition(id: string, x: number, y: number) {
    const container = spaceAtPoint(x, y);
    const space_id = container?.id ?? null;
    setLocalTables((prev) => prev.map((t) => (t.id === id ? { ...t, x, y, space_id } : t)));
    await supabase.from("venue_tables").update({ x, y, space_id }).eq("id", id);
  }

  // ── Drag handlers (pointer events → touch + mouse) ─────────
  function onSpaceDown(e: React.PointerEvent, s: VenueSpace) {
    if (!editing) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = svgPoint(e);
    setDragging({ kind: "space", id: s.id, offsetX: p.x - s.x, offsetY: p.y - s.y });
    setSelectedSpaceId(s.id);
  }

  function onResizeDown(e: React.PointerEvent, s: VenueSpace) {
    if (!editing) return;
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = svgPoint(e);
    setDragging({ kind: "resize", id: s.id, startW: s.width, startH: s.height, startX: p.x, startY: p.y });
  }

  function onTableDown(e: React.PointerEvent, t: VenueTable) {
    if (!editing) {
      if (onTableTap) { haptic("light"); onTableTap(t); }
      return;
    }
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = svgPoint(e);
    setDragging({ kind: "table", id: t.id, offsetX: p.x - t.x, offsetY: p.y - t.y });
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const p = svgPoint(e);
    if (dragging.kind === "space") {
      const x = Math.max(0, Math.min(VIEWBOX_W - MIN_SPACE_W, p.x - dragging.offsetX));
      const y = Math.max(0, Math.min(VIEWBOX_H - MIN_SPACE_H, p.y - dragging.offsetY));
      setSpaces((prev) => prev.map((s) => (s.id === dragging.id ? { ...s, x, y } : s)));
    } else if (dragging.kind === "resize") {
      const space = spaces.find((s) => s.id === dragging.id);
      if (!space) return;
      const dx = p.x - dragging.startX;
      const dy = p.y - dragging.startY;
      const width = Math.max(MIN_SPACE_W, Math.min(VIEWBOX_W - space.x, dragging.startW + dx));
      const height = Math.max(MIN_SPACE_H, Math.min(VIEWBOX_H - space.y, dragging.startH + dy));
      setSpaces((prev) => prev.map((s) => (s.id === dragging.id ? { ...s, width, height } : s)));
    } else if (dragging.kind === "table") {
      const x = Math.max(TABLE_RADIUS, Math.min(VIEWBOX_W - TABLE_RADIUS, p.x - dragging.offsetX));
      const y = Math.max(TABLE_RADIUS, Math.min(VIEWBOX_H - TABLE_RADIUS, p.y - dragging.offsetY));
      setLocalTables((prev) => prev.map((t) => (t.id === dragging.id ? { ...t, x, y } : t)));
    }
  }

  function onPointerUp() {
    if (!dragging) return;
    const d = dragging;
    setDragging(null);
    if (d.kind === "space") {
      const s = spaces.find((x) => x.id === d.id);
      if (s) updateSpace(s.id, { x: s.x, y: s.y });
    } else if (d.kind === "resize") {
      const s = spaces.find((x) => x.id === d.id);
      if (s) updateSpace(s.id, { width: s.width, height: s.height });
    } else if (d.kind === "table") {
      const t = localTables.find((x) => x.id === d.id);
      if (t) persistTablePosition(t.id, t.x, t.y);
    }
  }

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId);
  const emptyPlan = spaces.length === 0 && localTables.every((t) => t.x === 100 && t.y === 100);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {canEdit && (
          <button
            onClick={() => { setEditing((v) => !v); setSelectedSpaceId(null); }}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 10,
              background: editing ? "var(--terra-medium)" : "var(--secondary-bg)",
              color: editing ? "#fff" : "var(--text-secondary)",
              border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, minHeight: 40,
            }}
          >
            {editing ? <><Check size={14} /> Terminé</> : <><Pencil size={14} /> Modifier</>}
          </button>
        )}

        {editing && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SPACE_PRESETS.map((p) => (
              <button
                key={p.zone}
                onClick={() => addSpace(p)}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "6px 10px", borderRadius: 8,
                  background: "var(--secondary-bg)",
                  color: "var(--text-secondary)",
                  border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 500,
                }}
              >
                <Plus size={12} /> {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Canvas */}
      <div
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${VIEWBOX_W} / ${VIEWBOX_H}`,
          background: "var(--secondary-bg)",
          borderRadius: 16,
          overflow: "hidden",
          touchAction: "none",
          border: editing ? "2px dashed var(--terra-medium)" : "1px solid var(--border-color)",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          width="100%"
          height="100%"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ display: "block" }}
        >
          {/* Grid background (edit mode only — visual aid) */}
          {editing && (
            <g opacity={0.15}>
              {Array.from({ length: Math.floor(VIEWBOX_W / 50) }).map((_, i) => (
                <line key={`vg-${i}`} x1={i * 50} y1={0} x2={i * 50} y2={VIEWBOX_H} stroke="var(--text-tertiary)" strokeWidth={0.5} />
              ))}
              {Array.from({ length: Math.floor(VIEWBOX_H / 50) }).map((_, i) => (
                <line key={`hg-${i}`} x1={0} y1={i * 50} x2={VIEWBOX_W} y2={i * 50} stroke="var(--text-tertiary)" strokeWidth={0.5} />
              ))}
            </g>
          )}

          {/* Spaces */}
          {spaces.map((s) => {
            const selected = s.id === selectedSpaceId;
            return (
              <g key={s.id}>
                <rect
                  x={s.x}
                  y={s.y}
                  width={s.width}
                  height={s.height}
                  rx={14}
                  fill={s.color}
                  fillOpacity={0.12}
                  stroke={s.color}
                  strokeWidth={selected ? 3 : 1.5}
                  strokeDasharray={editing && !selected ? "6 4" : undefined}
                  onPointerDown={(e) => onSpaceDown(e, s)}
                  style={{ cursor: editing ? "move" : "default" }}
                />
                <text
                  x={s.x + 14}
                  y={s.y + 26}
                  fill={s.color}
                  fontSize={16}
                  fontWeight={600}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {s.name}
                </text>
                {editing && (
                  <circle
                    cx={s.x + s.width}
                    cy={s.y + s.height}
                    r={10}
                    fill={s.color}
                    stroke="#fff"
                    strokeWidth={2}
                    onPointerDown={(e) => onResizeDown(e, s)}
                    style={{ cursor: "nwse-resize" }}
                  />
                )}
              </g>
            );
          })}

          {/* Tables */}
          {localTables.map((t) => {
            const booked = bookedTableIds.has(t.id);
            return (
              <g
                key={t.id}
                onPointerDown={(e) => onTableDown(e, t)}
                style={{ cursor: editing ? "move" : onTableTap ? "pointer" : "default" }}
              >
                <circle
                  cx={t.x}
                  cy={t.y}
                  r={TABLE_RADIUS}
                  fill={booked ? "rgba(192,122,122,0.9)" : "rgba(255,255,255,0.95)"}
                  stroke={booked ? "#C07A7A" : "var(--terra-medium)"}
                  strokeWidth={2}
                />
                <text
                  x={t.x}
                  y={t.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={13}
                  fontWeight={700}
                  fill={booked ? "#fff" : "var(--text-primary)"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {t.id}
                </text>
                <text
                  x={t.x}
                  y={t.y + 14}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  fill={booked ? "rgba(255,255,255,0.8)" : "var(--text-tertiary)"}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {t.capacity}p
                </text>
              </g>
            );
          })}
        </svg>

        {/* Empty-state hint */}
        {emptyPlan && !editing && canEdit && (
          <div
            style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <div style={{ textAlign: "center", maxWidth: 300, padding: 20 }}>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 6 }}>
                Plan vide — appuie sur <b>Modifier</b> pour dessiner tes espaces et placer les tables.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Selected space controls (edit mode) */}
      {editing && selectedSpace && (
        <div
          className="card-light"
          style={{ marginTop: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="text"
              value={selectedSpace.name}
              onChange={(e) => updateSpace(selectedSpace.id, { name: e.target.value })}
              style={{
                flex: 1, padding: "8px 12px", borderRadius: 10,
                border: "1px solid var(--border-color)", background: "var(--input-bg)",
                fontSize: 14, color: "var(--text-primary)", outline: "none",
              }}
            />
            <button
              onClick={() => deleteSpace(selectedSpace.id)}
              aria-label="Supprimer"
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(192,122,122,0.1)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Trash2 size={16} style={{ color: "var(--danger)" }} />
            </button>
            <button
              onClick={() => setSelectedSpaceId(null)}
              aria-label="Fermer"
              style={{
                width: 40, height: 40, borderRadius: 10,
                background: "var(--secondary-bg)", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <XIcon size={16} style={{ color: "var(--text-tertiary)" }} />
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Couleur
            </span>
            {["#D4A04A", "#B89070", "#C4785A", "#8B5A40", "#6B4A30", "#8A857E"].map((c) => (
              <button
                key={c}
                onClick={() => updateSpace(selectedSpace.id, { color: c })}
                aria-label={`Couleur ${c}`}
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: c,
                  border: selectedSpace.color === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {editing && !selectedSpace && (
        <p style={{ fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
          <Move size={11} style={{ display: "inline", marginRight: 4 }} />
          Glisse les espaces et les tables. Touche le coin d&apos;un espace pour redimensionner.
        </p>
      )}
    </div>
  );
}
