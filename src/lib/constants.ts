import type { Zone, Moment, DayOfWeek } from "./types";

// ============================================================
// Zone configuration
// ============================================================

export const ZONE_LABELS: Record<Zone, string> = {
  terrasse: "Terrasse",
  terrasse_wc: "Toilettes",
  restaurant: "Restaurant",
  bar_escaliers: "Escaliers",
  bar_salle: "Salle",
  bar_gaming: "Gaming",
  bar_backbar: "Back Bar",
  bar_reserve: "Réserve",
};

export const ZONE_COLORS: Record<Zone, string> = {
  terrasse: "var(--zone-terrasse)",
  terrasse_wc: "var(--zone-toilettes)",
  restaurant: "var(--zone-restaurant)",
  bar_escaliers: "var(--zone-escaliers)",
  bar_salle: "var(--zone-salle)",
  bar_gaming: "var(--zone-gaming)",
  bar_backbar: "var(--zone-backbar)",
  bar_reserve: "var(--zone-reserve)",
};

export const ZONE_OPTIONS: Zone[] = [
  "terrasse",
  "terrasse_wc",
  "restaurant",
  "bar_escaliers",
  "bar_salle",
  "bar_gaming",
  "bar_backbar",
  "bar_reserve",
];

// ============================================================
// Moment configuration
// ============================================================

export const MOMENT_LABELS: Record<Moment, string> = {
  ouverture: "Ouverture",
  service: "Service",
  fermeture: "Fermeture",
};

export const MOMENT_ORDER: Moment[] = ["ouverture", "service", "fermeture"];

// ============================================================
// Days configuration
// ============================================================

export const DAY_LABELS: Record<DayOfWeek, string> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
  dimanche: "Dimanche",
};

export const WORK_DAYS: DayOfWeek[] = [
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];

// ============================================================
// Reservation configuration
// ============================================================

export const SOURCE_LABELS = {
  instagram: "Instagram",
  telephone: "Téléphone",
  "walk-in": "Walk-in",
} as const;

export const SOURCE_ICONS = {
  instagram: "📱",
  telephone: "📞",
  "walk-in": "🚶",
} as const;

export const TABLE_ZONE_LABELS = {
  restaurant: "Restaurant",
  terrasse: "Terrasse",
  terrasse_couverte: "Couverte",
  bar: "Bar",
} as const;

export const SEATING_LABELS = {
  interieur: "Intérieur",
  terrasse: "Terrasse",
} as const;

export const SEATING_ICONS = {
  interieur: "🏠",
  terrasse: "☀️",
} as const;

export const TYPE_LABELS = {
  diner: "Dîner",
  drinks: "Drinks",
} as const;

// ============================================================
// Debrief categories
// ============================================================

export const DEBRIEF_CATEGORIES = [
  { key: "service" as const, label: "Service" },
  { key: "coordination" as const, label: "Coordination" },
  { key: "ambiance" as const, label: "Ambiance" },
  { key: "proprete" as const, label: "Propreté" },
];

// ============================================================
// Animation tokens
// ============================================================

export const ANIMATIONS = {
  spring: { type: "spring" as const, stiffness: 500, damping: 25 },
  easeOutExpo: [0.16, 1, 0.3, 1] as [number, number, number, number],
  staggerDelay: 0.035,
};

// ============================================================
// Score color helper (debrief scores)
// ============================================================

export function scoreColor(score: number): string {
  if (score >= 4) return "var(--color-success)";
  if (score >= 3) return "var(--color-primary)";
  return "var(--color-destructive)";
}
