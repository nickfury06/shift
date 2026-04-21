"use client";

import { useState, useRef, useEffect } from "react";
import type { Reservation, VenueTable } from "@/lib/types";
import { Users, ZoomIn, ZoomOut, Maximize2, Move, Check, RotateCcw } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

interface FloorPlanProps {
  tables: VenueTable[];
  reservations: Reservation[];
  onTableClick?: (tableId: string) => void;
}

type Floor = "rdc" | "r1";

interface Marker {
  id: string;
  x: number;
  y: number;
}

// Positions de départ (tu pourras les ajuster en mode édition)
const DEFAULT_RDC: Marker[] = [
  { id: "480", x: 24, y: 34 },
  { id: "470", x: 11, y: 43 },
  { id: "490", x: 27, y: 42 },
  { id: "420", x: 40, y: 42 },
  { id: "430", x: 33, y: 48 },
  { id: "400", x: 51, y: 47 },
  { id: "460", x: 11, y: 51 },
  { id: "450", x: 26, y: 51 },
  { id: "440", x: 35, y: 53 },
  { id: "410", x: 43, y: 51 },
  { id: "200", x: 61, y: 43 },
  { id: "210", x: 61, y: 49 },
  { id: "220", x: 61, y: 57 },
  { id: "230", x: 64, y: 65 },
  { id: "250", x: 43, y: 65 },
  { id: "240", x: 52, y: 65 },
  { id: "150", x: 27, y: 65 },
  { id: "160", x: 33, y: 65 },
  { id: "140", x: 13, y: 70 },
  { id: "130", x: 19, y: 70 },
  { id: "120", x: 24, y: 70 },
  { id: "110", x: 29, y: 70 },
  { id: "100", x: 34, y: 70 },
  { id: "340", x: 55, y: 77 },
  { id: "300", x: 62, y: 77 },
  { id: "330", x: 55, y: 82 },
  { id: "320", x: 55, y: 87 },
  { id: "310", x: 62, y: 82 },
];

const DEFAULT_R1: Marker[] = [
  { id: "10", x: 60, y: 45 },
  { id: "20", x: 60, y: 52 },
  { id: "30", x: 60, y: 59 },
  { id: "40", x: 60, y: 66 },
  { id: "90", x: 23, y: 78 },
  { id: "80", x: 37, y: 78 },
  { id: "70", x: 51, y: 80 },
  { id: "60", x: 63, y: 80 },
  { id: "50", x: 77, y: 80 },
];

function loadMarkers(floor: Floor): Marker[] {
  if (typeof window === "undefined") return floor === "rdc" ? DEFAULT_RDC : DEFAULT_R1;
  try {
    const raw = localStorage.getItem(`shift-plan-${floor}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return floor === "rdc" ? DEFAULT_RDC : DEFAULT_R1;
}
function saveMarkers(floor: Floor, markers: Marker[]) {
  localStorage.setItem(`shift-plan-${floor}`, JSON.stringify(markers));
}

export default function FloorPlan({ tables, reservations, onTableClick }: FloorPlanProps) {
  const { profile } = useAuth();
  const editable = profile?.role === "patron";
  const [floor, setFloor] = useState<Floor>("rdc");
  const [selected, setSelected] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [editMode, setEditMode] = useState(false);
  const [focusZone, setFocusZone] = useState<string | "all">("all");

  // Defensive: if role changes away from patron, close editor
  useEffect(() => {
    if (!editable && editMode) { setEditMode(false); setFocusZone("all"); }
  }, [editable, editMode]);
  const [rdcMarkers, setRdcMarkers] = useState<Marker[]>(() => loadMarkers("rdc"));
  const [r1Markers, setR1Markers] = useState<Marker[]>(() => loadMarkers("r1"));
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const planAreaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const resaByTable: Record<string, Reservation> = {};
  reservations.forEach((r) => { if (r.table_id) resaByTable[r.table_id] = r; });

  function getStatus(id: string): "free" | "attendu" | "arrive" {
    const r = resaByTable[id];
    if (!r) return "free";
    return r.status === "arrive" ? "arrive" : "attendu";
  }

  const markers = floor === "rdc" ? rdcMarkers : r1Markers;
  const setMarkers = floor === "rdc" ? setRdcMarkers : setR1Markers;
  const planSrc = floor === "rdc" ? "/plans/plan-table-R-0.jpg" : "/plans/plan-table-R-1.jpg";

  const selectedResa = selected ? resaByTable[selected] : null;
  const selectedTable = selected ? tables.find((t) => t.id === selected) : null;

  const totalTables = markers.length;
  const bookedTables = markers.filter((m) => getStatus(m.id) !== "free").length;

  // ── Move marker to new position (edit mode) ──────────────
  function moveMarker(id: string, clientX: number, clientY: number) {
    if (!planAreaRef.current) return;
    const rect = planAreaRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    setMarkers((prev) => {
      const next = prev.map((m) => (m.id === id ? { ...m, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } : m));
      saveMarkers(floor, next);
      return next;
    });
  }

  function resetPositions() {
    if (!confirm("Réinitialiser les positions par défaut ?")) return;
    localStorage.removeItem(`shift-plan-${floor}`);
    const defaults = floor === "rdc" ? DEFAULT_RDC : DEFAULT_R1;
    setMarkers(defaults);
  }

  // Mouse / touch handlers for edit drag
  useEffect(() => {
    if (!draggingId) return;
    function onMove(e: MouseEvent | TouchEvent) {
      const cx = "touches" in e ? e.touches[0].clientX : e.clientX;
      const cy = "touches" in e ? e.touches[0].clientY : e.clientY;
      moveMarker(draggingId!, cx, cy);
    }
    function onUp() { setDraggingId(null); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draggingId, floor]);

  // ── Zoom controls ───────────────────────────────────────
  function zoomIn() { setZoom((z) => Math.min(3, z + 0.5)); }
  function zoomOut() { setZoom((z) => Math.max(1, z - 0.5)); }
  function reset() { setZoom(1); setPan({ x: 0, y: 0 }); }

  function onPanStart(clientX: number, clientY: number) {
    if (zoom <= 1 || editMode) return;
    dragRef.current = { startX: clientX, startY: clientY, panX: pan.x, panY: pan.y };
  }
  function onPanMove(clientX: number, clientY: number) {
    if (!dragRef.current) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  }
  function onPanEnd() { dragRef.current = null; }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Edit mode banner + zone filter */}
      {editMode && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{
            padding: "10px 14px", borderRadius: 10,
            background: "rgba(196,120,90,0.1)",
            border: "1px solid rgba(196,120,90,0.25)",
            fontSize: 12, color: "var(--terra-deep)", fontWeight: 500,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <Move size={14} />
            <span>Glisse les marqueurs à leur position exacte</span>
          </div>

          {/* Zone filter */}
          <div style={{
            padding: "8px 12px", borderRadius: 10,
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              Focus sur une salle
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {(() => {
                const zones = [
                  { key: "all", label: "Tout" },
                  ...(floor === "rdc"
                    ? [
                        { key: "restaurant", label: "Restaurant" },
                        { key: "terrasse", label: "Terrasse" },
                        { key: "terrasse_couverte", label: "Non-fumeur" },
                      ]
                    : [
                        { key: "bar", label: "Bar" },
                      ]),
                ];
                return zones.map((z) => (
                  <button
                    key={z.key}
                    onClick={() => setFocusZone(z.key)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                      fontSize: 11, fontWeight: 500,
                      background: focusZone === z.key ? "var(--gradient-primary)" : "var(--secondary-bg)",
                      color: focusZone === z.key ? "#fff" : "var(--text-secondary)",
                      transition: "all 0.15s",
                    }}
                  >{z.label}</button>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Floor switcher + count */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ display: "flex", gap: 4, background: "var(--secondary-bg)", borderRadius: 10, padding: 3, flex: 1 }}>
          {([
            { key: "rdc" as Floor, label: "Rez-de-chaussée" },
            { key: "r1" as Floor, label: "Sous-sol" },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => { setFloor(f.key); setSelected(null); setImgFailed(false); reset(); }}
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

      {/* Plan */}
      <div className="card-light" style={{ padding: 6, overflow: "hidden", position: "relative" }}>
        {imgFailed ? (
          <div style={{
            padding: "40px 24px", textAlign: "center",
            background: "var(--secondary-bg)", borderRadius: 10,
            fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Plans à ajouter
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 11, background: "var(--card-bg)", padding: "8px 12px", borderRadius: 6, margin: "8px auto", display: "inline-block" }}>
              public/plans/plan-table-R-0.jpg
              <br />
              public/plans/plan-table-R-1.jpg
            </div>
          </div>
        ) : (
          <>
            <div
              ref={planAreaRef}
              style={{
                position: "relative", borderRadius: 10, overflow: "hidden",
                touchAction: zoom > 1 && !editMode ? "pan-x pan-y" : "auto",
                cursor: editMode ? "default" : zoom > 1 ? (dragRef.current ? "grabbing" : "grab") : "default",
              }}
              onMouseDown={(e) => onPanStart(e.clientX, e.clientY)}
              onMouseMove={(e) => onPanMove(e.clientX, e.clientY)}
              onMouseUp={onPanEnd}
              onMouseLeave={onPanEnd}
              onTouchStart={(e) => onPanStart(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchMove={(e) => onPanMove(e.touches[0].clientX, e.touches[0].clientY)}
              onTouchEnd={onPanEnd}
            >
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  transform: editMode ? "none" : `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                  transformOrigin: "0 0",
                  transition: dragRef.current ? "none" : "transform 0.2s ease",
                }}
              >
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

                {/* Marqueurs */}
                {markers.map((m) => {
                  const status = getStatus(m.id);
                  const isSel = selected === m.id;
                  const isDragging = draggingId === m.id;

                  // Zone filter in edit mode: dim markers not in focused zone
                  const dbTable = tables.find((t) => t.id === m.id);
                  const isInFocusedZone = focusZone === "all" || dbTable?.zone === focusZone;
                  const dimmed = editMode && !isInFocusedZone;

                  const fill =
                    status === "arrive" ? "#8B5A40"
                    : status === "attendu" ? "#D4A04A"
                    : editMode ? "rgba(196,120,90,0.9)" : "#FFFFFF";
                  const stroke =
                    editMode ? "#6B4A30"
                    : isSel ? "#C4785A"
                    : status === "arrive" ? "#6B4A30"
                    : status === "attendu" ? "#B88835"
                    : "#2C2520";
                  const textColor = editMode || status !== "free" ? "#FFFFFF" : "#1C1815";
                  const dotSize = isSel || isDragging ? 30 : 22;

                  return (
                    <button
                      key={m.id}
                      onClick={(e) => {
                        if (editMode) return;
                        e.stopPropagation();
                        const next = isSel ? null : m.id;
                        setSelected(next);
                        if (next) onTableClick?.(next);
                      }}
                      onMouseDown={(e) => {
                        if (!editMode) return;
                        e.stopPropagation();
                        e.preventDefault();
                        setDraggingId(m.id);
                      }}
                      onTouchStart={(e) => {
                        if (!editMode) return;
                        e.stopPropagation();
                        setDraggingId(m.id);
                      }}
                      style={{
                        position: "absolute",
                        left: `${m.x}%`,
                        top: `${m.y}%`,
                        transform: "translate(-50%, -50%)",
                        width: 44, height: 44,
                        padding: 0, border: "none", background: "transparent",
                        cursor: dimmed ? "default" : editMode ? "move" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: isSel || isDragging ? 10 : 1,
                        touchAction: editMode && !dimmed ? "none" : undefined,
                        opacity: dimmed ? 0.25 : 1,
                        pointerEvents: dimmed ? "none" : "auto",
                        transition: "opacity 0.2s ease",
                      }}
                    >
                      <span style={{
                        width: dotSize, height: dotSize,
                        borderRadius: "50%",
                        background: fill,
                        border: `${isSel || isDragging ? 3 : 1.5}px solid ${stroke}`,
                        color: textColor,
                        fontSize: isSel || isDragging ? 11 : 9,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: isSel || isDragging
                          ? "0 0 0 4px rgba(196,120,90,0.3), 0 4px 12px rgba(0,0,0,0.3)"
                          : "0 1px 3px rgba(0,0,0,0.3)",
                        transition: isDragging ? "none" : "all 0.15s ease",
                      }}>
                        {m.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Top-right controls */}
            <div style={{
              position: "absolute", top: 14, right: 14,
              display: "flex", flexDirection: "column", gap: 4,
              background: "var(--card-bg)",
              borderRadius: 10,
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-medium)",
              overflow: "hidden",
            }}>
              {editable && (
                <>
                  <button
                    onClick={() => { setEditMode(!editMode); setSelected(null); }}
                    style={{
                      width: 34, height: 34, border: "none", cursor: "pointer",
                      background: editMode ? "var(--terra-medium)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      borderBottom: "1px solid var(--border-color)",
                    }}
                    title={editMode ? "Valider positions" : "Éditer positions"}
                  >
                    {editMode ? <Check size={16} style={{ color: "#fff" }} /> : <Move size={16} style={{ color: "var(--text-secondary)" }} />}
                  </button>
                  {editMode && (
                    <button
                      onClick={resetPositions}
                      style={{
                        width: 34, height: 34, border: "none", cursor: "pointer",
                        background: "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderBottom: "1px solid var(--border-color)",
                      }}
                      title="Réinitialiser"
                    >
                      <RotateCcw size={15} style={{ color: "var(--text-secondary)" }} />
                    </button>
                  )}
                </>
              )}
              {!editMode && (
                <>
                  <button
                    onClick={zoomIn}
                    disabled={zoom >= 3}
                    style={{
                      width: 34, height: 34, border: "none", cursor: "pointer",
                      background: "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: zoom >= 3 ? 0.3 : 1,
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    <ZoomIn size={16} style={{ color: "var(--text-secondary)" }} />
                  </button>
                  <button
                    onClick={zoomOut}
                    disabled={zoom <= 1}
                    style={{
                      width: 34, height: 34, border: "none", cursor: "pointer",
                      background: "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: zoom <= 1 ? 0.3 : 1,
                    }}
                  >
                    <ZoomOut size={16} style={{ color: "var(--text-secondary)" }} />
                  </button>
                  {zoom > 1 && (
                    <button
                      onClick={reset}
                      style={{
                        width: 34, height: 34, border: "none", cursor: "pointer",
                        background: "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        borderTop: "1px solid var(--border-color)",
                      }}
                    >
                      <Maximize2 size={14} style={{ color: "var(--text-secondary)" }} />
                    </button>
                  )}
                </>
              )}
            </div>

            {zoom > 1 && !editMode && (
              <div style={{
                position: "absolute", top: 14, left: 14,
                background: "var(--card-bg)",
                padding: "4px 10px", borderRadius: 8,
                fontSize: 11, fontWeight: 600, color: "var(--text-secondary)",
                border: "1px solid var(--border-color)",
                boxShadow: "var(--shadow-light)",
              }}>
                {Math.round(zoom * 100)}%
              </div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div style={{
        display: "flex", gap: 14, fontSize: 11, color: "var(--text-secondary)",
        padding: "9px 14px", borderRadius: 10,
        background: "var(--secondary-bg)",
        justifyContent: "center", flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 11, height: 11, borderRadius: "50%", border: "1.5px solid #2C2520", background: "#FFFFFF" }} />
          Libre
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#D4A04A" }} />
          Réservée
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 11, height: 11, borderRadius: "50%", background: "#8B5A40" }} />
          Arrivée
        </div>
      </div>

      {/* Selected table detail */}
      {selected && selectedTable && !editMode && (
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
