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
  x: number;  // center
  y: number;
  w: number;
  h: number;
  shape: TShape;
}

// ═══════════════════════════════════════════════════════════════
// RDC — Rez-de-chaussée · viewBox 1000 × 720
// Positions derived from the architectural plan, scaled for mobile
// ═══════════════════════════════════════════════════════════════

const RDC_VIEW = { w: 1000, h: 720 };

// Service zone backgrounds — colored tints matching the plan layout
const RDC_ZONES = [
  // Restaurant (interior, left half)
  { x: 40, y: 220, w: 540, h: 330, color: "rgba(196,120,90,0.05)", labelX: 60, labelY: 240, label: "RESTAURANT" },
  // Terrasse (open, right side)
  { x: 600, y: 220, w: 360, h: 280, color: "rgba(212,160,74,0.06)", labelX: 620, labelY: 240, label: "TERRASSE · FUMEUR" },
  // Non-fumeur (covered salle, bottom right)
  { x: 600, y: 520, w: 360, h: 170, color: "rgba(139,176,150,0.06)", labelX: 620, labelY: 540, label: "NON-FUMEUR" },
  // Street front (100-160 range) — part of terrasse but street-side
  { x: 40, y: 570, w: 540, h: 120, color: "rgba(212,160,74,0.04)", labelX: 60, labelY: 590, label: "TERRASSE AVANT" },
];

// Non-service areas (walls, kitchen, WC etc.)
const RDC_FIXED = [
  { x: 240, y: 40, w: 220, h: 150, label: "Cuisine" },
  { x: 500, y: 40, w: 220, h: 90, label: "WC" },
  { x: 500, y: 140, w: 90, h: 70, label: "Escalier ↓" },
  { x: 730, y: 40, w: 230, h: 150, label: "Réserve" },
];

// Tables — positions faithful to the architectural plan
const RDC_TABLES: T[] = [
  // ── RESTAURANT (interior) ────────────────────────────────
  { id: "480", x: 160, y: 275, w: 60, h: 60, shape: "circle" },
  { id: "470", x: 80,  y: 355, w: 60, h: 60, shape: "circle" },
  { id: "490", x: 195, y: 345, w: 95, h: 55, shape: "rect" },
  { id: "420", x: 335, y: 345, w: 95, h: 55, shape: "rect" },
  { id: "400", x: 470, y: 365, w: 80, h: 60, shape: "rect" },
  { id: "430", x: 285, y: 405, w: 55, h: 55, shape: "circle" },
  { id: "460", x: 80,  y: 445, w: 60, h: 60, shape: "circle" },
  { id: "450", x: 195, y: 430, w: 95, h: 55, shape: "rect" },
  { id: "440", x: 345, y: 460, w: 70, h: 50, shape: "rect" },
  { id: "410", x: 470, y: 445, w: 80, h: 55, shape: "rect" },

  // ── TERRASSE (right side, fumeur) ────────────────────────
  { id: "200", x: 880, y: 275, w: 80, h: 55, shape: "rect" },
  { id: "210", x: 880, y: 350, w: 80, h: 55, shape: "rect" },
  { id: "220", x: 880, y: 425, w: 80, h: 55, shape: "rect" },
  // Big round 230 - bottom right of terrasse
  { id: "230", x: 870, y: 495, w: 80, h: 80, shape: "circle" },
  // Middle pair 240, 250
  { id: "240", x: 750, y: 460, w: 60, h: 45, shape: "rect" },
  { id: "250", x: 670, y: 460, w: 60, h: 45, shape: "rect" },

  // ── NON-FUMEUR (covered open salle, 300s) ──────────────
  { id: "340", x: 670, y: 580, w: 55, h: 45, shape: "rect" },
  { id: "320", x: 745, y: 580, w: 55, h: 45, shape: "rect" },
  { id: "330", x: 820, y: 580, w: 55, h: 45, shape: "rect" },
  { id: "310", x: 895, y: 580, w: 55, h: 45, shape: "rect" },
  { id: "300", x: 745, y: 645, w: 55, h: 45, shape: "rect" },

  // ── TERRASSE AVANT (street front row, 100-160) ──────────
  { id: "150", x: 240, y: 595, w: 50, h: 45, shape: "rect" },
  { id: "160", x: 305, y: 595, w: 50, h: 45, shape: "rect" },
  { id: "140", x: 75,  y: 650, w: 50, h: 40, shape: "rect" },
  { id: "130", x: 140, y: 650, w: 50, h: 40, shape: "rect" },
  { id: "120", x: 205, y: 650, w: 50, h: 40, shape: "rect" },
  { id: "110", x: 270, y: 650, w: 50, h: 40, shape: "rect" },
  { id: "100", x: 335, y: 650, w: 50, h: 40, shape: "rect" },
];

// ═══════════════════════════════════════════════════════════════
// R-1 — Sous-sol bar · viewBox 1000 × 560
// ═══════════════════════════════════════════════════════════════

const R1_VIEW = { w: 1000, h: 560 };

const R1_ZONES = [
  { x: 40, y: 80, w: 900, h: 400, color: "rgba(139,90,64,0.05)", labelX: 60, labelY: 105, label: "BAR · SOUS-SOL" },
];

const R1_FIXED = [
  // Bar counter
  { x: 120, y: 180, w: 400, h: 70, label: "Comptoir" },
  // Stairs
  { x: 780, y: 200, w: 140, h: 110, label: "Escalier ↑" },
];

const R1_TABLES: T[] = [
  // Bar stools (column right of counter)
  { id: "10", x: 620, y: 160, w: 58, h: 58, shape: "circle" },
  { id: "20", x: 620, y: 235, w: 58, h: 58, shape: "circle" },
  { id: "30", x: 620, y: 310, w: 58, h: 58, shape: "circle" },
  { id: "40", x: 620, y: 385, w: 58, h: 58, shape: "circle" },
  // Tables along bottom
  { id: "90", x: 115, y: 450, w: 110, h: 60, shape: "rect" },
  { id: "80", x: 260, y: 450, w: 100, h: 60, shape: "rect" },
  { id: "70", x: 390, y: 450, w: 105, h: 60, shape: "rect" },
  { id: "60", x: 520, y: 450, w: 105, h: 60, shape: "rect" },
  { id: "50", x: 660, y: 450, w: 110, h: 60, shape: "rect" },
];

// ── Component ─────────────────────────────────────────────────
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
  const zones = floor === "rdc" ? RDC_ZONES : R1_ZONES;
  const fixed = floor === "rdc" ? RDC_FIXED : R1_FIXED;
  const layout = floor === "rdc" ? RDC_TABLES : R1_TABLES;

  const selectedResa = selected ? resaByTable[selected] : null;
  const selectedTable = selected ? tables.find((t) => t.id === selected) : null;

  const totalTables = layout.length;
  const bookedTables = layout.filter((t) => getStatus(t.id) !== "free").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Floor switcher + stats */}
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

      {/* Plan SVG */}
      <div className="card-light" style={{ padding: 8, overflow: "hidden" }}>
        <svg
          viewBox={`0 0 ${view.w} ${view.h}`}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 10 }}
        >
          {/* Background grid pattern for depth */}
          <defs>
            <pattern id="fp-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="var(--text-tertiary)" opacity="0.15" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={view.w} height={view.h} fill="var(--card-bg)" />
          <rect x="0" y="0" width={view.w} height={view.h} fill="url(#fp-grid)" />

          {/* Service zone backgrounds */}
          {zones.map((z, i) => (
            <g key={i}>
              <rect
                x={z.x} y={z.y} width={z.w} height={z.h}
                fill={z.color}
                rx={14}
              />
              <text
                x={z.labelX} y={z.labelY}
                fontSize={14} fontWeight={700}
                fill="var(--text-tertiary)"
                letterSpacing={2}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {z.label}
              </text>
            </g>
          ))}

          {/* Fixed non-service areas */}
          {fixed.map((z, i) => (
            <g key={i}>
              <rect
                x={z.x} y={z.y} width={z.w} height={z.h}
                fill="var(--secondary-bg)"
                stroke="var(--border-color)" strokeWidth={1.5}
                rx={10}
              />
              <text
                x={z.x + z.w / 2} y={z.y + z.h / 2 + 5}
                fontSize={13} fontWeight={500}
                fill="var(--text-tertiary)" textAnchor="middle"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {z.label}
              </text>
            </g>
          ))}

          {/* Entrance marker */}
          {floor === "rdc" && (
            <g style={{ pointerEvents: "none" }}>
              <text x={300} y={710} fontSize={11} fontWeight={700} fill="var(--terra-medium)" letterSpacing={2} textAnchor="middle">
                ▲ RUE DE METZ · ENTRÉE
              </text>
            </g>
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
              : "var(--text-tertiary)";
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
                    <circle cx={t.x} cy={t.y} r={r + 8} fill="none" stroke="var(--terra-medium)" strokeWidth={2} strokeDasharray="5 4" opacity={0.5} />
                  )}
                  <circle
                    cx={t.x} cy={t.y} r={r}
                    fill={fill}
                    stroke={stroke} strokeWidth={isSel ? 2.5 : 1.5}
                  />
                  <text
                    x={t.x} y={t.y + 6}
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
                    x={t.x - t.w/2 - 6} y={t.y - t.h/2 - 6}
                    width={t.w + 12} height={t.h + 12}
                    fill="none" stroke="var(--terra-medium)" strokeWidth={2}
                    strokeDasharray="5 4" rx={10} opacity={0.5}
                  />
                )}
                <rect
                  x={t.x - t.w/2} y={t.y - t.h/2}
                  width={t.w} height={t.h}
                  fill={fill}
                  stroke={stroke} strokeWidth={isSel ? 2.5 : 1.5}
                  rx={8}
                />
                <text
                  x={t.x} y={t.y + 6}
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
