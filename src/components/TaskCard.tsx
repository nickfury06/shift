"use client";

import { motion } from "motion/react";
import { Bell } from "lucide-react";
import type { Task, OneOffTask, Zone } from "@/lib/types";
import { ZONE_LABELS, ZONE_COLORS } from "@/lib/constants";

interface TaskCardProps {
  task: Task | OneOffTask;
  completed: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export default function TaskCard({ task, completed, onToggle, disabled }: TaskCardProps) {
  const zoneColor = ZONE_COLORS[task.zone as Zone];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 p-3 rounded-lg bg-card transition-opacity min-h-[44px]"
      style={{ opacity: completed ? 0.5 : disabled ? 0.4 : 1 }}
    >
      {task.is_reminder ? (
        <span className="flex-shrink-0 w-11 h-11 flex items-center justify-center">
          <Bell size={18} className="text-primary" />
        </span>
      ) : (
        <button
          onClick={onToggle}
          disabled={disabled}
          className="flex-shrink-0 w-11 h-11 rounded-lg border-2 flex items-center justify-center transition-colors"
          style={{
            borderColor: completed ? "var(--color-success)" : "var(--color-border)",
            backgroundColor: completed ? "var(--color-success)" : "transparent",
          }}
        >
          {completed && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className="text-sm font-bold"
              style={{ color: "var(--color-background)" }}
            >
              ✓
            </motion.span>
          )}
        </button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm ${completed ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `color-mix(in srgb, ${zoneColor} 20%, transparent)`,
              color: zoneColor,
            }}
          >
            {ZONE_LABELS[task.zone as Zone]}
          </span>
          {task.is_libre && (
            <span className="text-xs px-1.5 py-0.5 rounded border border-dashed border-muted-foreground text-muted-foreground">
              libre
            </span>
          )}
        </div>
        {task.note && (
          <p className="text-xs text-muted-foreground mt-0.5">{task.note}</p>
        )}
      </div>
    </motion.div>
  );
}
