"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { motion } from "motion/react";

interface TaskCardProps {
  id: string;
  title: string;
  zone?: string;
  description?: string | null;
  completed: boolean;
  compact?: boolean;
  onToggle: (id: string, completed: boolean) => void;
}

export default function TaskCard({
  id,
  title,
  zone,
  description,
  completed,
  compact = false,
  onToggle,
}: TaskCardProps) {
  const [checked, setChecked] = useState(completed);

  function handleToggle() {
    const next = !checked;
    setChecked(next);
    onToggle(id, next);
  }

  if (compact && checked) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 opacity-50">
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Check size={14} color="var(--color-success)" strokeWidth={2.5} />
        </div>
        <span className="text-sm text-muted-foreground line-through">{title}</span>
      </div>
    );
  }

  return (
    <div className="glass-card p-3">
      <div className="flex items-start gap-3">
        <motion.button
          whileTap={{ scale: 0.85 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
          onClick={handleToggle}
          className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 transition-all"
          style={
            checked
              ? {
                  background: "var(--gradient-primary)",
                  borderColor: "transparent",
                }
              : {
                  background: "transparent",
                  borderColor: "var(--border-color)",
                }
          }
          aria-label={checked ? "Marquer non fait" : "Marquer fait"}
        >
          {checked && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Check size={22} color="var(--color-success)" strokeWidth={2.5} />
            </motion.div>
          )}
        </motion.button>

        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${
              checked ? "line-through text-muted-foreground" : ""
            }`}
          >
            {title}
          </p>
          {description && !checked && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
          {zone && !checked && (
            <span className="pill mt-1 inline-block text-[10px]">{zone}</span>
          )}
        </div>
      </div>
    </div>
  );
}
