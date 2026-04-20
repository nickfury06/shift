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
type Shape = "rect" | "circle" | "round";

interface TableLayout {
  id: string;
  floor: Floor;
  shape: Shape;
  x: number; // center
  y: number; // center
  w: number; // width (full dim)
  h: number; // height
  seats: number; // how many chairs to draw
}

// ═══════════════════════════════════════════════════════════════
// RDC — Rez-de-chaussée
// ═══════════════════════════════════════════════════════════════

const RDC_VIEW = { w: 840, h: 560 };

// Zone backgrounds (tinted areas for each service zone)
const RDC_ZONE_BG = [
  // Restaurant (interior)
  { x: 60, y: 180, w: 440, h: 230, color: "rgba(196,120,90,0.05)", label: "RESTAURANT", lx: 240, ly: 205 },
  // Terrasse couverte non-fumeur (front of restaurant)
  { x: 60, y: 410, w: 320, h: 110, color: "rgba(139,176,150,0.05)", label: "NON-FUMEUR", lx: 220, ly: 435 },
  // Terrasse fumeur (right side open)
  { x: 560, y: 180, w: 220, h: 260, color: "rgba(212,160,74,0.06)", label: "TERRASSE", lx: 670, ly: 205 },
  // Pergola (bottom right, outdoor)
  { x: 500, y: 440, w: 280, h: 90, color: "rgba(181,176,168,0.08)", label: "PERGOLA", lx: 640, ly: 460 },
];

// Non-service areas
const RDC_ZONES = [
  { x: 210, y: 70, w: 190, h: 100, label: "CUISINE", icon: "👨‍🍳" },
  { x: 420, y: 70, w: 160, h: 60, label: "WC" },
  { x: 510, y: 145, w: 55, h: 35, label: "Escalier ↓" },
];

const RDC_TABLES: TableLayout[] = [
  // Restaurant interior
  { id: "480", floor: "rdc", shape: "round", x: 150, y: 230, w: 48, h: 48, seats: 4 },
  { id: "470", floor: "rdc", shape: "round", x: 100, y: 290, w: 48, h: 48, seats: 4 },
  { id: "490", floor: "rdc", shape: "rect", x: 200, y: 270, w: 70, h: 42, seats: 4 },
  { id: "420", floor: "rdc", shape: "rect", x: 300, y: 270, w: 70, h: 42, seats: 4 },
  { id: "400", floor: "rdc", shape: "rect", x: 380, y: 295, w: 55, h: 45, seats: 4 },
  { id: "430", floor: "rdc", shape: "round", x: 270, y: 325, w: 44, h: 44, seats: 2 },
  { id: "460", floor: "rdc", shape: "round", x: 100, y: 360, w: 48, h: 48, seats: 4 },
  { id: "450", floor: "rdc", shape: "rect", x: 200, y: 340, w: 62, h: 42, seats: 4 },
  { id: "410", floor: "rdc", shape: "rect", x: 340, y: 345, w: 62, h: 42, seats: 4 },
  { id: "440", floor: "rdc", shape: "rect", x: 270, y: 380, w: 55, h: 40, seats: 2 },

  // Terrasse couverte (non-fumeur) — front row
  { id: "150", floor: "rdc", shape: "rect", x: 190, y: 440, w: 38, h: 34, seats: 2 },
  { id: "160", floor: "rdc", shape: "rect", x: 235, y: 440, w: 38, h: 34, seats: 2 },
  { id: "140", floor: "rdc", shape: "rect", x: 100, y: 495, w: 38, h: 32, seats: 2 },
  { id: "130", floor: "rdc", shape: "rect", x: 145, y: 495, w: 38, h: 32, seats: 2 },
  { id: "120", floor: "rdc", shape: "rect", x: 190, y: 495, w: 38, h: 32, seats: 2 },
  { id: "110", floor: "rdc", shape: "rect", x: 235, y: 495, w: 38, h: 32, seats: 2 },
  { id: "100", floor: "rdc", shape: "rect", x: 280, y: 495, w: 38, h: 32, seats: 2 },

  // Terrasse fumeur (right side)
  { id: "200", floor: "rdc", shape: "rect", x: 680, y: 235, w: 70, h: 44, seats: 6 },
  { id: "210", floor: "rdc", shape: "rect", x: 680, y: 290, w: 70, h: 44, seats: 6 },
  { id: "220", floor: "rdc", shape: "rect", x: 680, y: 345, w: 70, h: 44, seats: 6 },
  { id: "230", floor: "rdc", shape: "round", x: 680, y: 415, w: 70, h: 70, seats: 8 },
  { id: "240", floor: "rdc", shape: "rect", x: 595, y: 460, w: 48, h: 36, seats: 2 },
  { id: "250", floor: "rdc", shape: "rect", x: 540, y: 460, w: 48, h: 36, seats: 2 },

  // Pergola
  { id: "340", floor: "rdc", shape: "rect", x: 555, y: 490, w: 42, h: 34, seats: 2 },
  { id: "320", floor: "rdc", shape: "rect", x: 605, y: 490, w: 42, h: 34, seats: 2 },
  { id: "330", floor: "rdc", shape: "rect", x: 655, y: 490, w: 42, h: 34, seats: 2 },
  { id: "310", floor: "rdc", shape: "rect", x: 710, y: 500, w: 42, h: 34, seats: 2 },
  { id: "300", floor: "rdc", shape: "rect", x: 755, y: 470, w: 42, h: 34, seats: 2 },
];

// ═══════════════════════════════════════════════════════════════
// R-1 — Sous-sol bar
// ═══════════════════════════════════════════════════════════════

const R1_VIEW = { w: 820, h: 520 };

const R1_ZONE_BG = [
  { x: 60, y: 90, w: 700, h: 320, color: "rgba(139,90,64,0.06)", label: "BAR", lx: 400, ly: 115 },
];

const R1_ZONES = [
  // Bar counter
  { x: 130, y: 185, w: 310, h: 75, label: "Bar" },
  // Stairs
  { x: 660, y: 200, w: 80, h: 80, label: "Escalier ↑" },
];

const R1_TABLES: TableLayout[] = [
  // Bar stools (column in front of counter)
  { id: "10", floor: "r1", shape: "circle", x: 510, y: 155, w: 42, h: 42, seats: 1 },
  { id: "20", floor: "r1", shape: "circle", x: 510, y: 215, w: 42, h: 42, seats: 1 },
  { id: "30", floor: "r1", shape: "circle", x: 510, y: 275, w: 42, h: 42, seats: 1 },
  { id: "40", floor: "r1", shape: "circle", x: 510, y: 335, w: 42, h: 42, seats: 1 },

  // Tables along bottom
  { id: "90", floor: "r1", shape: "rect", x: 145, y: 405, w: 90, h: 55, seats: 4 },
  { id: "80", floor: "r1", shape: "rect", x: 255, y: 405, w: 80, h: 55, seats: 4 },
  { id: "70", floor: "r1", shape: "rect", x: 360, y: 405, w: 85, h: 55, seats: 6 },
  { id: "60", floor: "r1", shape: "rect", x: 470, y: 405, w: 85, h: 55, seats: 6 },
  { id: "50", floor: "r1", shape: "rect", x: 590, y: 405, w: 90, h: 55, seats: 6 },
];

// ── Renderers ────────────────────────────────────────────────

function Seats({ cx, cy, shape, w, h, count, color }: { cx: number; cy: number; shape: Shape; w: number; h: number; count: number; color: string }) {
  // Distribute chairs around table
  const seats: { x: number; y: number }[] = [];
  const pad = 10;
  const dotR = 3;

  if (shape === "rect") {
    const halfW = w / 2;
    const halfH = h / 2;
    // Top & bottom
    if (count >= 2) {
      const perSide = Math.ceil(count / 2);
      for (let i = 0; i < perSide; i++) {
        const t = perSide === 1 ? 0 : (i / (perSide - 1)) * 0.7 - 0.35; // -0.35..0.35
        seats.push({ x: cx + t * w, y: cy - halfH - pad });
      }
      for (let i = 0; i < count - perSide; i++) {
        const t = (count - perSide) === 1 ? 0 : (i / (count - perSide - 1)) * 0.7 - 0.35;
        seats.push({ x: cx + t * w, y: cy + halfH + pad });
      }
    }
  } else {
    // circle / round — distribute around circumference
    const r = (Math.max(w, h) / 2) + pad + 2;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
      seats.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
  }

  return (
    <>
      {seats.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={dotR} fill={color} opacity={0.4} />
      ))}
    </>
  );
}

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

  const view = floor === "rdc" ? RDC_VIEW : R1_VIEW;
  const zoneBgs = floor === "rdc" ? RDC_ZONE_BG : R1_ZONE_BG;
  const zones = floor === "rdc" ? RDC_ZONES : R1_ZONES;
  const layout = floor === "rdc" ? RDC_TABLES : R1_TABLES;

  const selectedResa = selected ? resaByTable[selected] : null;
  const selectedTable = selected ? tables.find((t) => t.id === selected) : null;

  // Stats
  const totalTables = layout.length;
  const bookedTables = layout.filter((t) => getStatus(t.id) !== "free").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Floor switcher with stats */}
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
        <div style={{
          fontSize: 11, fontWeight: 500,
          background: "var(--secondary-bg)",
          padding: "6px 10px", borderRadius: 8,
          color: "var(--text-secondary)",
        }}>
          {bookedTables}/{totalTables}
        </div>
      </div>

      {/* SVG plan */}
      <div style={{
        background: "var(--card-bg)",
        borderRadius: 16,
        border: "1px solid var(--border-color)",
        padding: 6,
        boxShadow: "var(--shadow-light)",
      }}>
        <svg
          viewBox={`0 0 ${view.w} ${view.h}`}
          style={{ width: "100%", height: "auto", display: "block", borderRadius: 12 }}
        >
          {/* Background pattern */}
          <defs>
            <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="var(--text-tertiary)" opacity="0.25" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={view.w} height={view.h} fill="url(#dots)" />

          {/* Zone backgrounds */}
          {zoneBgs.map((z, i) => (
            <g key={i}>
              <rect
                x={z.x} y={z.y} width={z.w} height={z.h}
                fill={z.color}
                rx={12}
              />
              <text
                x={z.lx} y={z.ly}
                fontSize={10} fontWeight={700}
                fill="var(--text-tertiary)" textAnchor="middle"
                letterSpacing={2}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {z.label}
              </text>
            </g>
          ))}

          {/* Orientation marker (entrance) */}
          {floor === "rdc" && (
            <g style={{ pointerEvents: "none" }}>
              <text x={420} y={548} fontSize={10} fontWeight={700} fill="var(--terra-medium)" textAnchor="middle" letterSpacing={1}>
                ▲ RUE DE METZ · ENTRÉE
              </text>
            </g>
          )}

          {/* Non-service zones */}
          {zones.map((z, i) => (
            <g key={i}>
              <rect
                x={z.x} y={z.y} width={z.w} height={z.h}
                fill="var(--secondary-bg)"
                stroke="var(--border-color)" strokeWidth={1}
                rx={8}
              />
              <text
                x={z.x + z.w / 2} y={z.y + z.h / 2 + 4}
                fontSize={11} fontWeight={500}
                fill="var(--text-tertiary)" textAnchor="middle"
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {z.label}
              </text>
            </g>
          ))}

          {/* Tables with seats */}
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
            const textColor = status === "free" ? "var(--text-primary)" : "#fff";
            const seatColor = status === "free" ? "var(--text-tertiary)" : stroke;

            const onClick = () => {
              setSelected(isSel ? null : t.id);
              onTableClick?.(t.id);
            };

            const cx = t.x;
            const cy = t.y;

            return (
              <g key={t.id} onClick={onClick} style={{ cursor: "pointer" }}>
                {/* Seats first (behind table) */}
                <Seats cx={cx} cy={cy} shape={t.shape} w={t.w} h={t.h} count={t.seats} color={seatColor} />

                {/* Selection glow */}
                {isSel && (
                  t.shape === "rect" ? (
                    <rect
                      x={cx - t.w/2 - 6} y={cy - t.h/2 - 6}
                      width={t.w + 12} height={t.h + 12}
                      fill="none" stroke="var(--terra-medium)" strokeWidth={2}
                      strokeDasharray="4 3"
                      rx={8} opacity={0.6}
                    />
                  ) : (
                    <circle
                      cx={cx} cy={cy}
                      r={Math.max(t.w, t.h)/2 + 6}
                      fill="none" stroke="var(--terra-medium)" strokeWidth={2}
                      strokeDasharray="4 3" opacity={0.6}
                    />
                  )
                )}

                {/* Table shape */}
                {t.shape === "rect" ? (
                  <rect
                    x={cx - t.w/2} y={cy - t.h/2}
                    width={t.w} height={t.h}
                    fill={fill} stroke={stroke} strokeWidth={isSel ? 2.5 : 1.5}
                    rx={6}
                  />
                ) : (
                  <circle
                    cx={cx} cy={cy}
                    r={Math.max(t.w, t.h)/2}
                    fill={fill} stroke={stroke} strokeWidth={isSel ? 2.5 : 1.5}
                  />
                )}

                {/* Table number */}
                <text
                  x={cx} y={cy + 5}
                  fontSize={t.shape === "circle" && t.w < 45 ? 11 : 14}
                  fontWeight={700} fill={textColor}
                  textAnchor="middle"
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
        padding: "8px 14px", borderRadius: 10,
        background: "var(--secondary-bg)",
        justifyContent: "center", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, border: "1.5px solid var(--text-tertiary)", background: "var(--card-bg)" }} />
          Libre
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "#D4A04A" }} />
          Réservée
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, borderRadius: 3, background: "#8B5A40" }} />
          Arrivée
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
          <div style={{ width: 4, height: 4, borderRadius: 2, background: "var(--text-tertiary)", opacity: 0.4 }} />
          <span>= chaise</span>
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
