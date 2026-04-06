"use client";

import { motion } from "motion/react";

interface ScoreSelectorProps {
  value: number | null;
  onChange: (score: number) => void;
  size?: "large" | "small";
}

export default function ScoreSelector({
  value,
  onChange,
  size = "large",
}: ScoreSelectorProps) {
  const dimension = size === "large" ? 48 : 36;
  const textClass = size === "large" ? "text-base font-semibold" : "text-sm font-medium";

  return (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((score) => {
        const selected = value === score;
        return (
          <motion.button
            key={score}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(score)}
            className={`flex items-center justify-center rounded-full transition-colors ${textClass}`}
            style={{
              width: dimension,
              height: dimension,
              background: selected ? "var(--gradient-primary)" : "var(--secondary-bg)",
              color: selected ? "#FFFFFF" : "var(--fg-secondary)",
            }}
            aria-label={`Score ${score}`}
          >
            {score}
          </motion.button>
        );
      })}
    </div>
  );
}
