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
            background: value >= n ? "var(--primary)" : "var(--secondary)",
            color: value >= n ? "var(--primary-foreground)" : "var(--muted-foreground)",
          }}
        >
          {n}
        </motion.button>
      ))}
    </div>
  );
}
