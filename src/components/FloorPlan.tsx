"use client";

import { useState } from "react";
import type { Reservation, VenueTable } from "@/lib/types";
import { Users } from "lucide-react";

interface FloorPlanProps {
  tables: VenueTable[];
  reservations: Reservation[];
  onTableClick?: (tableId: string) => void;
}

type Floor = "rdc" | "r1";
type TShape = "rect" | "circle";

interface T {
  id: string;
  x: number; y: number;
  w: number; h: number;
  shape: TShape;
}

// ═══════════════════════════════════════════════════════════════
// RDC — faithful recreation of the architectural survey plan
// ═══════════════════════════════════════════════════════════════
const RDC_VIEW = { w: 1200, h: 800 };

// Building walls — recreated from the architectural plan
// Outer shell with its characteristic angular top-left corner
const RDC_OUTER_WALL = "M 100 120 L 430 120 L 460 80 L 840 80 L 870 160 L 1050 160 L 1090 260 L 1110 370 L 1090 500 L 1050 620 L 780 620 L 780 660 L 100 660 Z";

// Interior dividing walls (between rooms)
const RDC_INTERIOR_WALLS = [
  // Kitchen dividers
  "M 280 120 L 280 290",
  "M 280 290 L 560 290",
  "M 560 120 L 560 290",
  // WC block
  "M 560 160 L 560 290",
  "M 620 160 L 620 230",
  "M 680 160 L 680 230",
  "M 740 160 L 740 230",
  "M 560 230 L 780 230",
  // Escalier / pièce boundaries
  "M 780 230 L 870 230",
  "M 780 280 L 870 280",
  "M 870 160 L 870 620",
  // Local
  "M 560 230 L 560 290",
  // Main floor division between restaurant and terrasse
  "M 780 290 L 780 620",
  // Non-fumeur zone boundary
  "M 780 550 L 870 550",
];

// Labels for non-service rooms/zones
interface RoomLabel { x: number; y: number; text: string; }
const RDC_ROOM_LABELS: RoomLabel[] = [
  { x: 420, y: 210, text: "Cuisine" },
  { x: 590, y: 200, text: "WC" },
  { x: 650, y: 200, text: "WC" },
  { x: 710, y: 200, text: "WC" },
  { x: 770, y: 200, text: "WC" },
  { x: 970, y: 200, text: "Pièce" },
  { x: 822, y: 260, text: "Local" },
  { x: 823, y: 330, text: "Escalier" },
  { x: 970, y: 400, text: "Pièce" },
  { x: 970, y: 590, text: "Pièce" },
];

// Zone labels (for the service areas)
interface ZoneLabel { x: number; y: number; text: string; }
const RDC_ZONE_LABELS: ZoneLabel[] = [
  { x: 150, y: 370, text: "RESTAURANT" },
  { x: 940, y: 360, text: "TERRASSE" },
  { x: 300, y: 690, text: "TERRASSE AVANT" },
  { x: 925, y: 590, text: "NON-FUMEUR" },
];

// Tables — positions matching the architectural survey
const RDC_TABLES: T[] = [
  // Restaurant interior — tables 480, 470, 490, 420, 400, 430, 460, 450, 440, 410
  { id: "480", x: 370, y: 320, w: 70, h: 70, shape: "circle" },
  { id: "470", x: 140, y: 380, w: 70, h: 70, shape: "circle" },
  { id: "490", x: 370, y: 405, w: 105, h: 55, shape: "rect" },
  { id: "420", x: 510, y: 405, w: 105, h: 55, shape: "rect" },
  { id: "400", x: 650, y: 435, w: 90, h: 70, shape: "rect" },
  { id: "430", x: 445, y: 455, w: 60, h: 60, shape: "circle" },
  { id: "460", x: 140, y: 470, w: 70, h: 70, shape: "circle" },
  { id: "450", x: 330, y: 470, w: 110, h: 55, shape: "rect" },
  { id: "440", x: 470, y: 505, w: 85, h: 55, shape: "rect" },
  { id: "410", x: 610, y: 485, w: 100, h: 55, shape: "rect" },

  // Terrasse (right side, between the main wall and the exterior)
  { id: "200", x: 970, y: 270, w: 100, h: 55, shape: "rect" },
  { id: "210", x: 970, y: 340, w: 100, h: 55, shape: "rect" },
  { id: "220", x: 970, y: 410, w: 100, h: 55, shape: "rect" },
  { id: "230", x: 975, y: 495, w: 80, h: 80, shape: "circle" },
  { id: "240", x: 895, y: 490, w: 65, h: 50, shape: "rect" },
  { id: "250", x: 820, y: 490, w: 65, h: 50, shape: "rect" },

  // Terrasse avant (street-facing row)
  // Upper mini-row near building exit
  { id: "150", x: 400, y: 585, w: 55, h: 45, shape: "rect" },
  { id: "160", x: 460, y: 585, w: 55, h: 45, shape: "rect" },
  // Front street row
  { id: "140", x: 130, y: 700, w: 55, h: 45, shape: "rect" },
  { id: "130", x: 195, y: 700, w: 55, h: 45, shape: "rect" },
  { id: "120", x: 260, y: 700, w: 55, h: 45, shape: "rect" },
  { id: "110", x: 325, y: 700, w: 55, h: 45, shape: "rect" },
  { id: "100", x: 390, y: 700, w: 55, h: 45, shape: "rect" },

  // Non-fumeur (covered open salle, bottom-right)
  { id: "340", x: 800, y: 580, w: 55, h: 45, shape: "rect" },
  { id: "300", x: 870, y: 580, w: 55, h: 45, shape: "rect" },
  { id: "330", x: 835, y: 620, w: 55, h: 45, shape: "rect" },
  { id: "320", x: 800, y: 720, w: 55, h: 45, shape: "rect" },
  { id: "310", x: 870, y: 720, w: 55, h: 45, shape: "rect" },
];

// ═══════════════════════════════════════════════════════════════
// R-1 — Sous-sol bar
// ═══════════════════════════════════════════════════════════════
const R1_VIEW = { w: 1200, h: 700 };

const R1_OUTER_WALL = "M 120 100 L 600 100 L 630 150 L 1080 150 L 1080 620 L 120 620 Z";

const R1_INTERIOR_WALLS = [
  // Bar counter boundary
  "M 180 260 L 620 260",
  "M 180 340 L 620 340",
  "M 180 260 L 180 340",
  "M 620 260 L 620 340",
  // Stairs
  "M 900 240 L 1040 240",
  "M 900 240 L 900 400",
  "M 1040 240 L 1040 400",
  "M 900 400 L 1040 400",
];

const R1_ROOM_LABELS: RoomLabel[] = [
  { x: 400, y: 305, text: "Comptoir" },
  { x: 970, y: 325, text: "Escalier ↑" },
];

const R1_ZONE_LABELS: ZoneLabel[] = [
  { x: 220, y: 160, text: "BAR · SOUS-SOL" },
];

const R1_TABLES: T[] = [
  // Bar stools right of counter
  { id: "10", x: 730, y: 230, w: 58, h: 58, shape: "circle" },
  { id: "20", x: 730, y: 305, w: 58, h: 58, shape: "circle" },
  { id: "30", x: 730, y: 380, w: 58, h: 58, shape: "circle" },
  { id: "40", x: 730, y: 455, w: 58, h: 58, shape: "circle" },
  // Tables along the bottom wall
  { id: "90", x: 200, y: 540, w: 120, h: 70, shape: "rect" },
  { id: "80", x: 360, y: 540, w: 100, h: 70, shape: "rect" },
  { id: "70", x: 520, y: 540, w: 110, h: 70, shape: "rect" },
  { id: "60", x: 680, y: 540, w: 110, h: 70, shape: "rect" },
  { id: "50", x: 840, y: 540, w: 120, h: 70, shape: "rect" },
];

// ── Component ──────────────────────────────────────────────────
export default function FloorPlan({ tables, reservations, onTableClick }: FloorPlanProps) {
  const [floor, setFloor] = useState<Floor>("rdc");
  const [selected, setSelected] = useState<string | null>(null);

  const resaByTable: Record<string, Reservation> = {};
  reservations.forEach((r) => { if (r.table_id) resaByTable[r.table_id] = r; });

  function getStatus(id: string): "free" | "attendu" | "arrive" {
    const r = resaByTable[id];
    if (!r) return "free";
    return r.status === "arrive" ? "arrive" : "attendu";
  }

  const view = floor === "rdc" ? RDC_VIEW : R1_VIEW;
  const outerWall = floor === "rdc" ? RDC_OUTER_WALL : R1_OUTER_WALL;
  const interiorWalls = floor === "rdc" ? RDC_INTERIOR_WALLS : R1_INTERIOR_WALLS;
  const roomLabels = floor === "rdc" ? RDC_ROOM_LABELS : R1_ROOM_LABELS;
  const zoneLabels = floor === "rdc" ? RDC_ZONE_LABELS : R1_ZONE_LABELS;
  const layout = floor === "rdc" ? RDC_TABLES : R1_TABLES;

  const selectedResa = selected ? resaByTable[selected] : null;
  const selectedTable = selected ? tables.find((t) => t.id === selected) : null;

  const totalTables = layout.length;
  const bookedTables = layout.filter((t) => getStatus(t.id) !== "free").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Floor switcher + count */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 4, background: "var(--secondary-bg)", borderRadius: 10, padding: 3, flex: 1 }}>
          {([
            { key: "rdc" as Floor, label: "Rez-de-chaussée" },
            { key: "r1" as Floor, label: "Sous-sol" },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => { setFloor(f.key); setSelected(null); }}
              style={{
                flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 500,
                background: floor === f.key ? "var(--card-bg)" : "transparent",
                color: floor === f.key ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: floor === f.key ? "var(--shadow-light)" : "none",
                transition: "all 0.2s",
              }}
            >{f.label}</button>
          ))}
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600,
          background: "var(--secondary-bg)",
          padding: "7px 10px", borderRadius: 8,
          color: "var(--text-secondary)",
          minWidth: 52, textAlign: "center",
        }}>
          {bookedTables}/{totalTables}
        </div>
      </div>

      {/* Blueprint-style plan */}
      <div className="card-light" style={{ padding: 8, overflow: "hidden" }}>
        <svg
          viewBox={`0 0 ${view.w} ${view.h}`}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 10, background: "#FAFAF8" }}
        >
          {/* Building shadow/floor tint */}
          <path d={outerWall} fill="#F7F5F0" />

          {/* Outer walls (thick, architect style) */}
          <path d={outerWall} fill="none" stroke="#2C2520" strokeWidth={6} strokeLinejoin="round" />

          {/* Interior dividing walls */}
          {interiorWalls.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#2C2520" strokeWidth={4} strokeLinecap="round" />
          ))}

          {/* Zone labels (light, in the middle of service areas) */}
          {zoneLabels.map((z, i) => (
            <text
              key={i}
              x={z.x} y={z.y}
              fontSize={12} fontWeight={700}
              fill="#8A857E" letterSpacing={2.5}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {z.text}
            </text>
          ))}

          {/* Room labels (Cuisine, WC, etc.) */}
          {roomLabels.map((l, i) => (
            <text
              key={i}
              x={l.x} y={l.y}
              fontSize={13} fontWeight={500}
              fill="#5C564F"
              textAnchor="middle"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {l.text}
            </text>
          ))}

          {/* Entrance marker */}
          {floor === "rdc" && (
            <text
              x={400} y={780}
              fontSize={11} fontWeight={700}
              fill="#C4785A" letterSpacing={2}
              textAnchor="middle"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              ▲ RUE DE METZ · ENTRÉE
            </text>
          )}

          {/* Tables */}
          {layout.map((t) => {
            const status = getStatus(t.id);
            const isSel = selected === t.id;

            const fill =
              status === "arrive" ? "#8B5A40"
              : status === "attendu" ? "#D4A04A"
              : "#FFFFFF";
            const stroke =
              isSel ? "#C4785A"
              : status === "arrive" ? "#6B4A30"
              : status === "attendu" ? "#B88835"
              : "#2C2520";
            const textFill = status === "free" ? "#2C2520" : "#FFFFFF";

            const onClick = () => {
              const next = isSel ? null : t.id;
              setSelected(next);
              if (next) onTableClick?.(next);
            };

            if (t.shape === "circle") {
              const r = Math.max(t.w, t.h) / 2;
              return (
                <g key={t.id} onClick={onClick} style={{ cursor: "pointer" }}>
                  {isSel && (
                    <circle cx={t.x} cy={t.y} r={r + 7} fill="none" stroke="#C4785A" strokeWidth={2.5} strokeDasharray="6 4" opacity={0.7} />
                  )}
                  <circle
                    cx={t.x} cy={t.y} r={r}
                    fill={fill} stroke={stroke} strokeWidth={isSel ? 3 : 2}
                  />
                  <text
                    x={t.x} y={t.y + 6}
                    fontSize={16} fontWeight={700}
                    fill={textFill} textAnchor="middle"
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {t.id}
                  </text>
                </g>
              );
            }
            return (
              <g key={t.id} onClick={onClick} style={{ cursor: "pointer" }}>
                {isSel && (
                  <rect
                    x={t.x - t.w/2 - 6} y={t.y - t.h/2 - 6}
                    width={t.w + 12} height={t.h + 12}
                    fill="none" stroke="#C4785A" strokeWidth={2.5}
                    strokeDasharray="6 4" rx={10} opacity={0.7}
                  />
                )}
                <rect
                  x={t.x - t.w/2} y={t.y - t.h/2}
                  width={t.w} height={t.h}
                  fill={fill} stroke={stroke} strokeWidth={isSel ? 3 : 2}
                  rx={4}
                />
                <text
                  x={t.x} y={t.y + 6}
                  fontSize={16} fontWeight={700}
                  fill={textFill} textAnchor="middle"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {t.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 14, fontSize: 11, color: "var(--text-secondary)",
        padding: "9px 14px", borderRadius: 10,
        background: "var(--secondary-bg)",
        justifyContent: "center", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 13, height: 13, borderRadius: 2, border: "2px solid #2C2520", background: "#FFFFFF" }} />
          Libre
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 13, height: 13, borderRadius: 2, background: "#D4A04A" }} />
          Réservée
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 13, height: 13, borderRadius: 2, background: "#8B5A40" }} />
          Arrivée
        </div>
      </div>

      {/* Selected table detail */}
      {selected && selectedTable && (
        <div className="card-medium" style={{ padding: "14px 16px", animation: "fadeInUp 0.2s ease-out" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
              Table {selected}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)", display: "flex", alignItems: "center", gap: 4 }}>
              <Users size={11} />
              {selectedTable.capacity}
              {selectedTable.max_capacity > selectedTable.capacity && ` (max ${selectedTable.max_capacity})`}
            </span>
          </div>
          {selectedResa ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{selectedResa.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <span>{selectedResa.time.slice(0, 5).replace(":", "h")}</span>
                <span style={{ color: "var(--text-tertiary)" }}>·</span>
                <span>{selectedResa.covers} pers.</span>
                {selectedResa.status === "arrive" && (
                  <span style={{ color: "#8B5A40", fontWeight: 600, marginLeft: "auto" }}>✓ Arrivée</span>
                )}
              </div>
              {selectedResa.phone && (
                <div style={{ fontSize: 12, color: "var(--terra-medium)", marginTop: 4 }}>
                  📞 <a href={`tel:${selectedResa.phone}`} style={{ color: "inherit", textDecoration: "none" }}>{selectedResa.phone}</a>
                </div>
              )}
              {selectedResa.notes && (
                <div style={{ fontSize: 12, color: "var(--warning)", marginTop: 4 }}>⚠️ {selectedResa.notes}</div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Libre — disponible pour une réservation</p>
          )}
        </div>
      )}
    </div>
  );
}
