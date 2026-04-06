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
  const fontSize = size === "large" ? 16 : 14;
  const fontWeight = size === "large" ? 600 : 500;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {[1, 2, 3, 4, 5].map((score) => {
        const selected = value === score;
        return (
          <motion.button
            key={score}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(score)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              transition: "background 150ms, color 150ms",
              width: dimension,
              height: dimension,
              fontSize,
              fontWeight,
              background: selected ? "#8B5A40" : "var(--secondary-bg)",
              color: selected ? "#FFFFFF" : "var(--text-secondary)",
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
