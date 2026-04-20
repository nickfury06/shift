import type { Day } from "./types";

// ── SIMULATION MODE ───────────────────────────────────────
// Only active in development if NEXT_PUBLIC_SIMULATE_DATE is set.
// In production, always uses real time.
export const SIMULATE_DATE: string | null =
  process.env.NODE_ENV === "development"
    ? (process.env.NEXT_PUBLIC_SIMULATE_DATE || null)
    : null;

export function getNow(): Date {
  if (SIMULATE_DATE) return new Date(SIMULATE_DATE);
  return new Date();
}

const FR_DAYS: Day[] = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

/**
 * Returns the "shift date" — if before 4 AM, we're still on yesterday's shift.
 */
export function getShiftDate(now = getNow()): string {
  const d = new Date(now);
  if (d.getHours() < 4) {
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().split("T")[0];
}

/**
 * Returns the day-of-week key for the current shift.
 */
export function getShiftDay(now = getNow()): Day {
  const d = new Date(now);
  if (d.getHours() < 4) {
    d.setDate(d.getDate() - 1);
  }
  return FR_DAYS[d.getDay()];
}

/**
 * Returns a French greeting based on the time of day.
 */
export function getGreeting(now = getNow()): string {
  const h = now.getHours();
  if (h < 4) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon apres-midi";
  return "Bonsoir";
}

/**
 * Formats a date string to French locale (e.g. "mardi 1 avril").
 */
export function formatDateFr(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/**
 * Formats a time string (HH:MM:SS or HH:MM) to short format (e.g. "18h30").
 */
export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(":");
  if (m === "00") return `${parseInt(h)}h`;
  return `${parseInt(h)}h${m}`;
}
