"use client";

import { motion } from "motion/react";

interface ScoreSelectorProps {
  value: number;
  onChange: (score: number) => void;
  size?: "large" | "small";
}

export default function ScoreSelector({ value, onChange, size = "small" }: ScoreSelectorProps) {
  const btnSize = size === "large" ? "w-12 h-12 text-lg" : "w-8 h-8 text-xs";

  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <motion.button
          key={n}
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(n)}
          className={`${btnSize} rounded-full font-bold transition-colors`}
          style={{
            background: value >= n ? "var(--gradient-primary)" : "rgba(255, 240, 220, 0.04)",
            color: value >= n ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
          }}
        >
          {n}
        </motion.button>
      ))}
    </div>
  );
}
