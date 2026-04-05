import type { DayOfWeek } from "./types";

const JS_DAY_TO_FR: DayOfWeek[] = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

/**
 * Returns the shift date as YYYY-MM-DD string.
 * Before 4 AM → returns yesterday (still the previous shift).
 */
export function getShiftDate(): string {
  const now = new Date();
  if (now.getHours() < 4) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split("T")[0];
  }
  return now.toISOString().split("T")[0];
}

/**
 * Returns the French day-of-week for the current shift.
 * Before 4 AM → returns yesterday's day name.
 */
export function getShiftDay(): DayOfWeek {
  const now = new Date();
  if (now.getHours() < 4) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return JS_DAY_TO_FR[yesterday.getDay()];
  }
  return JS_DAY_TO_FR[now.getDay()];
}

/**
 * Returns a greeting based on the current hour.
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 4) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

/**
 * Formats a date string (YYYY-MM-DD) to French display.
 * Example: "2026-04-01" → "Mardi 1 avril"
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
 * Formats a time string (HH:mm:ss or HH:mm) to display.
 * Example: "16:00:00" → "16h00"
 */
export function formatTime(timeStr: string): string {
  const [hours, minutes] = timeStr.split(":");
  return `${hours}h${minutes}`;
}
