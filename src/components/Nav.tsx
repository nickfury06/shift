"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Calendar,
  BookOpen,
  PenLine,
  LayoutDashboard,
  Package,
  MoreHorizontal,
  X,
  MessageCircle,
  ClipboardList,
  Users,
  ListChecks,
  LogOut,
  Shield,
} from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useAuth } from "@/components/AuthProvider";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

export default function Nav() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const role = profile?.role;

  if (!role) return null;

  const iconSize = 20;
  const strokeWidth = 1.5;

  // ── Main tabs by role ─────────────────────────────────────
  function getMainItems(): NavItem[] {
    if (role === "staff") {
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
      { href: "/dashboard", label: "Vue", icon: <LayoutDashboard size={iconSize} strokeWidth={strokeWidth} /> },
      { href: "/accueil", label: "Accueil", icon: <Home size={iconSize} strokeWidth={strokeWidth} /> },
      { href: "/reservations", label: "Résas", icon: <BookOpen size={iconSize} strokeWidth={strokeWidth} /> },
      { href: "/admin", label: "Admin", icon: <Shield size={iconSize} strokeWidth={strokeWidth} /> },
    ];
  }

  // ── "More" menu — all roles just get theme + logout ────────
  const moreItems: NavItem[] = [];

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
                }}
              >
                {item.icon}
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
