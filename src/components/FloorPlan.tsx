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
type MSize = "sm" | "md" | "lg";

interface Marker {
  id: string;
  x: number; // % horizontal on the plan image
  y: number; // % vertical
  size?: MSize;
}

// Positions relatives (% de l'image) basées sur tes plans architecte
const RDC_MARKERS: Marker[] = [
  // Restaurant (intérieur)
  { id: "480", x: 24,   y: 34 },
  { id: "470", x: 11,   y: 43 },
  { id: "490", x: 27,   y: 42 },
  { id: "420", x: 40,   y: 42 },
  { id: "430", x: 33,   y: 47, size: "sm" },
  { id: "400", x: 51,   y: 47 },
  { id: "460", x: 11,   y: 51 },
  { id: "450", x: 26,   y: 51 },
  { id: "440", x: 35,   y: 51, size: "sm" },
  { id: "410", x: 43,   y: 51 },

  // Terrasse (colonne droite)
  { id: "200", x: 61,   y: 43 },
  { id: "210", x: 61,   y: 49 },
  { id: "220", x: 61,   y: 57 },
  { id: "230", x: 64,   y: 65, size: "lg" },

  // Paire du centre
  { id: "250", x: 43,   y: 65, size: "sm" },
  { id: "240", x: 52,   y: 65, size: "sm" },

  // Terrasse avant (mini-rangée contre bâtiment)
  { id: "150", x: 27,   y: 65, size: "sm" },
  { id: "160", x: 33,   y: 65, size: "sm" },

  // Rangée de rue
  { id: "140", x: 13,   y: 70, size: "sm" },
  { id: "130", x: 19,   y: 70, size: "sm" },
  { id: "120", x: 24,   y: 70, size: "sm" },
  { id: "110", x: 29,   y: 70, size: "sm" },
  { id: "100", x: 34,   y: 70, size: "sm" },

  // Non-fumeur (salle couverte ouverte, bas-droite)
  { id: "340", x: 55,   y: 77, size: "sm" },
  { id: "300", x: 62,   y: 77, size: "sm" },
  { id: "330", x: 55,   y: 82, size: "sm" },
  { id: "320", x: 55,   y: 87, size: "sm" },
  { id: "310", x: 62,   y: 82, size: "sm" },
];

const R1_MARKERS: Marker[] = [
  // Tabourets du bar (colonne)
  { id: "10", x: 60, y: 45, size: "sm" },
  { id: "20", x: 60, y: 52, size: "sm" },
  { id: "30", x: 60, y: 59, size: "sm" },
  { id: "40", x: 60, y: 66, size: "sm" },
  // Tables du bas
  { id: "90", x: 23, y: 78 },
  { id: "80", x: 37, y: 78, size: "sm" },
  { id: "70", x: 51, y: 80 },
  { id: "60", x: 63, y: 80 },
  { id: "50", x: 77, y: 80 },
];

const SIZE_PX: Record<MSize, number> = {
  sm: 34,
  md: 42,
  lg: 52,
};

export default function FloorPlan({ tables, reservations, onTableClick }: FloorPlanProps) {
  const [floor, setFloor] = useState<Floor>("rdc");
  const [selected, setSelected] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const resaByTable: Record<string, Reservation> = {};
  reservations.forEach((r) => { if (r.table_id) resaByTable[r.table_id] = r; });

  function getStatus(id: string): "free" | "attendu" | "arrive" {
    const r = resaByTable[id];
    if (!r) return "free";
    return r.status === "arrive" ? "arrive" : "attendu";
  }

  const markers = floor === "rdc" ? RDC_MARKERS : R1_MARKERS;
  const planSrc = floor === "rdc" ? "/plans/plan-rdc.jpg" : "/plans/plan-r1.jpg";

  const selectedResa = selected ? resaByTable[selected] : null;
  const selectedTable = selected ? tables.find((t) => t.id === selected) : null;

  const totalTables = markers.length;
  const bookedTables = markers.filter((m) => getStatus(m.id) !== "free").length;

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
              onClick={() => { setFloor(f.key); setSelected(null); setImgFailed(false); }}
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

      {/* Plan avec image en fond */}
      <div className="card-light" style={{ padding: 6, overflow: "hidden" }}>
        {imgFailed ? (
          // Placeholder d'instruction si images pas trouvées
          <div style={{
            padding: "40px 24px", textAlign: "center",
            background: "var(--secondary-bg)", borderRadius: 10,
            fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Plans à ajouter
            </div>
            <p>Sauvegarde les 2 images de plan dans :</p>
            <div style={{ fontFamily: "monospace", fontSize: 11, background: "var(--card-bg)", padding: "8px 12px", borderRadius: 6, margin: "8px auto", display: "inline-block" }}>
              public/plans/plan-rdc.jpg
              <br />
              public/plans/plan-r1.jpg
            </div>
            <p style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 8 }}>
              Puis recharge cette page. Les marqueurs se placeront automatiquement.
            </p>
          </div>
        ) : (
          <div style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}>
            <img
              src={planSrc}
              alt={floor === "rdc" ? "Plan rez-de-chaussée" : "Plan sous-sol"}
              onError={() => setImgFailed(true)}
              style={{
                width: "100%", height: "auto", display: "block",
                userSelect: "none", pointerEvents: "none",
              }}
              draggable={false}
            />

            {/* Marqueurs superposés */}
            {markers.map((m) => {
              const status = getStatus(m.id);
              const isSel = selected === m.id;
              const size = SIZE_PX[m.size || "md"];

              const fill =
                status === "arrive" ? "rgba(139,90,64,0.95)"
                : status === "attendu" ? "rgba(212,160,74,0.95)"
                : "rgba(255,255,255,0.92)";
              const stroke =
                isSel ? "#C4785A"
                : status === "arrive" ? "#6B4A30"
                : status === "attendu" ? "#B88835"
                : "#2C2520";
              const textColor = status === "free" ? "#1C1815" : "#FFFFFF";

              return (
                <button
                  key={m.id}
                  onClick={() => {
                    const next = isSel ? null : m.id;
                    setSelected(next);
                    if (next) onTableClick?.(next);
                  }}
                  style={{
                    position: "absolute",
                    left: `${m.x}%`,
                    top: `${m.y}%`,
                    transform: "translate(-50%, -50%)",
                    width: size, height: size,
                    borderRadius: "50%",
                    background: fill,
                    border: `${isSel ? 3 : 2}px solid ${stroke}`,
                    color: textColor,
                    fontSize: size <= 34 ? 11 : size <= 42 ? 13 : 15,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                    boxShadow: isSel
                      ? "0 0 0 4px rgba(196,120,90,0.25), 0 4px 12px rgba(0,0,0,0.25)"
                      : "0 2px 6px rgba(0,0,0,0.2)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {m.id}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Légende */}
      <div style={{
        display: "flex", gap: 14, fontSize: 11, color: "var(--text-secondary)",
        padding: "9px 14px", borderRadius: 10,
        background: "var(--secondary-bg)",
        justifyContent: "center", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid #2C2520", background: "#FFFFFF" }} />
          Libre
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#D4A04A" }} />
          Réservée
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#8B5A40" }} />
          Arrivée
        </div>
      </div>

      {/* Détail de la table sélectionnée */}
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
