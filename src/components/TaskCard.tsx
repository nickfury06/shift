"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { ZONE_COLORS } from "@/lib/constants";
import type { Zone } from "@/lib/types";

interface TaskCardProps {
  id: string;
  title: string;
  zone?: string;
  zoneKey?: Zone;
  description?: string | null;
  completed: boolean;
  compact?: boolean;
  isLibre?: boolean;
  onToggle: (id: string, completed: boolean) => void;
}

export default function TaskCard({
  id,
  title,
  zone,
  zoneKey,
  description,
  completed,
  compact = false,
  isLibre = false,
  onToggle,
}: TaskCardProps) {
  const [checked, setChecked] = useState(completed);

  function handleToggle() {
    const next = !checked;
    setChecked(next);
    onToggle(id, next);
  }

  // Zone color from constants, fallback to tertiary
  const zoneColor = zoneKey ? ZONE_COLORS[zoneKey] : "var(--text-secondary)";

  // ── Compact mode: just a tiny inline row ──────────────────
  if (compact) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "4px 0",
          opacity: checked ? 0.4 : 1,
        }}
      >
        <motion.button
          whileTap={{ scale: 0.92 }}
          transition={{ type: "spring", duration: 0.2 }}
          onClick={handleToggle}
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            border: `2px solid ${checked ? "#8B5A40" : "#DDD8D2"}`,
            background: checked ? "#8B5A40" : "transparent",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            padding: 0,
          }}
          aria-label={checked ? "Marquer non fait" : "Marquer fait"}
        >
          {checked && <Check size={12} color="#fff" strokeWidth={2.5} />}
        </motion.button>
        <span
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: checked ? "var(--text-tertiary)" : "var(--text-primary)",
            textDecoration: checked ? "line-through" : "none",
          }}
        >
          {title}
        </span>
      </div>
    );
  }

  // ── Full card mode ────────────────────────────────────────
  return (
    <div
      className={isLibre ? "" : "card-light"}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "12px 14px",
        ...(isLibre
          ? {
              background: "var(--card-bg)",
              borderRadius: 16,
              border: "1px dashed rgba(0,0,0,0.08)",
              boxShadow: "none",
            }
          : {}),
        opacity: checked ? 0.4 : 1,
        transition: "opacity 0.3s ease",
      }}
    >
      <motion.button
        whileTap={{ scale: 0.92 }}
        transition={{ type: "spring", duration: 0.2 }}
        onClick={handleToggle}
        style={{
          width: 28,
          height: 28,
          borderRadius: 9,
          border: `2px solid ${checked ? "#8B5A40" : "#DDD8D2"}`,
          background: checked ? "#8B5A40" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          marginTop: 1,
          padding: 0,
        }}
        aria-label={checked ? "Marquer non fait" : "Marquer fait"}
      >
        {checked && (
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", duration: 0.3 }}
          >
            <Check size={14} color="#fff" strokeWidth={2.5} />
          </motion.div>
        )}
      </motion.button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: checked ? "var(--text-tertiary)" : "var(--text-primary)",
            lineHeight: 1.4,
            textDecoration: checked ? "line-through" : "none",
            transition: "all 0.3s ease",
          }}
        >
          {title}
        </div>
        {description && !checked && (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 3,
            }}
          >
            {description}
          </div>
        )}
        {zone && !checked && (
          <span
            className="zone-badge"
            style={{
              marginTop: 6,
              background: `${zoneColor}1A`,
              color: zoneColor,
            }}
          >
            {zone}
          </span>
        )}
      </div>
    </div>
  );
}
