"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, BookOpen, Package, User, LogOut, Shield, Calendar, PenLine,
  HelpCircle, Settings as SettingsIcon, MessageCircle, Sun, Moon, ListChecks,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

/**
 * DesktopNav — left sidebar for the app shell on screens ≥ 900px.
 * Hidden on mobile via CSS (see globals.css).
 * Duplicates role-based items from Nav.tsx; kept simple until the
 * definitions earn extraction into a shared module.
 */
export default function DesktopNav() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const [pendingAbsences, setPendingAbsences] = useState(0);
  const [pendingFnF, setPendingFnF] = useState(0);
  const [dark, setDark] = useState(false);
  const supabase = useRef(createClient()).current;
  const role = profile?.role;

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("shift-theme", next ? "dark" : "light");
  }

  useEffect(() => {
    const canSeeFnFBadge = role === "patron" || role === "responsable";
    if (role !== "patron" && !canSeeFnFBadge) return;

    async function fetchCounts() {
      const [abs, fnf] = await Promise.all([
        role === "patron"
          ? supabase.from("availability_requests").select("id", { count: "exact", head: true }).eq("status", "pending")
          : Promise.resolve({ count: 0 }),
        canSeeFnFBadge
          ? supabase.from("reservations").select("id", { count: "exact", head: true }).eq("fnf_status", "pending")
          : Promise.resolve({ count: 0 }),
      ]);
      setPendingAbsences(abs.count || 0);
      setPendingFnF(fnf.count || 0);
    }
    fetchCounts();

    const ch = supabase.channel("desktop-nav-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_requests" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, fetchCounts)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [role, supabase]);

  if (!role) return null;

  const ICON = 18;

  // Main items
  let mainItems: NavItem[];
  if (role === "staff" && profile?.employment_type === "extra") {
    mainItems = [
      { href: "/accueil", label: "Accueil", icon: <Home size={ICON} /> },
      { href: "/reservations", label: "Réservations", icon: <BookOpen size={ICON} /> },
      { href: "/debrief", label: "Debrief", icon: <PenLine size={ICON} /> },
    ];
  } else if (role === "staff") {
    mainItems = [
      { href: "/accueil", label: "Accueil", icon: <Home size={ICON} /> },
      { href: "/planning", label: "Planning", icon: <Calendar size={ICON} /> },
      { href: "/reservations", label: "Réservations", icon: <BookOpen size={ICON} /> },
      { href: "/debrief", label: "Debrief", icon: <PenLine size={ICON} /> },
    ];
  } else if (role === "responsable") {
    mainItems = [
      { href: "/accueil", label: "Accueil", icon: <Home size={ICON} /> },
      { href: "/planning", label: "Planning", icon: <Calendar size={ICON} /> },
      { href: "/stocks", label: "Stocks", icon: <Package size={ICON} /> },
      { href: "/reservations", label: "Réservations", icon: <BookOpen size={ICON} />, badge: pendingFnF },
      { href: "/debrief", label: "Debrief", icon: <PenLine size={ICON} /> },
    ];
  } else {
    mainItems = [
      { href: "/accueil", label: "Accueil", icon: <Home size={ICON} /> },
      { href: "/reservations", label: "Réservations", icon: <BookOpen size={ICON} />, badge: pendingFnF },
      { href: "/admin", label: "Admin", icon: <Shield size={ICON} />, badge: pendingAbsences },
    ];
  }

  const isPermanentStaff = role === "staff" && profile?.employment_type !== "extra";
  const secondaryItems: NavItem[] = [
    { href: "/messages", label: "Messages équipe", icon: <MessageCircle size={ICON} /> },
    ...(role === "responsable" ? [{ href: "/tasks", label: "Tâches équipe", icon: <ListChecks size={ICON} /> }] : []),
    ...(isPermanentStaff ? [{ href: "/stocks", label: "Stocks (consulter)", icon: <Package size={ICON} /> }] : []),
    { href: "/guide", label: "Guide du lieu", icon: <HelpCircle size={ICON} /> },
    { href: "/profile", label: "Mon profil", icon: <User size={ICON} /> },
    ...(role === "patron" ? [{ href: "/settings", label: "Réglages", icon: <SettingsIcon size={ICON} /> }] : []),
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <aside className="desktop-nav">
      <div className="desktop-nav-inner">
        {/* Brand */}
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid var(--card-border)" }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
            Shift
          </div>
          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>
            {profile?.name || "—"} · {role === "patron" ? "Patron" : role === "responsable" ? "Responsable" : "Staff"}
          </div>
        </div>

        {/* Main items */}
        <nav style={{ padding: "12px 12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {mainItems.map((item) => (
            <NavRow key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        {/* Divider + secondary items */}
        <div style={{ padding: "4px 20px 8px" }}>
          <div style={{
            fontSize: 10, fontWeight: 600, letterSpacing: "0.08em",
            color: "var(--text-tertiary)", textTransform: "uppercase",
          }}>Plus</div>
        </div>
        <nav style={{ padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {secondaryItems.map((item) => (
            <NavRow key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </nav>

        {/* Footer */}
        <div style={{
          marginTop: "auto",
          padding: "12px 12px 18px",
          borderTop: "1px solid var(--card-border)",
          display: "flex", flexDirection: "column", gap: 4,
        }}>
          <button
            onClick={toggleTheme}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px", borderRadius: 10,
              background: "none", border: "none", cursor: "pointer",
              textAlign: "left", width: "100%",
              fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
            }}
          >
            {dark ? <Sun size={ICON} strokeWidth={1.5} /> : <Moon size={ICON} strokeWidth={1.5} />}
            <span style={{ flex: 1 }}>Thème {dark ? "clair" : "sombre"}</span>
          </button>
          <button
            onClick={signOut}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px", borderRadius: 10,
              background: "none", border: "none", cursor: "pointer",
              textAlign: "left", width: "100%",
              fontSize: 13, fontWeight: 500, color: "var(--danger)",
            }}
          >
            <LogOut size={ICON} />
            Déconnexion
          </button>
        </div>
      </div>
    </aside>
  );
}

function NavRow({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 12px", borderRadius: 10,
        textDecoration: "none",
        color: active ? "var(--terra-medium)" : "var(--text-secondary)",
        background: active ? "rgba(196,120,90,0.08)" : "transparent",
        fontSize: 13, fontWeight: active ? 600 : 500,
        position: "relative",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {item.icon}
      <span style={{ flex: 1, minWidth: 0 }}>{item.label}</span>
      {item.badge && item.badge > 0 ? (
        <span style={{
          minWidth: 18, height: 18, padding: "0 5px",
          borderRadius: 9,
          background: "var(--warning)", color: "#fff",
          fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>{item.badge}</span>
      ) : null}
    </Link>
  );
}
