"use client";

import { useState } from "react";
import { motion } from "motion/react";
import type { Task, OneOffTask, Moment } from "@/lib/types";
import { MOMENT_LABELS, ANIMATIONS } from "@/lib/constants";
import TaskCard from "@/components/TaskCard";
import { Lock, ChevronDown } from "lucide-react";

interface MomentSectionProps {
  moment: Moment;
  tasks: (Task | OneOffTask)[];
  completedTaskIds: Set<string>;
  onToggle: (taskId: string, moment: Moment) => void;
  locked?: boolean;
  lockedMessage?: string;
}

export default function MomentSection({
  moment,
  tasks,
  completedTaskIds,
  onToggle,
  locked = false,
  lockedMessage,
}: MomentSectionProps) {
  const [showCompleted, setShowCompleted] = useState(false);

  const checkableTasks = tasks.filter((t) => !t.is_reminder);
  const doneCount = checkableTasks.filter((t) => completedTaskIds.has(t.id)).length;
  const totalCount = checkableTasks.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const allDone = pct === 100 && totalCount > 0;

  // Separate active vs completed tasks
  const activeTasks = tasks.filter((t) => !completedTaskIds.has(t.id));
  const completedTasks = tasks.filter((t) => completedTaskIds.has(t.id));

  if (tasks.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">{MOMENT_LABELS[moment]}</h2>
          {locked && <Lock size={13} strokeWidth={1.5} className="text-muted-foreground/50" />}
        </div>
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{
            background: allDone ? "rgba(123, 163, 122, 0.15)" : "rgba(255, 240, 220, 0.04)",
            color: allDone ? "var(--color-success)" : "var(--color-muted-foreground)",
          }}
        >
          {doneCount}/{totalCount}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1 rounded-full mb-4 overflow-hidden" style={{ background: "rgba(255, 240, 220, 0.06)" }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{ background: allDone ? "var(--color-success)" : "var(--gradient-primary)" }}
        />
      </div>

      {/* Locked message */}
      {locked && (
        <div className="glass-card p-4 flex items-center gap-3 opacity-50">
          <Lock size={16} strokeWidth={1.5} className="text-muted-foreground flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            {lockedMessage || "Complète les tâches précédentes pour débloquer"}
          </p>
        </div>
      )}

      {/* Active tasks (uncompleted first) */}
      {!locked && (
        <div className="space-y-2">
          {activeTasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * ANIMATIONS.staggerDelay }}
            >
              <TaskCard
                task={task}
                completed={false}
                onToggle={() => onToggle(task.id, moment)}
              />
            </motion.div>
          ))}

          {/* Completed tasks — collapsed */}
          {completedTasks.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors w-full py-2"
              >
                <div className="flex-1 h-px" style={{ background: "rgba(255, 240, 220, 0.06)" }} />
                <span className="flex items-center gap-1">
                  {completedTasks.length} complétée{completedTasks.length > 1 ? "s" : ""}
                  <ChevronDown
                    size={12}
                    className="transition-transform duration-200"
                    style={{ transform: showCompleted ? "rotate(180deg)" : "rotate(0)" }}
                  />
                </span>
                <div className="flex-1 h-px" style={{ background: "rgba(255, 240, 220, 0.06)" }} />
              </button>

              {showCompleted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-1 mt-1"
                >
                  {completedTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      completed={true}
                      onToggle={() => onToggle(task.id, moment)}
                      compact
                    />
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
