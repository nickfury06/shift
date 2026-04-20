"use client";

import { useState } from "react";
import type { Reservation, VenueTable } from "@/lib/types";
import { Users } from "lucide-react";

interface FloorPlanProps {
  tables: VenueTable[];
  reservations: Reservation[];
  onTableClick?: (tableId: string) => void;
}

interface ZoneConfig {
  key: string;
  label: string;
  description: string;
  icon: string;
  dbZones: string[]; // which DB zones map here
}

const ZONES: ZoneConfig[] = [
  { key: "restaurant", label: "Restaurant", description: "Salle intérieure", icon: "🏠", dbZones: ["restaurant"] },
  { key: "terrasse", label: "Terrasse", description: "Extérieur", icon: "☀️", dbZones: ["terrasse"] },
  { key: "terrasse_couverte", label: "Terrasse couverte", description: "Pergola", icon: "🌿", dbZones: ["terrasse_couverte"] },
  { key: "bar", label: "Bar", description: "Sous-sol", icon: "🍸", dbZones: ["bar"] },
];

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {ZONES.map((zone) => {
        const zoneTables = tables
          .filter((t) => zone.dbZones.includes(t.zone))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        if (zoneTables.length === 0) return null;

        const zoneCapacity = zoneTables.reduce((s, t) => s + t.capacity, 0);
        const zoneBooked = zoneTables.reduce((s, t) => {
          const r = resaByTable[t.id];
          return s + (r ? r.covers : 0);
        }, 0);
        const bookedCount = zoneTables.filter((t) => resaByTable[t.id]).length;

        return (
          <div key={zone.key}>
            {/* Zone header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{zone.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{zone.label}</div>
                  <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{zone.description}</div>
                </div>
              </div>
              <div style={{
                fontSize: 11, color: "var(--text-tertiary)",
                background: "var(--secondary-bg)",
                padding: "4px 10px", borderRadius: 8,
              }}>
                {bookedCount}/{zoneTables.length} <span style={{ opacity: 0.6 }}>·</span> {zoneBooked}/{zoneCapacity} pers.
              </div>
            </div>

            {/* Tables grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(72px, 1fr))",
              gap: 8,
            }}>
              {zoneTables.map((t) => {
                const status = getStatus(t.id);
                const resa = resaByTable[t.id];
                const isSel = selected === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelected(isSel ? null : t.id);
                      onTableClick?.(t.id);
                    }}
                    style={{
                      padding: "10px 8px",
                      borderRadius: 12,
                      border: `2px solid ${
                        isSel ? "var(--terra-medium)"
                        : status === "arrive" ? "#8B5A40"
                        : status === "attendu" ? "var(--warning)"
                        : "var(--border-color)"
                      }`,
                      background: status === "arrive" ? "rgba(139,90,64,0.12)"
                        : status === "attendu" ? "rgba(212,160,74,0.1)"
                        : "var(--card-bg)",
                      cursor: "pointer",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                      transform: isSel ? "scale(1.04)" : "scale(1)",
                      transition: "all 0.15s ease",
                      boxShadow: isSel ? "0 4px 12px rgba(196,120,90,0.25)" : "0 1px 2px rgba(0,0,0,0.02)",
                    }}
                  >
                    <div style={{
                      fontSize: 18, fontWeight: 700,
                      color: status === "free" ? "var(--text-primary)"
                        : status === "arrive" ? "#8B5A40"
                        : "var(--warning)",
                      lineHeight: 1,
                    }}>
                      {t.id}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "var(--text-tertiary)" }}>
                      <Users size={9} />
                      <span>{t.capacity}{t.max_capacity > t.capacity ? `/${t.max_capacity}` : ""}</span>
                    </div>
                    {resa && (
                      <div style={{
                        fontSize: 9, fontWeight: 600, lineHeight: 1,
                        color: status === "arrive" ? "#8B5A40" : "var(--warning)",
                        marginTop: 2,
                      }}>
                        {resa.time.slice(0, 5).replace(":", "h")}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div style={{
        display: "flex", gap: 14, fontSize: 11, color: "var(--text-secondary)",
        padding: "10px 14px", borderRadius: 10,
        background: "var(--secondary-bg)",
        justifyContent: "center", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, border: "2px solid var(--border-color)", background: "var(--card-bg)" }} />
          Libre
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(212,160,74,0.3)", border: "2px solid var(--warning)" }} />
          Réservée
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: "rgba(139,90,64,0.2)", border: "2px solid #8B5A40" }} />
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
            <span style={{
              fontSize: 11, color: "var(--text-tertiary)",
              display: "flex", alignItems: "center", gap: 4,
            }}>
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
