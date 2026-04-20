"use client";

import { useState } from "react";
import type { Reservation, VenueTable } from "@/lib/types";

// Table coordinates (percentages, from reading the Le Hive floor plans)
type Floor = "rdc" | "r1";

interface TableCoord {
  id: string;
  floor: Floor;
  x: number; // % horizontal
  y: number; // % vertical
  shape: "rect" | "circle";
  w: number; // % width
  h: number; // % height
}

const TABLE_LAYOUT: TableCoord[] = [
  // RDC — Restaurant (interior)
  { id: "480", floor: "rdc", x: 26, y: 32, shape: "circle", w: 7, h: 9 },
  { id: "470", floor: "rdc", x: 12, y: 44, shape: "circle", w: 7, h: 9 },
  { id: "490", floor: "rdc", x: 24, y: 43, shape: "rect", w: 11, h: 7 },
  { id: "420", floor: "rdc", x: 38, y: 43, shape: "rect", w: 11, h: 7 },
  { id: "400", floor: "rdc", x: 51, y: 48, shape: "rect", w: 9, h: 7 },
  { id: "430", floor: "rdc", x: 37, y: 50, shape: "circle", w: 7, h: 9 },
  { id: "460", floor: "rdc", x: 12, y: 53, shape: "circle", w: 7, h: 9 },
  { id: "450", floor: "rdc", x: 25, y: 52, shape: "rect", w: 11, h: 6 },
  { id: "440", floor: "rdc", x: 37, y: 57, shape: "rect", w: 9, h: 6 },
  { id: "410", floor: "rdc", x: 44, y: 51, shape: "rect", w: 9, h: 6 },

  // RDC — Terrasse couverte (covered, front wall)
  { id: "150", floor: "rdc", x: 26, y: 62, shape: "rect", w: 5, h: 4 },
  { id: "160", floor: "rdc", x: 33, y: 62, shape: "rect", w: 5, h: 4 },
  { id: "140", floor: "rdc", x: 13, y: 70, shape: "rect", w: 5, h: 4 },
  { id: "130", floor: "rdc", x: 19, y: 70, shape: "rect", w: 5, h: 4 },
  { id: "120", floor: "rdc", x: 25, y: 70, shape: "rect", w: 5, h: 4 },
  { id: "110", floor: "rdc", x: 31, y: 70, shape: "rect", w: 5, h: 4 },
  { id: "100", floor: "rdc", x: 37, y: 70, shape: "rect", w: 5, h: 4 },

  // RDC — Terrasse (open, right side)
  { id: "200", floor: "rdc", x: 64, y: 42, shape: "rect", w: 8, h: 6 },
  { id: "210", floor: "rdc", x: 64, y: 51, shape: "rect", w: 8, h: 6 },
  { id: "220", floor: "rdc", x: 64, y: 59, shape: "rect", w: 8, h: 6 },
  { id: "230", floor: "rdc", x: 67, y: 67, shape: "circle", w: 10, h: 12 },
  { id: "240", floor: "rdc", x: 54, y: 70, shape: "rect", w: 7, h: 5 },
  { id: "250", floor: "rdc", x: 46, y: 70, shape: "rect", w: 7, h: 5 },

  // RDC — Pergola / right bottom
  { id: "340", floor: "rdc", x: 56, y: 78, shape: "rect", w: 5, h: 4 },
  { id: "300", floor: "rdc", x: 66, y: 78, shape: "rect", w: 5, h: 4 },
  { id: "330", floor: "rdc", x: 56, y: 83, shape: "rect", w: 5, h: 4 },
  { id: "320", floor: "rdc", x: 56, y: 88, shape: "rect", w: 5, h: 4 },
  { id: "310", floor: "rdc", x: 66, y: 83, shape: "rect", w: 5, h: 4 },

  // R-1 (basement bar)
  { id: "10", floor: "r1", x: 61, y: 30, shape: "circle", w: 7, h: 9 },
  { id: "20", floor: "r1", x: 61, y: 41, shape: "circle", w: 7, h: 9 },
  { id: "30", floor: "r1", x: 61, y: 52, shape: "circle", w: 7, h: 9 },
  { id: "40", floor: "r1", x: 61, y: 63, shape: "circle", w: 7, h: 9 },
  { id: "90", floor: "r1", x: 18, y: 78, shape: "rect", w: 11, h: 7 },
  { id: "80", floor: "r1", x: 35, y: 78, shape: "rect", w: 8, h: 7 },
  { id: "70", floor: "r1", x: 51, y: 78, shape: "rect", w: 10, h: 7 },
  { id: "60", floor: "r1", x: 64, y: 78, shape: "rect", w: 10, h: 7 },
  { id: "50", floor: "r1", x: 77, y: 78, shape: "rect", w: 11, h: 7 },
];

interface FloorPlanProps {
  tables: VenueTable[];
  reservations: Reservation[];
  onTableClick?: (tableId: string) => void;
}

export default function FloorPlan({ tables, reservations, onTableClick }: FloorPlanProps) {
  const [floor, setFloor] = useState<Floor>("rdc");
  const [selected, setSelected] = useState<string | null>(null);

  const layout = TABLE_LAYOUT.filter((t) => t.floor === floor);
  const resaByTable: Record<string, Reservation> = {};
  reservations.forEach((r) => { if (r.table_id) resaByTable[r.table_id] = r; });

  function getStatus(tableId: string): "free" | "attendu" | "arrive" {
    const r = resaByTable[tableId];
    if (!r) return "free";
    return r.status === "arrive" ? "arrive" : "attendu";
  }

  const statusColor = {
    free: { fill: "var(--card-bg)", stroke: "var(--border-color)", text: "var(--text-secondary)" },
    attendu: { fill: "rgba(212,160,74,0.9)", stroke: "var(--warning)", text: "#fff" },
    arrive: { fill: "rgba(139,90,64,0.9)", stroke: "#8B5A40", text: "#fff" },
  };

  const selectedResa = selected ? resaByTable[selected] : null;

  return (
    <div>
      {/* Floor switcher */}
      <div style={{ display: "flex", gap: 4, background: "var(--secondary-bg)", borderRadius: 10, padding: 3, marginBottom: 12 }}>
        {([
          { key: "rdc" as Floor, label: "Rez-de-chaussée" },
          { key: "r1" as Floor, label: "Sous-sol (Bar)" },
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

      {/* Plan container — aspect ratio matches plan images roughly */}
      <div style={{
        position: "relative", width: "100%",
        paddingBottom: "72%", // aspect ratio ~4:3 reflecting the plans
        background: "var(--secondary-bg)",
        borderRadius: 14, border: "1px solid var(--border-color)",
        overflow: "hidden",
      }}>
        {/* Outer walls hint — very faint */}
        <div style={{
          position: "absolute", inset: "8%",
          border: "2px solid var(--border-color)",
          borderRadius: 4, opacity: 0.35,
        }} />

        {/* Floor label */}
        <div style={{
          position: "absolute", top: 10, left: 12,
          fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)",
          textTransform: "uppercase", letterSpacing: "0.08em",
        }}>
          {floor === "rdc" ? "RDC" : "Sous-sol"}
        </div>

        {/* Tables */}
        {layout.map((t) => {
          const status = getStatus(t.id);
          const color = statusColor[status];
          const isSel = selected === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setSelected(isSel ? null : t.id);
                onTableClick?.(t.id);
              }}
              style={{
                position: "absolute",
                left: `${t.x}%`,
                top: `${t.y}%`,
                width: `${t.w}%`,
                height: `${t.h}%`,
                background: color.fill,
                border: `${isSel ? 2 : 1}px solid ${isSel ? "var(--terra-medium)" : color.stroke}`,
                borderRadius: t.shape === "circle" ? "50%" : 4,
                color: color.text,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transform: isSel ? "scale(1.15)" : "scale(1)",
                transition: "transform 0.15s ease",
                boxShadow: isSel ? "0 4px 12px rgba(196,120,90,0.4)" : "0 1px 2px rgba(0,0,0,0.04)",
                padding: 0,
              }}
            >
              {t.id}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--text-secondary)", marginTop: 10, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: "var(--card-bg)", border: "1px solid var(--border-color)" }} />
          Libre
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(212,160,74,0.9)" }} />
          Réservée
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(139,90,64,0.9)" }} />
          Arrivée
        </div>
      </div>

      {/* Selected table details */}
      {selected && (
        <div className="card-medium" style={{ padding: "14px 16px", marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              Table {selected}
            </span>
            {tables.find((t) => t.id === selected) && (
              <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {tables.find((t) => t.id === selected)!.capacity} places
                {tables.find((t) => t.id === selected)!.max_capacity > tables.find((t) => t.id === selected)!.capacity &&
                  ` (max ${tables.find((t) => t.id === selected)!.max_capacity})`}
              </span>
            )}
          </div>
          {selectedResa ? (
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{selectedResa.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                {selectedResa.time} · {selectedResa.covers} pers.
                {selectedResa.status === "arrive" && <span style={{ color: "#8B5A40", marginLeft: 6, fontWeight: 600 }}>✓ Arrivée</span>}
              </div>
              {selectedResa.notes && (
                <div style={{ fontSize: 12, color: "var(--warning)", marginTop: 4 }}>⚠️ {selectedResa.notes}</div>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Libre</p>
          )}
        </div>
      )}
    </div>
  );
}
