"use client";

import { motion } from "motion/react";
import { Bell, Check } from "lucide-react";
import type { Task, OneOffTask, Zone } from "@/lib/types";
import { ZONE_LABELS, ZONE_COLORS } from "@/lib/constants";

interface TaskCardProps {
  task: Task | OneOffTask;
  completed: boolean;
  onToggle: () => void;
  disabled?: boolean;
  compact?: boolean;
}

export default function TaskCard({ task, completed, onToggle, disabled, compact }: TaskCardProps) {
  const zoneColor = ZONE_COLORS[task.zone as Zone];

  if (compact && completed) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 opacity-40">
        <Check size={12} className="text-primary flex-shrink-0" />
        <span className="text-xs line-through truncate">{task.title}</span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card card-hover flex items-center gap-4 p-4 transition-all"
      style={{ opacity: completed ? 0.45 : disabled ? 0.35 : 1 }}
    >
      {task.is_reminder ? (
        <span className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(123, 163, 122, 0.1)" }}>
          <Bell size={18} strokeWidth={1.5} className="text-primary" />
        </span>
      ) : (
        <motion.button
          onClick={onToggle}
          disabled={disabled}
          whileTap={{ scale: 0.9 }}
          className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all"
          style={{
            background: completed ? "var(--gradient-primary)" : "rgba(255, 240, 220, 0.04)",
            border: completed ? "none" : "1px solid rgba(255, 240, 220, 0.08)",
          }}
        >
          {completed && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Check size={18} strokeWidth={2.5} className="text-primary-foreground" />
            </motion.span>
          )}
        </motion.button>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${completed ? "line-through text-muted-foreground" : ""}`}>
            {task.title}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `color-mix(in srgb, ${zoneColor} 15%, transparent)`,
              color: zoneColor,
            }}
          >
            {ZONE_LABELS[task.zone as Zone]}
          </span>
          {task.is_libre && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground">
              libre
            </span>
          )}
        </div>
        {task.note && !completed && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{task.note}</p>
        )}
      </div>
    </motion.div>
  );
}
