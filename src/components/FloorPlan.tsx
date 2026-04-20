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
  x: number;   // center x
  y: number;   // center y
  w: number;
  h: number;
  shape: TShape;
}

interface Room {
  d: string;           // SVG path for room shape
  fill: string;
  label?: string;
  labelX?: number;
  labelY?: number;
}

interface Fixed {
  x: number; y: number; w: number; h: number;
  label: string;
}

// ═══════════════════════════════════════════════════════════════
// RDC — scaled to match real architectural plan
// ═══════════════════════════════════════════════════════════════

const RDC_VIEW = { w: 1000, h: 740 };

// Service rooms (colored backgrounds with outlined walls)
const RDC_ROOMS: Room[] = [
  // Restaurant — interior room (irregular shape matching walls)
  {
    d: "M 60 250 L 650 250 L 650 530 L 60 530 Z",
    fill: "rgba(196,120,90,0.06)",
    label: "RESTAURANT",
    labelX: 85, labelY: 278,
  },
  // Terrasse (fumeur) — outdoor right
  {
    d: "M 680 250 L 940 250 L 940 560 L 680 560 Z",
    fill: "rgba(212,160,74,0.06)",
    label: "TERRASSE",
    labelX: 705, labelY: 278,
  },
  // Terrasse avant (street-facing row)
  {
    d: "M 60 560 L 650 560 L 650 700 L 60 700 Z",
    fill: "rgba(212,160,74,0.04)",
    label: "TERRASSE AVANT",
    labelX: 85, labelY: 585,
  },
  // Non-fumeur (covered open salle, bottom right)
  {
    d: "M 680 575 L 940 575 L 940 715 L 680 715 Z",
    fill: "rgba(139,176,150,0.07)",
    label: "NON-FUMEUR",
    labelX: 705, labelY: 600,
  },
];

// Non-service fixed areas
const RDC_FIXED: Fixed[] = [
  { x: 260, y: 70,  w: 240, h: 160, label: "Cuisine" },
  { x: 520, y: 70,  w: 180, h: 80,  label: "WC" },
  { x: 520, y: 160, w: 90,  h: 70,  label: "Escalier ↓" },
  { x: 720, y: 70,  w: 220, h: 160, label: "Réserve" },
];

// Tables — positions faithful to the plan
const RDC_TABLES: T[] = [
  // ── RESTAURANT (interior) ─────────────────────────────────
  // Row near kitchen wall
  { id: "480", x: 195, y: 315, w: 64, h: 64, shape: "circle" },
  // Left wall tables
  { id: "470", x: 105, y: 380, w: 64, h: 64, shape: "circle" },
  { id: "460", x: 105, y: 470, w: 64, h: 64, shape: "circle" },
  // Middle-upper row
  { id: "490", x: 270, y: 380, w: 100, h: 55, shape: "rect" },
  { id: "420", x: 410, y: 380, w: 100, h: 55, shape: "rect" },
  { id: "400", x: 560, y: 410, w: 80, h: 65, shape: "rect" },
  // Center
  { id: "430", x: 345, y: 435, w: 56, h: 56, shape: "circle" },
  // Middle-lower row
  { id: "450", x: 235, y: 470, w: 100, h: 55, shape: "rect" },
  { id: "440", x: 380, y: 485, w: 75, h: 50, shape: "rect" },
  { id: "410", x: 540, y: 485, w: 90, h: 55, shape: "rect" },

  // ── TERRASSE (fumeur, right side) ──────────────────────
  { id: "200", x: 810, y: 310, w: 100, h: 55, shape: "rect" },
  { id: "210", x: 810, y: 380, w: 100, h: 55, shape: "rect" },
  { id: "220", x: 810, y: 450, w: 100, h: 55, shape: "rect" },
  { id: "230", x: 820, y: 525, w: 70, h: 70, shape: "circle" },
  { id: "240", x: 720, y: 510, w: 70, h: 45, shape: "rect" },
  { id: "250", x: 720, y: 455, w: 70, h: 45, shape: "rect" },

  // ── TERRASSE AVANT (100-160, street front) ───────────────
  // Upper mini-row (150, 160) against the building exit
  { id: "150", x: 280, y: 600, w: 55, h: 40, shape: "rect" },
  { id: "160", x: 345, y: 600, w: 55, h: 40, shape: "rect" },
  // Front street row (100-140)
  { id: "140", x: 95,  y: 655, w: 55, h: 42, shape: "rect" },
  { id: "130", x: 160, y: 655, w: 55, h: 42, shape: "rect" },
  { id: "120", x: 225, y: 655, w: 55, h: 42, shape: "rect" },
  { id: "110", x: 290, y: 655, w: 55, h: 42, shape: "rect" },
  { id: "100", x: 355, y: 655, w: 55, h: 42, shape: "rect" },

  // ── NON-FUMEUR (300s, covered open salle) ────────────────
  // Plan arrangement:
  //   340 | 300
  //        330
  //   320 | 310
  { id: "340", x: 735, y: 615, w: 55, h: 40, shape: "rect" },
  { id: "300", x: 870, y: 615, w: 55, h: 40, shape: "rect" },
  { id: "330", x: 805, y: 650, w: 55, h: 40, shape: "rect" },
  { id: "320", x: 735, y: 685, w: 55, h: 40, shape: "rect" },
  { id: "310", x: 870, y: 685, w: 55, h: 40, shape: "rect" },
];

// ═══════════════════════════════════════════════════════════════
// R-1 · Sous-sol
// ═══════════════════════════════════════════════════════════════

const R1_VIEW = { w: 1000, h: 600 };

const R1_ROOMS: Room[] = [
  {
    d: "M 60 80 L 940 80 L 940 520 L 60 520 Z",
    fill: "rgba(139,90,64,0.06)",
    label: "BAR · SOUS-SOL",
    labelX: 85, labelY: 108,
  },
];

const R1_FIXED: Fixed[] = [
  { x: 120, y: 180, w: 380, h: 75, label: "Comptoir" },
  { x: 800, y: 160, w: 120, h: 110, label: "Escalier ↑" },
];

const R1_TABLES: T[] = [
  // Bar stools right of counter
  { id: "10", x: 620, y: 160, w: 58, h: 58, shape: "circle" },
  { id: "20", x: 620, y: 235, w: 58, h: 58, shape: "circle" },
  { id: "30", x: 620, y: 310, w: 58, h: 58, shape: "circle" },
  { id: "40", x: 620, y: 385, w: 58, h: 58, shape: "circle" },
  // Tables along bottom
  { id: "90", x: 130, y: 470, w: 110, h: 60, shape: "rect" },
  { id: "80", x: 270, y: 470, w: 100, h: 60, shape: "rect" },
  { id: "70", x: 405, y: 470, w: 105, h: 60, shape: "rect" },
  { id: "60", x: 545, y: 470, w: 105, h: 60, shape: "rect" },
  { id: "50", x: 685, y: 470, w: 110, h: 60, shape: "rect" },
];

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════
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
  const rooms = floor === "rdc" ? RDC_ROOMS : R1_ROOMS;
  const fixed = floor === "rdc" ? RDC_FIXED : R1_FIXED;
  const layout = floor === "rdc" ? RDC_TABLES : R1_TABLES;

  const selectedResa = selected ? resaByTable[selected] : null;
  const selectedTable = selected ? tables.find((t) => t.id === selected) : null;

  const totalTables = layout.length;
  const bookedTables = layout.filter((t) => getStatus(t.id) !== "free").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Floor switcher */}
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

      {/* SVG plan */}
      <div className="card-light" style={{ padding: 8, overflow: "hidden" }}>
        <svg
          viewBox={`0 0 ${view.w} ${view.h}`}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 10 }}
        >
          <defs>
            <pattern id="fp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="var(--text-tertiary)" opacity="0.15" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={view.w} height={view.h} fill="var(--card-bg)" />
          <rect x="0" y="0" width={view.w} height={view.h} fill="url(#fp-grid)" />

          {/* Rooms (colored backgrounds with walls) */}
          {rooms.map((r, i) => (
            <g key={i}>
              <path
                d={r.d}
                fill={r.fill}
                stroke="var(--text-tertiary)"
                strokeWidth={2.5}
                strokeLinejoin="round"
                opacity={0.85}
              />
              {r.label && (
                <text
                  x={r.labelX!} y={r.labelY!}
                  fontSize={12} fontWeight={700}
                  fill="var(--text-tertiary)"
                  letterSpacing={2}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {r.label}
                </text>
              )}
            </g>
          ))}

          {/* Fixed non-service areas */}
          {fixed.map((z, i) => (
            <g key={i}>
              <rect
                x={z.x} y={z.y} width={z.w} height={z.h}
                fill="var(--secondary-bg)"
                stroke="var(--border-color)" strokeWidth={1.5}
                rx={8}
              />
              <text
                x={z.x + z.w / 2} y={z.y + z.h / 2 + 5}
                fontSize={12} fontWeight={500}
                fill="var(--text-tertiary)" textAnchor="middle"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {z.label}
              </text>
            </g>
          ))}

          {/* Entrance marker */}
          {floor === "rdc" && (
            <text
              x={300} y={732}
              fontSize={11} fontWeight={700}
              fill="var(--terra-medium)"
              letterSpacing={2} textAnchor="middle"
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
              : "var(--card-bg)";
            const stroke =
              isSel ? "var(--terra-medium)"
              : status === "arrive" ? "#6B4A30"
              : status === "attendu" ? "#B88835"
              : "#8A857E";
            const textFill = status === "free" ? "var(--text-primary)" : "#fff";

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
                    <circle cx={t.x} cy={t.y} r={r + 7} fill="none" stroke="var(--terra-medium)" strokeWidth={2} strokeDasharray="5 4" opacity={0.55} />
                  )}
                  <circle
                    cx={t.x} cy={t.y} r={r}
                    fill={fill} stroke={stroke} strokeWidth={isSel ? 2.5 : 1.8}
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
                    x={t.x - t.w/2 - 5} y={t.y - t.h/2 - 5}
                    width={t.w + 10} height={t.h + 10}
                    fill="none" stroke="var(--terra-medium)" strokeWidth={2}
                    strokeDasharray="5 4" rx={9} opacity={0.55}
                  />
                )}
                <rect
                  x={t.x - t.w/2} y={t.y - t.h/2}
                  width={t.w} height={t.h}
                  fill={fill} stroke={stroke} strokeWidth={isSel ? 2.5 : 1.8}
                  rx={6}
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
          <div style={{ width: 13, height: 13, borderRadius: 3, border: "1.5px solid var(--text-tertiary)", background: "var(--card-bg)" }} />
          Libre
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 13, height: 13, borderRadius: 3, background: "#D4A04A" }} />
          Réservée
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 13, height: 13, borderRadius: 3, background: "#8B5A40" }} />
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
