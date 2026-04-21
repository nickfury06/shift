"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Pencil, Check } from "lucide-react";

interface AdminModeContextValue {
  enabled: boolean;
  toggle: () => void;
  canUse: boolean; // true only if patron
}

const AdminModeContext = createContext<AdminModeContextValue>({
  enabled: false,
  toggle: () => {},
  canUse: false,
});

export function useAdminMode() { return useContext(AdminModeContext); }

export default function AdminModeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const canUse = profile?.role === "patron";
  const [enabled, setEnabled] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (!canUse) { setEnabled(false); return; }
    try {
      const v = localStorage.getItem("shift-admin-mode");
      if (v === "true") setEnabled(true);
    } catch {}
  }, [canUse]);

  function toggle() {
    if (!canUse) return;
    setEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem("shift-admin-mode", String(next)); } catch {}
      return next;
    });
  }

  return (
    <AdminModeContext.Provider value={{ enabled: enabled && canUse, toggle, canUse }}>
      {children}
      {/* Floating admin toggle button — top-right, patron only */}
      {canUse && (
        <button
          onClick={toggle}
          aria-label={enabled ? "Désactiver mode admin" : "Activer mode admin"}
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 14px)",
            right: 14,
            zIndex: 150,
            width: 40, height: 40,
            borderRadius: 14,
            border: "none",
            cursor: "pointer",
            background: enabled ? "var(--gradient-primary)" : "var(--card-bg)",
            boxShadow: enabled
              ? "0 4px 14px rgba(196,120,90,0.4), 0 0 0 2px rgba(196,120,90,0.2)"
              : "0 2px 8px rgba(0,0,0,0.08), 0 0 0 1px var(--border-color)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s ease",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          {enabled ? (
            <Check size={18} strokeWidth={2.5} style={{ color: "#fff" }} />
          ) : (
            <Pencil size={16} strokeWidth={2} style={{ color: "var(--text-secondary)" }} />
          )}
        </button>
      )}

      {/* Subtle pill indicator under the icon when active */}
      {enabled && canUse && (
        <div style={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top, 0px) + 60px)",
          right: 14,
          zIndex: 149,
          padding: "3px 10px",
          borderRadius: 999,
          background: "var(--terra-medium)",
          color: "#fff",
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          boxShadow: "0 2px 6px rgba(196,120,90,0.3)",
          pointerEvents: "none",
          animation: "fadeInUp 0.2s ease-out",
        }}>
          Admin
        </div>
      )}
    </AdminModeContext.Provider>
  );
}
