"use client";

import { useState } from "react";
import type { Reservation, VenueTable } from "@/lib/types";
import { Users, Home, Sun, Leaf, Wine } from "lucide-react";

interface FloorPlanProps {
  tables: VenueTable[];
  reservations: Reservation[];
  onTableClick?: (tableId: string) => void;
}

// Table position within its zone card (% coordinates)
interface TablePos {
  id: string;
  x: number; // % from left
  y: number; // % from top
  size: "sm" | "md" | "lg" | "xl"; // visual scale
}

interface ZoneDef {
  key: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tint: string; // subtle bg
  dbZone: string;
  // card aspect ratio (height = aspect × width)
  aspect: number;
  // tables in this zone with positions
  tables: TablePos[];
}

const ZONES: ZoneDef[] = [
  {
    key: "restaurant",
    label: "Restaurant",
    hint: "Salle intérieure",
    icon: <Home size={14} />,
    tint: "rgba(196,120,90,0.05)",
    dbZone: "restaurant",
    aspect: 0.55,
    tables: [
      // Row 1 (top)
      { id: "480", x: 22, y: 18, size: "md" },
      // Row 2
      { id: "470", x: 8, y: 40, size: "md" },
      { id: "490", x: 30, y: 38, size: "md" },
      { id: "420", x: 52, y: 38, size: "md" },
      { id: "400", x: 75, y: 38, size: "md" },
      // Row 3
      { id: "430", x: 42, y: 60, size: "sm" },
      // Row 4 (bottom)
      { id: "460", x: 8, y: 72, size: "md" },
      { id: "450", x: 30, y: 70, size: "md" },
      { id: "440", x: 52, y: 74, size: "sm" },
      { id: "410", x: 75, y: 70, size: "md" },
    ],
  },
  {
    key: "terrasse",
    label: "Terrasse",
    hint: "Extérieur · Fumeur",
    icon: <Sun size={14} />,
    tint: "rgba(212,160,74,0.06)",
    dbZone: "terrasse",
    aspect: 0.6,
    tables: [
      // Right column (200-220)
      { id: "200", x: 82, y: 12, size: "md" },
      { id: "210", x: 82, y: 30, size: "md" },
      { id: "220", x: 82, y: 48, size: "md" },
      // Big round table (230) bottom right
      { id: "230", x: 80, y: 72, size: "xl" },
      // Center pair (240, 250)
      { id: "250", x: 45, y: 60, size: "sm" },
      { id: "240", x: 60, y: 60, size: "sm" },
      // Front row along the wall (150, 160)
      { id: "150", x: 25, y: 55, size: "sm" },
      { id: "160", x: 35, y: 55, size: "sm" },
      // Front sidewalk row (100-140)
      { id: "140", x: 8, y: 88, size: "sm" },
      { id: "130", x: 20, y: 88, size: "sm" },
      { id: "120", x: 32, y: 88, size: "sm" },
      { id: "110", x: 44, y: 88, size: "sm" },
      { id: "100", x: 56, y: 88, size: "sm" },
    ],
  },
  {
    key: "non_fumeur",
    label: "Non-fumeur",
    hint: "Salle couverte, ouverte sur la terrasse",
    icon: <Leaf size={14} />,
    tint: "rgba(139,176,150,0.06)",
    dbZone: "terrasse_couverte",
    aspect: 0.4,
    tables: [
      // Covered open salle (300-340)
      { id: "340", x: 20, y: 35, size: "sm" },
      { id: "320", x: 40, y: 35, size: "sm" },
      { id: "330", x: 60, y: 35, size: "sm" },
      { id: "310", x: 40, y: 70, size: "sm" },
      { id: "300", x: 60, y: 70, size: "sm" },
    ],
  },
  {
    key: "bar",
    label: "Bar",
    hint: "Sous-sol",
    icon: <Wine size={14} />,
    tint: "rgba(139,90,64,0.06)",
    dbZone: "bar",
    aspect: 0.45,
    tables: [
      // Bar stools in a column (10-40)
      { id: "10", x: 50, y: 15, size: "sm" },
      { id: "20", x: 50, y: 33, size: "sm" },
      { id: "30", x: 50, y: 51, size: "sm" },
      { id: "40", x: 50, y: 69, size: "sm" },
      // Tables along bottom
      { id: "90", x: 10, y: 85, size: "md" },
      { id: "80", x: 26, y: 85, size: "md" },
      { id: "70", x: 44, y: 85, size: "md" },
      { id: "60", x: 62, y: 85, size: "md" },
      { id: "50", x: 80, y: 85, size: "md" },
    ],
  },
];


// ── Size definitions ────────────────────────────────────────
const SIZE_DIM: Record<"sm" | "md" | "lg" | "xl", { w: number; h: number; fs: number; shape: "rect" | "circle" }> = {
  sm: { w: 40, h: 40, fs: 13, shape: "rect" },
  md: { w: 52, h: 44, fs: 14, shape: "rect" },
  lg: { w: 64, h: 52, fs: 15, shape: "rect" },
  xl: { w: 64, h: 64, fs: 15, shape: "circle" },
};

// Override shapes for specific tables (round ones)
const ROUND_IDS = new Set(["480", "470", "460", "430", "230", "10", "20", "30", "40"]);

export default function FloorPlan({ tables, reservations, onTableClick }: FloorPlanProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const resaByTable: Record<string, Reservation> = {};
  reservations.forEach((r) => { if (r.table_id) resaByTable[r.table_id] = r; });

  function getStatus(tableId: string): "free" | "attendu" | "arrive" {
    const r = resaByTable[tableId];
    if (!r) return "free";
    return r.status === "arrive" ? "arrive" : "attendu";
  }

  const selectedResa = selected ? resaByTable[selected] : null;
  const selectedTable = selected ? tables.find((t) => t.id === selected) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {ZONES.map((zone) => {
        if (zone.tables.length === 0) return null;
        const zoneTableIds = zone.tables.map((t) => t.id);
        const booked = zoneTableIds.filter((id) => getStatus(id) !== "free").length;
        const total = zone.tables.length;
        const totalCapacity = zoneTableIds
          .map((id) => tables.find((t) => t.id === id)?.capacity || 0)
          .reduce((s, c) => s + c, 0);
        const bookedCovers = zoneTableIds
          .filter((id) => resaByTable[id])
          .map((id) => resaByTable[id]!.covers)
          .reduce((s, c) => s + c, 0);

        return (
          <div
            key={zone.key}
            className="card-light"
            style={{ padding: 14, overflow: "hidden" }}
          >
            {/* Zone header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: zone.tint,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--terra-medium)",
                }}>
                  {zone.icon}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                    {zone.label}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{zone.hint}</div>
                </div>
              </div>
              <div style={{
                fontSize: 11, fontWeight: 600,
                background: "var(--secondary-bg)",
                color: "var(--text-secondary)",
                padding: "4px 10px", borderRadius: 8,
                textAlign: "right",
                lineHeight: 1.3,
              }}>
                <div>{booked}/{total} <span style={{ opacity: 0.6, fontWeight: 500 }}>tables</span></div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{bookedCovers}/{totalCapacity} pers.</div>
              </div>
            </div>

            {/* Plan area */}
            <div style={{
              position: "relative",
              width: "100%",
              paddingBottom: `${zone.aspect * 100}%`,
              background: zone.tint,
              borderRadius: 10,
              border: "1px dashed var(--border-color)",
            }}>
              {zone.tables.map((pos) => {
                const dbTable = tables.find((t) => t.id === pos.id);
                if (!dbTable) return null;
                const status = getStatus(pos.id);
                const isSel = selected === pos.id;
                const isRound = ROUND_IDS.has(pos.id);
                const baseSize = SIZE_DIM[pos.size];
                const w = baseSize.w;
                const h = isRound ? w : baseSize.h;

                const fill =
                  status === "arrive" ? "#8B5A40"
                  : status === "attendu" ? "#D4A04A"
                  : "var(--card-bg)";
                const border =
                  isSel ? "var(--terra-medium)"
                  : status === "arrive" ? "#6B4A30"
                  : status === "attendu" ? "#B88835"
                  : "var(--border-color)";
                const textColor = status === "free" ? "var(--text-primary)" : "#fff";

                return (
                  <button
                    key={pos.id}
                    onClick={() => {
                      const next = isSel ? null : pos.id;
                      setSelected(next);
                      if (next) onTableClick?.(next);
                    }}
                    style={{
                      position: "absolute",
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      transform: "translate(-50%, -50%)",
                      width: w,
                      height: h,
                      borderRadius: isRound ? "50%" : 10,
                      background: fill,
                      border: `${isSel ? 2.5 : 1.5}px solid ${border}`,
                      color: textColor,
                      fontSize: baseSize.fs,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 0,
                      boxShadow: isSel
                        ? "0 0 0 3px rgba(196,120,90,0.2), 0 4px 12px rgba(196,120,90,0.25)"
                        : status !== "free" ? "0 2px 6px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.03)",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {pos.id}
                  </button>
                );
              })}
            </div>
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
          <div style={{ width: 14, height: 14, borderRadius: 3, border: "1.5px solid var(--border-color)", background: "var(--card-bg)" }} />
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

      {/* Selected table details */}
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
