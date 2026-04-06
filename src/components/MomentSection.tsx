"use client";

import { useState } from "react";
import { ChevronDown, Lock, Clock } from "lucide-react";
import TaskCard from "@/components/TaskCard";
import type { Zone } from "@/lib/types";

interface TaskItem {
  id: string;
  title: string;
  zone?: string;
  zoneKey?: Zone;
  description?: string | null;
  completed: boolean;
  isOneOff?: boolean;
}

interface MomentSectionProps {
  name: string;
  tasks: TaskItem[];
  locked?: boolean;
  lockMessage?: string;
  onToggleTask: (id: string, completed: boolean) => void;
}

export default function MomentSection({
  name,
  tasks,
  locked = false,
  lockMessage,
  onToggleTask,
}: MomentSectionProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);
  const total = tasks.length;
  const done = completedTasks.length;
  const progress = total > 0 ? (done / total) * 100 : 0;

  // ── Locked state ──────────────────────────────────────────
  if (locked) {
    return (
      <div>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-tertiary)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Lock
              size={13}
              strokeWidth={1.5}
              style={{ color: "var(--text-tertiary)" }}
            />
            {name}
          </span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--text-tertiary)",
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Clock
            size={12}
            strokeWidth={1.5}
            style={{ color: "var(--text-tertiary)" }}
          />
          {lockMessage || "Section verrouillée"}
        </div>
      </div>
    );
  }

  // ── Active state ──────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-tertiary)",
          }}
        >
          {name}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: "#8B5A40",
            background: "rgba(139,90,64,0.1)",
            padding: "3px 8px",
            borderRadius: 6,
            letterSpacing: 0,
            textTransform: "none",
          }}
        >
          {done}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 4,
          background: "var(--input-bg, #F7F6F2)",
          borderRadius: 2,
          marginBottom: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            borderRadius: 2,
            background: "linear-gradient(90deg, #C4785A, #8B5A40)",
            width: `${progress}%`,
            transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
      </div>

      {/* Active tasks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {activeTasks.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            zone={task.zone}
            zoneKey={task.zoneKey}
            description={task.description}
            completed={false}
            onToggle={onToggleTask}
          />
        ))}
      </div>

      {/* Completed tasks toggle */}
      {completedTasks.length > 0 && (
        <button
          onClick={() => setShowCompleted((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            padding: "10px 14px",
            marginTop: 2,
            background: "transparent",
            border: "1px solid rgba(0,0,0,0.04)",
            borderRadius: 12,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              fontSize: 13,
              color: "var(--text-tertiary)",
              fontWeight: 400,
            }}
          >
            {completedTasks.length} complétée{completedTasks.length > 1 ? "s" : ""}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={1.5}
            style={{
              color: "var(--text-tertiary)",
              transition: "transform 0.2s ease",
              transform: showCompleted ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>
      )}

      {/* Expanded completed tasks */}
      {showCompleted && completedTasks.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4, paddingLeft: 14, paddingRight: 14 }}>
          {completedTasks.map((task) => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              completed={true}
              compact
              onToggle={onToggleTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
