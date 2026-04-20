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
type Shape = "rect" | "circle";

interface TableLayout {
  id: string;
  floor: Floor;
  shape: Shape;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── RDC layout (ground floor) — matches architectural plan ─────
const RDC_VIEWBOX = { w: 600, h: 400 };
const RDC_WALLS = [
  // Outer walls (approximate shape from plan)
  "M80,40 L360,40 L380,100 L420,100 L420,60 L520,60 L540,140 L540,240 L520,340 L320,340 L320,360 L80,360 Z",
];
const RDC_ZONES = [
  // Kitchen (top-left interior block)
  { x: 170, y: 55, w: 130, h: 85, label: "Cuisine" },
  // WC area
  { x: 380, y: 65, w: 130, h: 40, label: "WC" },
  // Bar/stairs mid
  { x: 340, y: 120, w: 50, h: 90, label: "Escalier" },
];

const RDC_TABLES: TableLayout[] = [
  // Restaurant
  { id: "480", floor: "rdc", shape: "circle", x: 145, y: 135, w: 28, h: 28 },
  { id: "470", floor: "rdc", shape: "circle", x: 95, y: 185, w: 28, h: 28 },
  { id: "490", floor: "rdc", shape: "rect", x: 135, y: 172, w: 55, h: 28 },
  { id: "420", floor: "rdc", shape: "rect", x: 220, y: 172, w: 55, h: 28 },
  { id: "400", floor: "rdc", shape: "rect", x: 295, y: 192, w: 40, h: 30 },
  { id: "430", floor: "rdc", shape: "circle", x: 200, y: 212, w: 28, h: 28 },
  { id: "460", floor: "rdc", shape: "circle", x: 95, y: 235, w: 28, h: 28 },
  { id: "450", floor: "rdc", shape: "rect", x: 135, y: 220, w: 50, h: 28 },
  { id: "410", floor: "rdc", shape: "rect", x: 245, y: 220, w: 45, h: 28 },
  { id: "440", floor: "rdc", shape: "rect", x: 200, y: 250, w: 40, h: 26 },

  // Terrasse couverte (front row, non-smoking)
  { id: "150", floor: "rdc", shape: "rect", x: 150, y: 285, w: 26, h: 22 },
  { id: "160", floor: "rdc", shape: "rect", x: 185, y: 285, w: 26, h: 22 },
  { id: "140", floor: "rdc", shape: "rect", x: 80, y: 320, w: 26, h: 22 },
  { id: "130", floor: "rdc", shape: "rect", x: 112, y: 320, w: 26, h: 22 },
  { id: "120", floor: "rdc", shape: "rect", x: 144, y: 320, w: 26, h: 22 },
  { id: "110", floor: "rdc", shape: "rect", x: 176, y: 320, w: 26, h: 22 },
  { id: "100", floor: "rdc", shape: "rect", x: 208, y: 320, w: 26, h: 22 },

  // Terrasse (fumeur, right side)
  { id: "200", floor: "rdc", shape: "rect", x: 430, y: 150, w: 50, h: 30 },
  { id: "210", floor: "rdc", shape: "rect", x: 430, y: 190, w: 50, h: 30 },
  { id: "220", floor: "rdc", shape: "rect", x: 430, y: 230, w: 50, h: 30 },
  { id: "230", floor: "rdc", shape: "circle", x: 455, y: 285, w: 50, h: 50 },
  { id: "240", floor: "rdc", shape: "rect", x: 380, y: 290, w: 32, h: 25 },
  { id: "250", floor: "rdc", shape: "rect", x: 340, y: 290, w: 32, h: 25 },

  // Pergola bottom
  { id: "300", floor: "rdc", shape: "rect", x: 440, y: 345, w: 28, h: 22 },
  { id: "310", floor: "rdc", shape: "rect", x: 440, y: 373, w: 28, h: 22 },
  { id: "340", floor: "rdc", shape: "rect", x: 400, y: 345, w: 28, h: 22 },
  { id: "330", floor: "rdc", shape: "rect", x: 400, y: 373, w: 28, h: 22 },
  { id: "320", floor: "rdc", shape: "rect", x: 360, y: 373, w: 28, h: 22 },
];

// ── R-1 layout (basement bar) ──────────────────────────────────
const R1_VIEWBOX = { w: 600, h: 400 };
const R1_WALLS = [
  "M60,40 L540,40 L540,360 L60,360 Z",
];
const R1_ZONES = [
  // Bar counter
  { x: 90, y: 140, w: 200, h: 60, label: "Bar" },
  // Stairs up (top-right-ish)
  { x: 480, y: 160, w: 50, h: 80, label: "Escalier" },
];

const R1_TABLES: TableLayout[] = [
  // Bar stools (column next to counter)
  { id: "10", floor: "r1", shape: "circle", x: 360, y: 130, w: 26, h: 26 },
  { id: "20", floor: "r1", shape: "circle", x: 360, y: 170, w: 26, h: 26 },
  { id: "30", floor: "r1", shape: "circle", x: 360, y: 210, w: 26, h: 26 },
  { id: "40", floor: "r1", shape: "circle", x: 360, y: 250, w: 26, h: 26 },

  // Tables along bottom wall
  { id: "90", floor: "r1", shape: "rect", x: 80, y: 290, w: 60, h: 40 },
  { id: "80", floor: "r1", shape: "rect", x: 160, y: 290, w: 50, h: 40 },
  { id: "70", floor: "r1", shape: "rect", x: 230, y: 290, w: 55, h: 40 },
  { id: "60", floor: "r1", shape: "rect", x: 305, y: 290, w: 55, h: 40 },
  { id: "50", floor: "r1", shape: "rect", x: 380, y: 290, w: 60, h: 40 },
];

export default function FloorPlan({ tables, reservations, onTableClick }: FloorPlanProps) {
  const [floor, setFloor] = useState<Floor>("rdc");
  const [selected, setSelected] = useState<string | null>(null);

  const resaByTable: Record<string, Reservation> = {};
  reservations.forEach((r) => { if (r.table_id) resaByTable[r.table_id] = r; });

  function getStatus(tableId: string): "free" | "attendu" | "arrive" {
    const r = resaByTable[tableId];
    if (!r) return "free";
    return r.status === "arrive" ? "arrive" : "attendu";
  }

  const viewBox = floor === "rdc" ? RDC_VIEWBOX : R1_VIEWBOX;
  const walls = floor === "rdc" ? RDC_WALLS : R1_WALLS;
  const zones = floor === "rdc" ? RDC_ZONES : R1_ZONES;
  const layout = (floor === "rdc" ? RDC_TABLES : R1_TABLES);

  const selectedResa = selected ? resaByTable[selected] : null;
  const selectedTable = selected ? tables.find((t) => t.id === selected) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Floor switcher */}
      <div style={{ display: "flex", gap: 4, background: "var(--secondary-bg)", borderRadius: 10, padding: 3 }}>
        {([
          { key: "rdc" as Floor, label: "Rez-de-chaussée" },
          { key: "r1" as Floor, label: "Sous-sol · Bar" },
        ]).map((f) => (
          <button
            key={f.key}
            onClick={() => { setFloor(f.key); setSelected(null); }}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 500,
              background: floor === f.key ? "var(--card-bg)" : "transparent",
              color: floor === f.key ? "var(--text-primary)" : "var(--text-tertiary)",
              boxShadow: floor === f.key ? "var(--shadow-light)" : "none",
              transition: "all 0.2s",
            }}
          >{f.label}</button>
        ))}
      </div>

      {/* SVG plan */}
      <div style={{
        position: "relative",
        background: "var(--card-bg)",
        borderRadius: 14,
        border: "1px solid var(--border-color)",
        padding: 8,
      }}>
        {/* Orientation hints (entrance, kitchen etc. via zone labels) */}
        {floor === "rdc" && (
          <div style={{ position: "absolute", top: 12, left: 14, fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", zIndex: 2 }}>
            Rue de Metz →
          </div>
        )}

        <svg viewBox={`0 0 ${viewBox.w} ${viewBox.h}`} style={{ width: "100%", height: "auto", display: "block" }}>
          {/* Outer walls */}
          {walls.map((d, i) => (
            <path key={i} d={d} fill="var(--secondary-bg)" stroke="var(--text-tertiary)" strokeWidth={3} strokeLinejoin="round" opacity={0.9} />
          ))}

          {/* Non-interactive zones (kitchen, WC, stairs) */}
          {zones.map((z, i) => (
            <g key={i}>
              <rect
                x={z.x} y={z.y} width={z.w} height={z.h}
                fill="var(--border-color)" opacity={0.5}
                rx={2}
              />
              <text
                x={z.x + z.w / 2} y={z.y + z.h / 2 + 4}
                fontSize={11} fontWeight={500}
                fill="var(--text-tertiary)" textAnchor="middle"
                style={{ pointerEvents: "none" }}
              >
                {z.label}
              </text>
            </g>
          ))}

          {/* Zone separators for clarity */}
          {floor === "rdc" && (
            <>
              {/* Dashed line separating terrasse from interior */}
              <line x1={320} y1={60} x2={320} y2={280} stroke="var(--border-color)" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} />
              {/* Labels for outdoor areas */}
              <text x={460} y={100} fontSize={9} fontWeight={600} fill="var(--text-tertiary)" textAnchor="middle" letterSpacing={1} style={{ pointerEvents: "none" }}>TERRASSE</text>
              <text x={155} y={275} fontSize={8} fontWeight={600} fill="var(--text-tertiary)" textAnchor="middle" letterSpacing={1} style={{ pointerEvents: "none" }}>NON-FUMEUR</text>
              <text x={400} y={340} fontSize={9} fontWeight={600} fill="var(--text-tertiary)" textAnchor="middle" letterSpacing={1} style={{ pointerEvents: "none" }}>PERGOLA</text>
              <text x={200} y={130} fontSize={9} fontWeight={600} fill="var(--text-tertiary)" textAnchor="middle" letterSpacing={1} style={{ pointerEvents: "none" }}>RESTAURANT</text>
            </>
          )}
          {floor === "r1" && (
            <text x={300} y={80} fontSize={10} fontWeight={600} fill="var(--text-tertiary)" textAnchor="middle" letterSpacing={1.5} style={{ pointerEvents: "none" }}>BAR · SOUS-SOL</text>
          )}

          {/* Tables */}
          {layout.map((t) => {
            const status = getStatus(t.id);
            const isSel = selected === t.id;
            const fill =
              status === "arrive" ? "rgba(139,90,64,0.9)"
              : status === "attendu" ? "rgba(212,160,74,0.9)"
              : "var(--card-bg)";
            const stroke =
              isSel ? "var(--terra-medium)"
              : status === "arrive" ? "#8B5A40"
              : status === "attendu" ? "var(--warning)"
              : "var(--text-tertiary)";
            const textColor = status === "free" ? "var(--text-primary)" : "#fff";

            const onClick = () => {
              setSelected(isSel ? null : t.id);
              onTableClick?.(t.id);
            };

            if (t.shape === "circle") {
              const cx = t.x + t.w / 2;
              const cy = t.y + t.h / 2;
              const r = t.w / 2;
              return (
                <g key={t.id} onClick={onClick} style={{ cursor: "pointer" }}>
                  <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={isSel ? 3 : 2} />
                  <text x={cx} y={cy + 4} fontSize={11} fontWeight={700} fill={textColor} textAnchor="middle" style={{ pointerEvents: "none", userSelect: "none" }}>
                    {t.id}
                  </text>
                </g>
              );
            }
            return (
              <g key={t.id} onClick={onClick} style={{ cursor: "pointer" }}>
                <rect
                  x={t.x} y={t.y} width={t.w} height={t.h}
                  fill={fill} stroke={stroke} strokeWidth={isSel ? 3 : 2}
                  rx={3}
                />
                <text
                  x={t.x + t.w / 2} y={t.y + t.h / 2 + 4}
                  fontSize={11} fontWeight={700} fill={textColor}
                  textAnchor="middle" style={{ pointerEvents: "none", userSelect: "none" }}
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
        padding: "8px 14px", borderRadius: 10,
        background: "var(--secondary-bg)",
        justifyContent: "center", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, border: "2px solid var(--text-tertiary)", background: "var(--card-bg)" }} />
          Libre
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(212,160,74,0.9)" }} />
          Réservée
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: "rgba(139,90,64,0.9)" }} />
          Arrivée
        </div>
      </div>

      {/* Selected table details */}
      {selected && selectedTable && (
        <div className="card-medium" style={{ padding: "14px 16px" }}>
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
