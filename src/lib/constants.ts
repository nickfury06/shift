import type { Zone, Moment, Day, ReservationSource, ReservationSeating, ReservationType, TableZone } from "./types";

// ── Zone ───────────────────────────────────────────────────
export const ZONE_LABELS: Record<Zone, string> = {
  bar: "Bar",
  terrasse: "Terrasse",
  restaurant: "Restaurant",
};

export const ZONE_COLORS: Record<Zone, string> = {
  bar: "#8B7B6A",
  terrasse: "#C9906A",
  restaurant: "#A87A6A",
};

// ── Moment ─────────────────────────────────────────────────
export const MOMENT_LABELS: Record<Moment, string> = {
  ouverture: "Ouverture",
  service: "Service",
  fermeture: "Fermeture",
};

export const MOMENT_ORDER: Moment[] = ["ouverture", "service", "fermeture"];

// ── Day ────────────────────────────────────────────────────
export const DAY_LABELS: Record<Day, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
  dimanche: "Dimanche",
};

export const WORK_DAYS: Day[] = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

// ── Reservation Sources ────────────────────────────────────
export const SOURCE_LABELS: Record<ReservationSource, string> = {
  telephone: "Téléphone",
  "walk-in": "Walk-in",
  instagram: "Instagram",
};

export const SOURCE_ICONS: Record<ReservationSource, string> = {
  telephone: "📞",
  "walk-in": "🚶",
  instagram: "📱",
};

// ── Seating ────────────────────────────────────────────────
export const SEATING_LABELS: Record<ReservationSeating, string> = {
  interieur: "Intérieur",
  terrasse: "Terrasse",
};

export const SEATING_ICONS: Record<ReservationSeating, string> = {
  interieur: "🏠",
  terrasse: "☀️",
};

// ── Reservation Type ───────────────────────────────────────
export const TYPE_LABELS: Record<ReservationType, string> = {
  diner: "Dîner",
  drinks: "Drinks",
};

// ── Table Zones ────────────────────────────────────────────
export const TABLE_ZONE_LABELS: Record<TableZone, string> = {
  restaurant: "Restaurant",
  terrasse: "Terrasse",
  terrasse_couverte: "Couverte",
  bar: "Bar",
};

// ── Debrief Categories ─────────────────────────────────────
export const DEBRIEF_CATEGORIES = [
  "service",
  "ambiance",
  "cuisine",
  "equipe",
  "proprete",
  "stock",
] as const;

// ── Animations ─────────────────────────────────────────────
export const ANIMATIONS = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  },
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  scale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
  stagger: {
    container: {
      animate: { transition: { staggerChildren: 0.05 } },
    },
    item: {
      initial: { opacity: 0, y: 10 },
      animate: { opacity: 1, y: 0 },
    },
  },
} as const;

// ── Score Color ────────────────────────────────────────────
export function scoreColor(score: number): string {
  if (score >= 4) return "var(--color-success)";
  if (score >= 3) return "var(--color-primary)";
  return "var(--color-destructive)";
}
