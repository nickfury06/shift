"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sun,
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
        { href: "/tonight", label: "Ce soir", icon: <Sun size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/planning", label: "Planning", icon: <Calendar size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/reservations", label: "Resas", icon: <BookOpen size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/debrief", label: "Debrief", icon: <PenLine size={iconSize} strokeWidth={strokeWidth} /> },
      ];
    }
    if (role === "responsable") {
      return [
        { href: "/tonight", label: "Ce soir", icon: <Sun size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/planning", label: "Planning", icon: <Calendar size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/stocks", label: "Stocks", icon: <Package size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/reservations", label: "Resas", icon: <BookOpen size={iconSize} strokeWidth={strokeWidth} /> },
        { href: "/debrief", label: "Debrief", icon: <PenLine size={iconSize} strokeWidth={strokeWidth} /> },
      ];
    }
    // patron main
    return [
      { href: "/dashboard", label: "Board", icon: <LayoutDashboard size={iconSize} strokeWidth={strokeWidth} /> },
      { href: "/tonight", label: "Ce soir", icon: <Sun size={iconSize} strokeWidth={strokeWidth} /> },
      { href: "/reservations", label: "Resas", icon: <BookOpen size={iconSize} strokeWidth={strokeWidth} /> },
      { href: "/stocks", label: "Stocks", icon: <Package size={iconSize} strokeWidth={strokeWidth} /> },
    ];
  }

  // ── Patron "More" menu items ──────────────────────────────
  const moreItems: NavItem[] = [
    { href: "/messages", label: "Messages", icon: <MessageCircle size={iconSize} strokeWidth={strokeWidth} /> },
    { href: "/debrief", label: "Debriefs", icon: <PenLine size={iconSize} strokeWidth={strokeWidth} /> },
    { href: "/planning", label: "Planning", icon: <Calendar size={iconSize} strokeWidth={strokeWidth} /> },
    { href: "/tasks", label: "Taches", icon: <ListChecks size={iconSize} strokeWidth={strokeWidth} /> },
    { href: "/staff", label: "Equipe", icon: <Users size={iconSize} strokeWidth={strokeWidth} /> },
    { href: "/settings", label: "Reglages", icon: <ClipboardList size={iconSize} strokeWidth={strokeWidth} /> },
  ];

  const mainItems = getMainItems();
  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Overlay */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* More menu panel */}
      {moreOpen && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4 pb-2">
          <div className="mx-auto max-w-lg">
            <div className="glass-card p-4">
              <div className="space-y-1 stagger-children">
                {moreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
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
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-secondary"
                >
                  <LogOut size={iconSize} strokeWidth={strokeWidth} />
                  Deconnexion
                </button>

                {/* Theme toggle */}
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                  <ThemeToggle />
                  <span className="text-sm text-muted-foreground">Theme</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-lg px-4 pb-3">
          <div className="flex items-center justify-around py-1.5 shadow-2xl glass-card">
            {mainItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                  style={
                    active
                      ? { filter: "drop-shadow(0 0 6px var(--color-primary))" }
                      : undefined
                  }
                >
                  {item.icon}
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}

            {/* "More" button for patron */}
            {role === "patron" && (
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                  moreOpen ? "text-primary" : "text-muted-foreground"
                }`}
                style={
                  moreOpen
                    ? { filter: "drop-shadow(0 0 6px var(--color-primary))" }
                    : undefined
                }
              >
                {moreOpen ? (
                  <X size={iconSize} strokeWidth={strokeWidth} />
                ) : (
                  <MoreHorizontal size={iconSize} strokeWidth={strokeWidth} />
                )}
                <span className="text-[10px] font-medium">Plus</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
