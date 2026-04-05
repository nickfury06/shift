"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { cn } from "@/lib/utils";
import {
  Sun, Calendar, BookOpen, PenLine,
  LayoutDashboard, Package, MoreHorizontal, X,
  MessageCircle, ClipboardList, Users, ListChecks, LogOut,
} from "lucide-react";

interface NavLink {
  href: string;
  label: string;
  icon: ReactNode;
}

const STAFF_LINKS: NavLink[] = [
  { href: "/ce-soir", label: "Ce Soir", icon: <Sun size={20} /> },
  { href: "/planning", label: "Planning", icon: <Calendar size={20} /> },
  { href: "/reservations", label: "Résas", icon: <BookOpen size={20} /> },
  { href: "/debrief", label: "Debrief", icon: <PenLine size={20} /> },
];

const RESPONSABLE_LINKS: NavLink[] = [
  { href: "/ce-soir", label: "Ce Soir", icon: <Sun size={20} /> },
  { href: "/planning", label: "Planning", icon: <Calendar size={20} /> },
  { href: "/stocks", label: "Stocks", icon: <Package size={20} /> },
  { href: "/reservations", label: "Résas", icon: <BookOpen size={20} /> },
  { href: "/debrief", label: "Debrief", icon: <PenLine size={20} /> },
];

const PATRON_MAIN_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
  { href: "/ce-soir", label: "Ce Soir", icon: <Sun size={20} /> },
  { href: "/reservations", label: "Résas", icon: <BookOpen size={20} /> },
  { href: "/stocks", label: "Stocks", icon: <Package size={20} /> },
];

const PATRON_MORE_LINKS: NavLink[] = [
  { href: "/messages", label: "Messages", icon: <MessageCircle size={18} /> },
  { href: "/debriefs", label: "Debriefs", icon: <ClipboardList size={18} /> },
  { href: "/planning", label: "Planning", icon: <Calendar size={18} /> },
  { href: "/tasks", label: "Tâches", icon: <ListChecks size={18} /> },
  { href: "/staff", label: "Staff", icon: <Users size={18} /> },
];

export default function Nav() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);

  if (!profile) return null;

  const isPatron = profile.role === "patron";
  const mainLinks = isPatron
    ? PATRON_MAIN_LINKS
    : profile.role === "responsable"
      ? RESPONSABLE_LINKS
      : STAFF_LINKS;

  const isActiveMore = isPatron && PATRON_MORE_LINKS.some((l) => pathname === l.href);

  return (
    <>
      {/* More menu overlay (patron only) */}
      {showMore && isPatron && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="relative w-full max-w-lg mx-auto mb-20 px-4">
            <div className="rounded-2xl bg-card border border-border/50 p-1.5 shadow-2xl">
              {PATRON_MORE_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => { router.push(link.href); setShowMore(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors",
                    pathname === link.href ? "text-primary bg-primary/10" : "text-foreground hover:bg-secondary"
                  )}
                >
                  <span className={pathname === link.href ? "text-primary" : "text-muted-foreground"}>{link.icon}</span>
                  {link.label}
                </button>
              ))}
              <div className="border-t border-border/50 mt-1 pt-1">
                <button
                  onClick={() => { signOut(); setShowMore(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-destructive hover:bg-secondary transition-colors"
                >
                  <LogOut size={18} />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav — glass morphism style */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-lg px-3 pb-2">
          <div className="flex items-center justify-around rounded-2xl border border-border/30 bg-card/90 backdrop-blur-xl shadow-lg py-1">
            {mainLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => { router.push(link.href); setShowMore(false); }}
                  className={cn(
                    "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[52px]",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <span className={cn("transition-transform", active && "scale-110")}>{link.icon}</span>
                  <span className="text-[10px] font-medium leading-none">{link.label}</span>
                </button>
              );
            })}

            {/* More button (patron only) */}
            {isPatron && (
              <button
                onClick={() => setShowMore(!showMore)}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[52px]",
                  showMore || isActiveMore ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span className={cn("transition-transform", (showMore || isActiveMore) && "scale-110")}>
                  {showMore ? <X size={20} /> : <MoreHorizontal size={20} />}
                </span>
                <span className="text-[10px] font-medium leading-none">Plus</span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
