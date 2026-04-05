"use client";

import { motion } from "motion/react";
import type { Task, OneOffTask, Moment } from "@/lib/types";
import { MOMENT_LABELS, ANIMATIONS } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import TaskCard from "@/components/TaskCard";
import { Lock } from "lucide-react";

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
  const checkableTasks = tasks.filter((t) => !t.is_reminder);
  const doneCount = checkableTasks.filter((t) => completedTaskIds.has(t.id)).length;
  const totalCount = checkableTasks.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const allDone = pct === 100 && totalCount > 0;

  if (tasks.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">{MOMENT_LABELS[moment]}</h2>
          {locked && <Lock size={14} className="text-muted-foreground" />}
        </div>
        <span
          className="text-sm font-medium"
          style={{ color: allDone ? "var(--success)" : "var(--muted-foreground)" }}
        >
          {doneCount}/{totalCount}
        </span>
      </div>

      <Progress
        value={pct}
        className="h-1.5 mb-3"
        style={{
          // @ts-expect-error CSS custom property for progress indicator color
          "--progress-color": allDone ? "var(--success)" : "var(--primary)",
        }}
      />

      {locked && (
        <p className="text-xs text-muted-foreground mb-3">
          {lockedMessage || "Complète les tâches d'ouverture pour débloquer"}
        </p>
      )}

      <div className="space-y-2">
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * ANIMATIONS.staggerDelay }}
          >
            <TaskCard
              task={task}
              completed={completedTaskIds.has(task.id)}
              onToggle={() => onToggle(task.id, moment)}
              disabled={locked}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
