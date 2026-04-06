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
  { href: "/ce-soir", label: "Ce Soir", icon: <Sun size={20} strokeWidth={1.5} /> },
  { href: "/planning", label: "Planning", icon: <Calendar size={20} strokeWidth={1.5} /> },
  { href: "/reservations", label: "Résas", icon: <BookOpen size={20} strokeWidth={1.5} /> },
  { href: "/debrief", label: "Debrief", icon: <PenLine size={20} strokeWidth={1.5} /> },
];

const RESPONSABLE_LINKS: NavLink[] = [
  { href: "/ce-soir", label: "Ce Soir", icon: <Sun size={20} strokeWidth={1.5} /> },
  { href: "/planning", label: "Planning", icon: <Calendar size={20} strokeWidth={1.5} /> },
  { href: "/stocks", label: "Stocks", icon: <Package size={20} strokeWidth={1.5} /> },
  { href: "/reservations", label: "Résas", icon: <BookOpen size={20} strokeWidth={1.5} /> },
  { href: "/debrief", label: "Debrief", icon: <PenLine size={20} strokeWidth={1.5} /> },
];

const PATRON_MAIN_LINKS: NavLink[] = [
  { href: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} strokeWidth={1.5} /> },
  { href: "/ce-soir", label: "Ce Soir", icon: <Sun size={20} strokeWidth={1.5} /> },
  { href: "/reservations", label: "Résas", icon: <BookOpen size={20} strokeWidth={1.5} /> },
  { href: "/stocks", label: "Stocks", icon: <Package size={20} strokeWidth={1.5} /> },
];

const PATRON_MORE_LINKS: NavLink[] = [
  { href: "/messages", label: "Messages", icon: <MessageCircle size={18} strokeWidth={1.5} /> },
  { href: "/debriefs", label: "Debriefs", icon: <ClipboardList size={18} strokeWidth={1.5} /> },
  { href: "/planning", label: "Planning", icon: <Calendar size={18} strokeWidth={1.5} /> },
  { href: "/tasks", label: "Tâches", icon: <ListChecks size={18} strokeWidth={1.5} /> },
  { href: "/staff", label: "Staff", icon: <Users size={18} strokeWidth={1.5} /> },
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
      {/* More menu overlay */}
      {showMore && isPatron && (
        <div className="fixed inset-0 z-50 flex items-end justify-center animate-fade-in-up">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMore(false)} />
          <div className="relative w-full max-w-lg mx-auto mb-24 px-4">
            <div className="glass-card p-2 shadow-2xl stagger-children">
              {PATRON_MORE_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => { router.push(link.href); setShowMore(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all",
                    pathname === link.href ? "text-primary bg-primary/10" : "text-foreground/80 hover:text-foreground hover:bg-white/[0.03]"
                  )}
                >
                  <span className={cn("transition-colors", pathname === link.href ? "text-primary" : "text-muted-foreground")}>{link.icon}</span>
                  {link.label}
                </button>
              ))}
              <div className="border-t border-white/[0.06] mt-1.5 pt-1.5">
                <button
                  onClick={() => { signOut(); setShowMore(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-destructive/80 hover:text-destructive hover:bg-white/[0.03] transition-all"
                >
                  <LogOut size={18} strokeWidth={1.5} />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav — glass pill */}
      <nav className="fixed bottom-0 left-0 right-0 z-40">
        <div className="mx-auto max-w-lg px-4 pb-3">
          <div
            className="flex items-center justify-around py-1.5 shadow-2xl"
            style={{
              background: "rgba(255, 240, 220, 0.04)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 240, 220, 0.06)",
              borderRadius: "1.25rem",
            }}
          >
            {mainLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <button
                  key={link.href}
                  onClick={() => { router.push(link.href); setShowMore(false); }}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl transition-all min-w-[48px]",
                    active ? "text-primary" : "text-muted-foreground/60"
                  )}
                >
                  <span
                    className="transition-all duration-200"
                    style={active ? {
                      filter: "drop-shadow(0 0 6px rgba(123, 163, 122, 0.4))",
                      transform: "scale(1.1)",
                    } : {}}
                  >
                    {link.icon}
                  </span>
                  <span className={cn(
                    "text-[10px] font-medium leading-none transition-colors",
                    active ? "text-primary" : "text-muted-foreground/50"
                  )}>
                    {link.label}
                  </span>
                </button>
              );
            })}

            {isPatron && (
              <button
                onClick={() => setShowMore(!showMore)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 px-3 rounded-xl transition-all min-w-[48px]",
                  showMore || isActiveMore ? "text-primary" : "text-muted-foreground/60"
                )}
              >
                <span
                  className="transition-all duration-200"
                  style={(showMore || isActiveMore) ? {
                    filter: "drop-shadow(0 0 6px rgba(123, 163, 122, 0.4))",
                    transform: "scale(1.1)",
                  } : {}}
                >
                  {showMore ? <X size={20} strokeWidth={1.5} /> : <MoreHorizontal size={20} strokeWidth={1.5} />}
                </span>
                <span className={cn(
                  "text-[10px] font-medium leading-none transition-colors",
                  showMore || isActiveMore ? "text-primary" : "text-muted-foreground/50"
                )}>
                  Plus
                </span>
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
