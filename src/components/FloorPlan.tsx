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
// RDC — faithful to architect survey (25.01.2026)
// ViewBox 1400 × 1000 matches the plan aspect ratio
// ═══════════════════════════════════════════════════════════════
const RDC_VIEW = { w: 1400, h: 1000 };

// Building outer walls — follows the real shape:
//  - angular top-left cut
//  - Pièce extension to the right
//  - Non-fumeur salle extension to the bottom-right
const RDC_OUTER = `
  M 180 310
  L 440 130
  L 880 120
  L 900 220
  L 1220 220
  L 1220 560
  L 900 560
  L 900 720
  L 820 720
  L 820 830
  L 180 830
  Z
`;

// Interior walls
const RDC_WALLS: string[] = [
  // Cuisine bounds
  "M 470 310 L 470 520",
  "M 470 520 L 790 520",
  "M 790 310 L 790 520",
  // WC row wall
  "M 560 220 L 560 330",
  "M 630 220 L 630 330",
  "M 700 220 L 700 330",
  "M 770 220 L 770 330",
  "M 560 330 L 820 330",
  // Local wall (small space between Cuisine and right rooms)
  "M 790 330 L 900 330",
  "M 820 330 L 820 410",
  // Escalier bounds
  "M 790 410 L 900 410",
  "M 790 520 L 900 520",
  // Pièce (top right) bounds
  "M 900 410 L 1220 410",
  "M 900 520 L 1220 520",
  // Non-fumeur salle dividers (multiple "Pièce" rooms)
  "M 900 640 L 1220 640",
  "M 1030 640 L 1030 720",
  "M 1130 640 L 1130 720",
  "M 900 720 L 1220 720",
  // Bottom extension for 320s/310s area
  "M 820 720 L 820 830",
  "M 900 720 L 900 830",
  "M 1030 720 L 1030 830",
  "M 1130 720 L 1130 830",
];

// Fixed rooms with labels
interface Room { cx: number; cy: number; text: string; fontSize?: number; }
const RDC_ROOMS: Room[] = [
  { cx: 625, cy: 420, text: "Cuisine", fontSize: 16 },
  { cx: 595, cy: 280, text: "WC", fontSize: 11 },
  { cx: 665, cy: 280, text: "WC", fontSize: 11 },
  { cx: 735, cy: 280, text: "WC", fontSize: 11 },
  { cx: 795, cy: 280, text: "WC", fontSize: 11 },
  { cx: 845, cy: 370, text: "Local", fontSize: 11 },
  { cx: 845, cy: 465, text: "Escalier", fontSize: 12 },
  { cx: 1060, cy: 315, text: "Pièce", fontSize: 13 },
  { cx: 1060, cy: 465, text: "Pièce", fontSize: 13 },
];

// Zone labels (service zones overlay)
interface Zone { x: number; y: number; text: string; }
const RDC_ZONES: Zone[] = [
  { x: 240, y: 340, text: "RESTAURANT" },
  { x: 935, y: 590, text: "TERRASSE" },
  { x: 290, y: 870, text: "TERRASSE AVANT" },
  { x: 915, y: 850, text: "NON-FUMEUR" },
];

// Tables — positioned to match the architect plan
const RDC_TABLES: T[] = [
  // Restaurant (left interior)
  { id: "480", x: 310, y: 410, w: 75, h: 75, shape: "circle" },
  { id: "470", x: 220, y: 495, w: 75, h: 75, shape: "circle" },
  { id: "460", x: 220, y: 590, w: 75, h: 75, shape: "circle" },
  { id: "490", x: 360, y: 490, w: 110, h: 60, shape: "rect" },
  { id: "420", x: 495, y: 490, w: 110, h: 60, shape: "rect" },
  { id: "430", x: 415, y: 560, w: 65, h: 65, shape: "circle" },
  { id: "450", x: 360, y: 610, w: 110, h: 60, shape: "rect" },
  { id: "440", x: 490, y: 620, w: 85, h: 55, shape: "rect" },

  // Right side restaurant tables (400, 410)
  { id: "400", x: 690, y: 580, w: 90, h: 70, shape: "rect" },
  { id: "410", x: 610, y: 620, w: 90, h: 55, shape: "rect" },

  // Terrasse (right side of building, between walls)
  { id: "200", x: 1060, y: 580, w: 110, h: 60, shape: "rect" },
  { id: "210", x: 1200, y: 475, w: 110, h: 60, shape: "rect" }, // moved to fit
  { id: "220", x: 1060, y: 475, w: 110, h: 60, shape: "rect" },
  { id: "230", x: 1070, y: 680, w: 90, h: 90, shape: "circle" },

  // Middle pair 240/250 (between 230 and pergola area)
  { id: "250", x: 680, y: 770, w: 70, h: 55, shape: "rect" },
  { id: "240", x: 770, y: 770, w: 70, h: 55, shape: "rect" },

  // Terrasse avant (front mini-row + street row)
  { id: "150", x: 395, y: 770, w: 55, h: 50, shape: "rect" },
  { id: "160", x: 455, y: 770, w: 55, h: 50, shape: "rect" },

  { id: "140", x: 220, y: 870, w: 55, h: 50, shape: "rect" },
  { id: "130", x: 285, y: 870, w: 55, h: 50, shape: "rect" },
  { id: "120", x: 350, y: 870, w: 55, h: 50, shape: "rect" },
  { id: "110", x: 415, y: 870, w: 55, h: 50, shape: "rect" },
  { id: "100", x: 480, y: 870, w: 55, h: 50, shape: "rect" },

  // Non-fumeur (separate rooms in the bottom-right)
  { id: "340", x: 960, y: 680, w: 60, h: 50, shape: "rect" },
  { id: "300", x: 1080, y: 680, w: 60, h: 50, shape: "rect" },
  { id: "330", x: 1180, y: 680, w: 60, h: 50, shape: "rect" },
  { id: "320", x: 960, y: 780, w: 60, h: 50, shape: "rect" },
  { id: "310", x: 1080, y: 780, w: 60, h: 50, shape: "rect" },
];

// ═══════════════════════════════════════════════════════════════
// R-1 — Sous-sol bar (basement)
// Follows the basement plan with angled top-left wall
// ═══════════════════════════════════════════════════════════════
const R1_VIEW = { w: 1400, h: 900 };

const R1_OUTER = `
  M 180 470
  L 380 230
  L 640 150
  L 1200 130
  L 1260 200
  L 1260 820
  L 180 820
  Z
`;

const R1_WALLS: string[] = [
  // Bar counter (long horizontal rect on the left)
  "M 280 370 L 780 370",
  "M 280 470 L 780 470",
  "M 280 370 L 280 470",
  "M 780 370 L 780 470",
  // Stairs
  "M 1080 260 L 1240 260",
  "M 1080 260 L 1080 480",
  "M 1240 260 L 1240 480",
  "M 1080 480 L 1240 480",
  // Vertical divider around "Sous-sol 100" column between 30/40
  "M 780 470 L 780 580",
];

const R1_ROOMS: Room[] = [
  { cx: 530, cy: 425, text: "Comptoir", fontSize: 18 },
  { cx: 1160, cy: 380, text: "Escalier ↑", fontSize: 14 },
];

const R1_ZONES: Zone[] = [
  { x: 260, y: 200, text: "BAR · SOUS-SOL" },
];

const R1_TABLES: T[] = [
  // Bar stools (column to the right of counter)
  { id: "10", x: 880, y: 340, w: 70, h: 70, shape: "circle" },
  { id: "20", x: 880, y: 440, w: 70, h: 70, shape: "circle" },
  { id: "30", x: 880, y: 540, w: 70, h: 70, shape: "circle" },
  { id: "40", x: 880, y: 640, w: 70, h: 70, shape: "circle" },

  // Tables along bottom wall
  { id: "90", x: 280, y: 720, w: 140, h: 80, shape: "rect" },
  { id: "80", x: 470, y: 720, w: 110, h: 80, shape: "rect" },
  { id: "70", x: 640, y: 720, w: 120, h: 80, shape: "rect" },
  { id: "60", x: 810, y: 780, w: 120, h: 70, shape: "rect" },
  { id: "50", x: 970, y: 780, w: 130, h: 70, shape: "rect" },
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
  const outer = floor === "rdc" ? RDC_OUTER : R1_OUTER;
  const walls = floor === "rdc" ? RDC_WALLS : R1_WALLS;
  const rooms = floor === "rdc" ? RDC_ROOMS : R1_ROOMS;
  const zones = floor === "rdc" ? RDC_ZONES : R1_ZONES;
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

      {/* Architectural plan SVG */}
      <div className="card-light" style={{ padding: 8, overflow: "hidden" }}>
        <svg
          viewBox={`0 0 ${view.w} ${view.h}`}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 10, background: "#FAFAF7" }}
        >
          {/* Building floor */}
          <path d={outer} fill="#F5F2EB" />

          {/* Outer walls — thick black like architect plans */}
          <path d={outer} fill="none" stroke="#1C1815" strokeWidth={8} strokeLinejoin="miter" />

          {/* Interior walls */}
          {walls.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#1C1815" strokeWidth={4} strokeLinecap="butt" />
          ))}

          {/* Zone labels (big, uppercase, in service areas) */}
          {zones.map((z, i) => (
            <text
              key={i}
              x={z.x} y={z.y}
              fontSize={14} fontWeight={700}
              fill="#B5B0A8" letterSpacing={3}
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {z.text}
            </text>
          ))}

          {/* Fixed room labels */}
          {rooms.map((r, i) => (
            <text
              key={i}
              x={r.cx} y={r.cy}
              fontSize={r.fontSize || 14} fontWeight={500}
              fill="#5C564F"
              textAnchor="middle"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {r.text}
            </text>
          ))}

          {/* Entrance marker */}
          {floor === "rdc" && (
            <text
              x={350} y={960}
              fontSize={13} fontWeight={700}
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
              : "#1C1815";
            const textFill = status === "free" ? "#1C1815" : "#FFFFFF";

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
                    <circle cx={t.x} cy={t.y} r={r + 8} fill="none" stroke="#C4785A" strokeWidth={3} strokeDasharray="7 5" opacity={0.7} />
                  )}
                  <circle
                    cx={t.x} cy={t.y} r={r}
                    fill={fill} stroke={stroke} strokeWidth={isSel ? 3 : 2.5}
                  />
                  <text
                    x={t.x} y={t.y + 7}
                    fontSize={18} fontWeight={700}
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
                    x={t.x - t.w/2 - 7} y={t.y - t.h/2 - 7}
                    width={t.w + 14} height={t.h + 14}
                    fill="none" stroke="#C4785A" strokeWidth={3}
                    strokeDasharray="7 5" rx={10} opacity={0.7}
                  />
                )}
                <rect
                  x={t.x - t.w/2} y={t.y - t.h/2}
                  width={t.w} height={t.h}
                  fill={fill} stroke={stroke} strokeWidth={isSel ? 3 : 2.5}
                  rx={5}
                />
                <text
                  x={t.x} y={t.y + 7}
                  fontSize={18} fontWeight={700}
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
          <div style={{ width: 13, height: 13, borderRadius: 2, border: "2px solid #1C1815", background: "#FFFFFF" }} />
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
