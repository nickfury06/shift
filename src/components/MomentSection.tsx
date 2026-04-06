"use client";

import { useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import TaskCard from "@/components/TaskCard";

interface TaskItem {
  id: string;
  title: string;
  zone?: string;
  description?: string | null;
  completed: boolean;
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

  if (locked) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold tracking-tight">{name}</h3>
          <span className="pill">{done}/{total}</span>
        </div>
        <div className="glass-card p-4 flex items-center gap-3 opacity-60">
          <Lock size={18} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {lockMessage || "Section verrouill\u00e9e"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold tracking-tight">{name}</h3>
        <span className="pill">{done}/{total}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: "var(--gradient-primary)",
          }}
        />
      </div>

      {/* Active tasks */}
      <div className="space-y-2 stagger-children">
        {activeTasks.map((task) => (
          <TaskCard
            key={task.id}
            id={task.id}
            title={task.title}
            zone={task.zone}
            description={task.description}
            completed={false}
            onToggle={onToggleTask}
          />
        ))}
      </div>

      {/* Completed tasks toggle */}
      {completedTasks.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground py-1"
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${showCompleted ? "rotate-180" : ""}`}
            />
            {completedTasks.length} complet\u00e9e{completedTasks.length > 1 ? "s" : ""}
          </button>

          {showCompleted && (
            <div className="space-y-1 mt-1">
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
      )}
    </div>
  );
}
