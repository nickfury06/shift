"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Check, X, AlertTriangle, Info } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

export function useToast() { return useContext(ToastContext); }

const CONFIG: Record<ToastType, { icon: typeof Check; color: string; bg: string; border: string }> = {
  success: { icon: Check, color: "#8B5A40", bg: "rgba(139,90,64,0.1)", border: "#8B5A40" },
  error: { icon: X, color: "#C07A7A", bg: "rgba(192,122,122,0.1)", border: "#C07A7A" },
  warning: { icon: AlertTriangle, color: "#D4A04A", bg: "rgba(212,160,74,0.1)", border: "#D4A04A" },
  info: { icon: Info, color: "#8A857E", bg: "rgba(138,133,126,0.1)", border: "#8A857E" },
};

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const value: ToastContextValue = {
    toast: show,
    success: (m) => show(m, "success"),
    error: (m) => show(m, "error"),
    warning: (m) => show(m, "warning"),
    info: (m) => show(m, "info"),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{
        position: "fixed",
        top: "env(safe-area-inset-top, 16px)",
        left: 0, right: 0, zIndex: 200,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        padding: "8px 16px", pointerEvents: "none",
      }}>
        {toasts.map((t) => {
          const cfg = CONFIG[t.type];
          const Icon = cfg.icon;
          return (
            <div
              key={t.id}
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px", borderRadius: 12,
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                maxWidth: 512, width: "100%",
                fontSize: 13, fontWeight: 500,
                color: "var(--text-primary)",
                pointerEvents: "auto", cursor: "pointer",
                animation: "fadeInUp 0.25s ease-out",
                boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 6,
                background: cfg.color,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={14} strokeWidth={2.5} style={{ color: "#fff" }} />
              </div>
              <span style={{ flex: 1 }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
