"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/AuthProvider";

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
      {/* Floating indicator when admin mode is on */}
      {enabled && canUse && (
        <div style={{
          position: "fixed",
          top: "env(safe-area-inset-top, 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 150,
          padding: "4px 12px",
          borderRadius: 999,
          background: "var(--terra-medium)",
          color: "#fff",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          boxShadow: "0 2px 8px rgba(196,120,90,0.4)",
          pointerEvents: "none",
        }}>
          ✏ Mode Admin
        </div>
      )}
    </AdminModeContext.Provider>
  );
}
