"use client";

import { useState } from "react";
import type { Reservation, VenueTable } from "@/lib/types";
import { Users, Home, Sun, Leaf, Wine, ChevronRight } from "lucide-react";

interface FloorPlanProps {
  tables: VenueTable[];
  reservations: Reservation[];
  onTableClick?: (tableId: string) => void;
}

type TShape = "rect" | "circle";
type TSize = "xs" | "sm" | "md" | "lg" | "xl";

interface TablePos {
  id: string;
  x: number;  // % from left of zone canvas
  y: number;  // % from top of zone canvas
  size: TSize;
  shape: TShape;
  seats: number;
}

interface ZoneDef {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tint: string;
  border: string;
  aspect: number;
  tables: TablePos[];
}

// ── Zone definitions with faithful layouts ────────────────────
const ZONES: ZoneDef[] = [
  {
    key: "restaurant",
    label: "Restaurant",
    hint: "Salle intérieure",
    icon: <Home size={13} />,
    tint: "rgba(196,120,90,0.05)",
    border: "rgba(196,120,90,0.15)",
    aspect: 0.62,
    tables: [
      // Top row near kitchen wall
      { id: "480", x: 22, y: 18, size: "md", shape: "circle", seats: 4 },
      // Left wall
      { id: "470", x: 8, y: 40, size: "md", shape: "circle", seats: 4 },
      { id: "460", x: 8, y: 72, size: "md", shape: "circle", seats: 4 },
      // Middle rows
      { id: "490", x: 30, y: 38, size: "md", shape: "rect", seats: 4 },
      { id: "420", x: 52, y: 38, size: "md", shape: "rect", seats: 4 },
      { id: "400", x: 78, y: 42, size: "md", shape: "rect", seats: 4 },
      // Center pivot
      { id: "430", x: 42, y: 58, size: "sm", shape: "circle", seats: 2 },
      // Lower row
      { id: "450", x: 30, y: 72, size: "md", shape: "rect", seats: 4 },
      { id: "440", x: 52, y: 76, size: "sm", shape: "rect", seats: 2 },
      { id: "410", x: 78, y: 72, size: "md", shape: "rect", seats: 4 },
    ],
  },
  {
    key: "terrasse",
    label: "Terrasse",
    hint: "Extérieur · Fumeur",
    icon: <Sun size={13} />,
    tint: "rgba(212,160,74,0.06)",
    border: "rgba(212,160,74,0.18)",
    aspect: 0.85,
    tables: [
      // Vertical column on right (200-220)
      { id: "200", x: 80, y: 10, size: "md", shape: "rect", seats: 6 },
      { id: "210", x: 80, y: 25, size: "md", shape: "rect", seats: 6 },
      { id: "220", x: 80, y: 40, size: "md", shape: "rect", seats: 6 },
      // Big round
      { id: "230", x: 78, y: 58, size: "xl", shape: "circle", seats: 8 },
      // Middle pair
      { id: "240", x: 58, y: 55, size: "sm", shape: "rect", seats: 2 },
      { id: "250", x: 43, y: 55, size: "sm", shape: "rect", seats: 2 },
      // Mini pair against building
      { id: "150", x: 22, y: 55, size: "sm", shape: "rect", seats: 2 },
      { id: "160", x: 32, y: 55, size: "sm", shape: "rect", seats: 2 },
      // Front street row
      { id: "140", x: 8, y: 88, size: "sm", shape: "rect", seats: 2 },
      { id: "130", x: 20, y: 88, size: "sm", shape: "rect", seats: 2 },
      { id: "120", x: 32, y: 88, size: "sm", shape: "rect", seats: 2 },
      { id: "110", x: 44, y: 88, size: "sm", shape: "rect", seats: 2 },
      { id: "100", x: 56, y: 88, size: "sm", shape: "rect", seats: 2 },
    ],
  },
  {
    key: "non_fumeur",
    label: "Non-fumeur",
    hint: "Salle couverte ouverte",
    icon: <Leaf size={13} />,
    tint: "rgba(139,176,150,0.06)",
    border: "rgba(139,176,150,0.2)",
    aspect: 0.42,
    tables: [
      // 340 | 300   top row
      //    330      middle
      // 320 | 310   bottom row
      { id: "340", x: 30, y: 22, size: "sm", shape: "rect", seats: 2 },
      { id: "300", x: 70, y: 22, size: "sm", shape: "rect", seats: 2 },
      { id: "330", x: 50, y: 52, size: "sm", shape: "rect", seats: 2 },
      { id: "320", x: 30, y: 82, size: "sm", shape: "rect", seats: 2 },
      { id: "310", x: 70, y: 82, size: "sm", shape: "rect", seats: 2 },
    ],
  },
  {
    key: "bar",
    label: "Bar",
    hint: "Sous-sol",
    icon: <Wine size={13} />,
    tint: "rgba(139,90,64,0.06)",
    border: "rgba(139,90,64,0.2)",
    aspect: 0.55,
    tables: [
      // Bar stools in column
      { id: "10", x: 58, y: 15, size: "xs", shape: "circle", seats: 1 },
      { id: "20", x: 58, y: 32, size: "xs", shape: "circle", seats: 1 },
      { id: "30", x: 58, y: 49, size: "xs", shape: "circle", seats: 1 },
      { id: "40", x: 58, y: 66, size: "xs", shape: "circle", seats: 1 },
      // Tables along bottom
      { id: "90", x: 10, y: 88, size: "md", shape: "rect", seats: 4 },
      { id: "80", x: 25, y: 88, size: "sm", shape: "rect", seats: 4 },
      { id: "70", x: 43, y: 88, size: "md", shape: "rect", seats: 6 },
      { id: "60", x: 62, y: 88, size: "md", shape: "rect", seats: 6 },
      { id: "80", x: 80, y: 88, size: "md", shape: "rect", seats: 6 },
    ],
  },
];

const SIZE_DIM: Record<TSize, { w: number; h: number; fs: number }> = {
  xs: { w: 36, h: 36, fs: 11 },
  sm: { w: 48, h: 42, fs: 12 },
  md: { w: 62, h: 50, fs: 14 },
  lg: { w: 76, h: 60, fs: 15 },
  xl: { w: 84, h: 84, fs: 16 },
};

// Draw chair dots around a table
function chairPositions(cx: number, cy: number, w: number, h: number, count: number, shape: TShape) {
  const pad = 9;
  const pos: { x: number; y: number }[] = [];
  if (shape === "rect") {
    const top = Math.ceil(count / 2);
    const bot = count - top;
    for (let i = 0; i < top; i++) {
      const t = top === 1 ? 0 : (i / (top - 1)) * 0.7 - 0.35;
      pos.push({ x: cx + t * w, y: cy - h / 2 - pad });
    }
    for (let i = 0; i < bot; i++) {
      const t = bot === 1 ? 0 : (i / (bot - 1)) * 0.7 - 0.35;
      pos.push({ x: cx + t * w, y: cy + h / 2 + pad });
    }
  } else {
    const r = Math.max(w, h) / 2 + pad;
    for (let i = 0; i < count; i++) {
      const a = (i / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
      pos.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  }
  return pos;
}

export default function FloorPlan({ tables, reservations, onTableClick }: FloorPlanProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const resaByTable: Record<string, Reservation> = {};
  reservations.forEach((r) => { if (r.table_id) resaByTable[r.table_id] = r; });

  function getStatus(id: string): "free" | "attendu" | "arrive" {
    const r = resaByTable[id];
    if (!r) return "free";
    return r.status === "arrive" ? "arrive" : "attendu";
  }

  function toggleZone(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const selectedResa = selected ? resaByTable[selected] : null;
  const selectedTable = selected ? tables.find((t) => t.id === selected) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {ZONES.map((zone) => {
        const zoneTables = zone.tables;
        if (zoneTables.length === 0) return null;

        const booked = zoneTables.filter((t) => getStatus(t.id) !== "free").length;
        const total = zoneTables.length;
        const capacity = zoneTables
          .map((pos) => tables.find((x) => x.id === pos.id)?.capacity || 0)
          .reduce((s, c) => s + c, 0);
        const bookedCovers = zoneTables
          .map((pos) => resaByTable[pos.id])
          .filter(Boolean)
          .reduce((s, r) => s + (r?.covers || 0), 0);

        const isCollapsed = collapsed.has(zone.key);

        return (
          <div key={zone.key} className="card-light" style={{ padding: 0, overflow: "hidden" }}>
            {/* Zone header (tappable) */}
            <button
              onClick={() => toggleZone(zone.key)}
              style={{
                width: "100%", padding: "12px 14px", background: "none", border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", gap: 10,
                borderBottom: isCollapsed ? "none" : "1px solid var(--border-color)",
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: zone.tint,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--terra-medium)", flexShrink: 0,
              }}>
                {zone.icon}
              </div>
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                  {zone.label}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  {zone.hint} · {booked}/{total} tables · {bookedCovers}/{capacity} pers.
                </div>
              </div>
              <ChevronRight size={16} style={{
                color: "var(--text-tertiary)",
                transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
                transition: "transform 0.2s",
                flexShrink: 0,
              }} />
            </button>

            {/* Plan canvas */}
            {!isCollapsed && (
              <div style={{
                position: "relative",
                width: "100%",
                paddingBottom: `${zone.aspect * 100}%`,
                background: zone.tint,
                borderTop: `1px solid ${zone.border}`,
              }}>
                {/* Subtle grid pattern */}
                <svg
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.4 }}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <pattern id={`grid-${zone.key}`} width="24" height="24" patternUnits="userSpaceOnUse">
                      <circle cx="1" cy="1" r="0.7" fill="var(--text-tertiary)" opacity="0.3" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill={`url(#grid-${zone.key})`} />
                </svg>

                {/* Tables */}
                {zoneTables.map((pos) => {
                  const dbTable = tables.find((t) => t.id === pos.id);
                  if (!dbTable) return null;
                  const status = getStatus(pos.id);
                  const resa = resaByTable[pos.id];
                  const isSel = selected === pos.id;
                  const dim = SIZE_DIM[pos.size];
                  const w = dim.w;
                  const h = pos.shape === "circle" ? w : dim.h;

                  const fill =
                    status === "arrive" ? "#8B5A40"
                    : status === "attendu" ? "#D4A04A"
                    : "var(--card-bg)";
                  const border =
                    isSel ? "var(--terra-medium)"
                    : status === "arrive" ? "#6B4A30"
                    : status === "attendu" ? "#B88835"
                    : "#8A857E";
                  const textColor = status === "free" ? "var(--text-primary)" : "#fff";
                  const seatColor = status === "free" ? "var(--text-tertiary)" : border;

                  // Chair dots (absolute positioning relative to zone canvas)
                  const chairs = chairPositions(0, 0, w, h, pos.seats, pos.shape);

                  return (
                    <div
                      key={pos.id}
                      style={{
                        position: "absolute",
                        left: `${pos.x}%`,
                        top: `${pos.y}%`,
                        transform: "translate(-50%, -50%)",
                        pointerEvents: "none",
                      }}
                    >
                      {/* Chair dots */}
                      {chairs.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            position: "absolute",
                            left: c.x, top: c.y,
                            width: 5, height: 5, borderRadius: 3,
                            background: seatColor,
                            opacity: 0.45,
                            transform: "translate(-50%, -50%)",
                          }}
                        />
                      ))}

                      {/* Table button */}
                      <button
                        onClick={() => {
                          const next = isSel ? null : pos.id;
                          setSelected(next);
                          if (next) onTableClick?.(next);
                        }}
                        style={{
                          pointerEvents: "auto",
                          width: w, height: h,
                          borderRadius: pos.shape === "circle" ? "50%" : 8,
                          background: fill,
                          border: `${isSel ? 2.5 : 1.5}px solid ${border}`,
                          color: textColor,
                          fontSize: dim.fs,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 1,
                          padding: 0,
                          lineHeight: 1,
                          boxShadow: isSel
                            ? "0 0 0 3px rgba(196,120,90,0.2), 0 4px 12px rgba(196,120,90,0.25)"
                            : status !== "free" ? "0 2px 6px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.04)",
                          transition: "all 0.18s ease",
                          position: "relative",
                          transform: "translate(-50%, -50%)",
                          top: "50%",
                          left: "50%",
                        }}
                      >
                        <span>{pos.id}</span>
                        {resa && (
                          <span style={{ fontSize: dim.fs - 3, fontWeight: 500, opacity: 0.9, lineHeight: 1 }}>
                            {resa.time.slice(0, 5).replace(":", "h")}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Legend */}
      <div style={{
        display: "flex", gap: 16, fontSize: 11, color: "var(--text-secondary)",
        padding: "10px 14px", borderRadius: 12,
        background: "var(--secondary-bg)",
        justifyContent: "center", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, border: "1.5px solid #8A857E", background: "var(--card-bg)" }} />
          Libre
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: "#D4A04A" }} />
          Réservée
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: "#8B5A40" }} />
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
