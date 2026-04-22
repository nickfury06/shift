"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { haptic } from "@/lib/haptics";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: async () => false,
});

export function useConfirm() { return useContext(ConfirmContext); }

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

export default function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function handleClose(result: boolean) {
    if (result) haptic(pending?.variant === "danger" ? "warning" : "medium");
    if (pending) pending.resolve(result);
    setPending(null);
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          onClick={() => handleClose(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 300,
            background: "rgba(0,0,0,0.45)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card-medium"
            style={{
              width: "100%", maxWidth: 380,
              padding: 24, borderRadius: 20,
              animation: "scaleIn 0.2s ease-out",
              boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: pending.variant === "danger" ? "rgba(192,122,122,0.12)" : "rgba(196,120,90,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                <AlertTriangle size={20} style={{ color: pending.variant === "danger" ? "var(--danger)" : "var(--terra-medium)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                  {pending.title}
                </div>
                {pending.message && (
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
                    {pending.message}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button
                onClick={() => handleClose(false)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer",
                  background: "var(--secondary-bg)", color: "var(--text-secondary)",
                  fontSize: 14, fontWeight: 500,
                }}
              >
                {pending.cancelLabel || "Annuler"}
              </button>
              <button
                onClick={() => handleClose(true)}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 12, border: "none", cursor: "pointer",
                  background: pending.variant === "danger" ? "var(--danger)" : "var(--gradient-primary)",
                  color: "#fff",
                  fontSize: 14, fontWeight: 600,
                }}
              >
                {pending.confirmLabel || "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
