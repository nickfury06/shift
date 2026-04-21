"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  BookOpen,
  Package,
  MoreHorizontal,
  X,
  User,
  LogOut,
  Shield,
  Calendar,
  PenLine,
  HelpCircle,
  Settings as SettingsIcon,
  MessageCircle,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function Nav() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [pendingAbsences, setPendingAbsences] = useState(0);
  const [pendingFnF, setPendingFnF] = useState(0);
  const supabase = useRef(createClient()).current;
  const role = profile?.role;

  useEffect(() => {
    if (role !== "patron") return;

    async function fetchCounts() {
      const [abs, fnf] = await Promise.all([
        supabase.from("availability_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("fnf_status", "pending"),
      ]);
      setPendingAbsences(abs.count || 0);
      setPendingFnF(fnf.count || 0);
    }
    fetchCounts();

    const ch = supabase.channel("nav-badges")
      .on("postgres_changes", { event: "*", schema: "public", table: "availability_requests" }, fetchCounts)
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, fetchCounts)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [role, supabase]);

  if (!role) return null;

  const iconSize = 20;
  const strokeWidth = 1.5;

  // ── Main tabs by role ─────────────────────────────────────
  function getMainItems(): NavItem[] {
    if (role === "staff") {
      // Extras get a simplified nav focused on their shift: Accueil, Résas (with floor plan), Debrief
      if (profile?.employment_type === "extra") {
        return [
          { href: "/accueil", label: "Accueil", icon: <Home size={iconSize} strokeWidth={strokeWidth} /> },
          { href: "/reservations", label: "Résas", icon: <BookOpen size={iconSize} strokeWidth={strokeWidth} /> },
          { href: "/debrief", label: "Debrief", icon: <PenLine size={iconSize} strokeWidth={strokeWidth} /> },
        ];
      }
      return [
        { href: "/accueil", label: "Accueil", icon: <Home size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/planning", label: "Planning", icon: <Calendar size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/reservations", label: "Résas", icon: <BookOpen size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/debrief", label: "Debrief", icon: <PenLine size={iconSize} strokeWidth={strokeWidth} /> },
      ];
    }
    if (role === "responsable") {
      return [
        { href: "/accueil", label: "Accueil", icon: <Home size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/planning", label: "Planning", icon: <Calendar size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/stocks", label: "Stocks", icon: <Package size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/reservations", label: "Résas", icon: <BookOpen size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/debrief", label: "Debrief", icon: <PenLine size={iconSize} strokeWidth={strokeWidth} /> },
      ];
    }
    // patron main
    return [
      { href: "/accueil", label: "Accueil", icon: <Home size={iconSize} strokeWidth={strokeWidth} /> },
      { href: "/reservations", label: "Résas", icon: <BookOpen size={iconSize} strokeWidth={strokeWidth} />, badge: pendingFnF },
      { href: "/admin", label: "Admin", icon: <Shield size={iconSize} strokeWidth={strokeWidth} />, badge: pendingAbsences },
    ];
  }

  // ── "More" menu — guide + profile for everyone, extras for patron ───────────────
  const moreItems: NavItem[] = [
    { href: "/messages", label: "Messages équipe", icon: <MessageCircle size={iconSize} strokeWidth={strokeWidth} /> },
    { href: "/guide", label: "Guide du lieu", icon: <HelpCircle size={iconSize} strokeWidth={strokeWidth} /> },
    { href: "/profile", label: "Mon profil", icon: <User size={iconSize} strokeWidth={strokeWidth} /> },
    ...(role === "patron"
      ? [{ href: "/settings", label: "Réglages", icon: <SettingsIcon size={iconSize} strokeWidth={strokeWidth} /> }]
      : []),
  ];

  const mainItems = getMainItems();
  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Overlay */}
      {moreOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(0,0,0,0.2)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu panel */}
      {moreOpen && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: 0,
            right: 0,
            zIndex: 50,
            padding: "0 16px 8px",
          }}
        >
          <div style={{ maxWidth: 512, margin: "0 auto" }}>
            <div
              style={{
                background: "var(--nav-bg)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid rgba(0,0,0,0.06)",
                borderRadius: 20,
                boxShadow: "0 -2px 20px rgba(0,0,0,0.04)",
                padding: 16,
              }}
            >
              <div className="stagger">
                {moreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      borderRadius: 12,
                      padding: "10px 12px",
                      fontSize: 14,
                      fontWeight: 500,
                      color: isActive(item.href)
                        ? "var(--terra-medium)"
                        : "var(--text-secondary)",
                      textDecoration: "none",
                      transition: "color 0.2s ease",
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                ))}

                {/* Disconnect */}
                <button
                  onClick={() => {
                    setMoreOpen(false);
                    signOut();
                  }}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    gap: 12,
                    borderRadius: 12,
                    padding: "10px 12px",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--danger)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={iconSize} strokeWidth={strokeWidth} />
                  Déconnexion
                </button>

                {/* Theme toggle */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    borderRadius: 12,
                    padding: "10px 12px",
                  }}
                >
                  <ThemeToggle />
                  <span
                    style={{
                      fontSize: 14,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Thème
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav
        style={{
          position: "fixed",
          bottom: 12,
          left: 20,
          right: 20,
          zIndex: 40,
          maxWidth: 512,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            height: 56,
            borderRadius: 20,
            background: "var(--nav-bg)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--card-border)",
            boxShadow: "0 -2px 20px rgba(0,0,0,0.04)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: "0 8px",
          }}
        >
          {mainItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  padding: "6px 12px",
                  color: active
                    ? "var(--terra-medium)"
                    : "var(--text-tertiary)",
                  textDecoration: "none",
                  WebkitTapHighlightColor: "transparent",
                  filter: active
                    ? "drop-shadow(0 0 8px rgba(196,120,90,0.3))"
                    : "none",
                  transition: "all 0.2s ease",
                  position: "relative",
                }}
              >
                <div style={{ position: "relative" }}>
                  {item.icon}
                  {item.badge && item.badge > 0 ? (
                    <span style={{
                      position: "absolute", top: -4, right: -8,
                      minWidth: 16, height: 16, borderRadius: 8,
                      background: "var(--warning)",
                      color: "#fff",
                      fontSize: 10, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 4px",
                      boxShadow: "0 0 0 2px var(--nav-bg)",
                    }}>{item.badge}</span>
                  ) : null}
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 500,
                    color: active
                      ? "var(--terra-medium)"
                      : "var(--text-tertiary)",
                  }}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* "More" button for all roles */}
          {(
            <button
              onClick={() => setMoreOpen((v) => !v)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                padding: "6px 12px",
                color: moreOpen
                  ? "var(--terra-medium)"
                  : "var(--text-tertiary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
                filter: moreOpen
                  ? "drop-shadow(0 0 8px rgba(196,120,90,0.3))"
                  : "none",
                transition: "all 0.2s ease",
              }}
            >
              {moreOpen ? (
                <X size={iconSize} strokeWidth={strokeWidth} />
              ) : (
                <MoreHorizontal size={iconSize} strokeWidth={strokeWidth} />
              )}
              <span style={{ fontSize: 10, fontWeight: 500 }}>Plus</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
