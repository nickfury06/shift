// ── Roles ──────────────────────────────────────────────────
export type Role = "patron" | "responsable" | "staff";
export type StockDomain = "boissons" | "vins";
export type StockCategory = "spiritueux" | "sirops_cocktails" | "bieres" | "vins" | "champagnes" | "softs" | "consommables";

// ── Zones ──────────────────────────────────────────────────
export type Zone =
  | "terrasse"
  | "terrasse_wc"
  | "restaurant"
  | "bar_escaliers"
  | "bar_salle"
  | "bar_gaming"
  | "bar_backbar"
  | "bar_reserve";

// ── Moments ────────────────────────────────────────────────
export type Moment = "ouverture" | "service" | "fermeture";

// ── Days ───────────────────────────────────────────────────
export type Day =
  | "lundi"
  | "mardi"
  | "mercredi"
  | "jeudi"
  | "vendredi"
  | "samedi"
  | "dimanche";

export type DayOfWeek = Day;

// ── Reservation fields ─────────────────────────────────────
export type ReservationSource = "instagram" | "telephone" | "walk-in";
export type ReservationSeating = "interieur" | "terrasse";
export type ReservationType = "diner" | "drinks";
export type ReservationStatus = "attendu" | "arrive";

// ── Table zones ────────────────────────────────────────────
export type TableZone = "restaurant" | "terrasse" | "terrasse_couverte" | "bar";

// ── Profile ────────────────────────────────────────────────
export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  stock_domain: StockDomain | null;
  must_change_password: boolean;
  onboarding_completed: boolean;
  created_at: string;
}

// ── Tasks ──────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  zone: Zone;
  moment: Moment;
  day: Day;
  assigned_to: string | null;
  priority: number;
  description: string | null;
  created_at: string;
}

export interface OneOffTask {
  id: string;
  title: string;
  zone: Zone;
  moment: Moment;
  date: string;
  assigned_to: string | null;
  created_by: string;
  priority: number;
  description: string | null;
  completed: boolean;
  created_at: string;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  user_id: string;
  date: string;
  moment: Moment;
  completed_at: string;
}

// ── Schedule ───────────────────────────────────────────────
export interface Schedule {
  id: string;
  user_id: string;
  day: Day;
  start_time: string;
  end_time: string;
  zone: Zone;
  week_start: string;
  created_at: string;
  updated_at: string;
}

// ── Reservations ───────────────────────────────────────────
export interface Reservation {
  id: string;
  name: string;
  date: string;
  time: string;
  covers: number;
  table_id: string | null;
  seating: ReservationSeating;
  type: ReservationType;
  status: ReservationStatus;
  source: ReservationSource;
  arrived_by: string | null;
  notes: string | null;
  phone: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ── Manager Messages ───────────────────────────────────────
export interface ManagerMessage {
  id: string;
  title: string;
  content: string;
  date: string;
  priority: "normal" | "urgent";
  created_by: string;
  created_at: string;
}

// ── Events ─────────────────────────────────────────────────
export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  created_by: string;
  created_at: string;
}

// ── Debrief ────────────────────────────────────────────────
export interface Debrief {
  id: string;
  user_id: string;
  date: string;
  shift: Moment;
  category: string;
  score: number;
  comment: string | null;
  created_at: string;
}

// ── Availability Requests ──────────────────────────────────
export interface AvailabilityRequest {
  id: string;
  user_id: string;
  date: string;
  type: "conge" | "indisponible" | "preference";
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Discount Requests ──────────────────────────────────────
export interface DiscountRequest {
  id: string;
  user_id: string;
  date: string;
  table_id: string | null;
  amount: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Stock ──────────────────────────────────────────────────
export interface StockProduct {
  id: string;
  name: string;
  category: string;
  unit: string;
  bottle_size: string | null;
  cost_price: number | null;
  supplier: string | null;
  par_level: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  quantity: number;
  type: "in" | "out" | "adjustment";
  reason: string | null;
  user_id: string;
  created_at: string;
}

export interface StockOrder {
  id: string;
  product_id: string;
  quantity: number;
  status: "pending" | "ordered" | "received";
  ordered_by: string;
  received_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockAlert {
  id: string;
  product_id: string;
  type: "low_stock" | "out_of_stock" | "expiring";
  message: string;
  resolved: boolean;
  created_at: string;
}

// ── Venue Tables ───────────────────────────────────────────
export interface VenueTable {
  id: string;
  label: string;
  zone: TableZone;
  seats: number;
  active: boolean;
  sort_order: number;
  created_at: string;
}

// ── Onboarding ─────────────────────────────────────────────
export interface OnboardingDoc {
  id: string;
  title: string;
  content: string;
  category: string;
  sort_order: number;
  required: boolean;
  created_at: string;
}

export interface OnboardingCompletion {
  id: string;
  user_id: string;
  doc_id: string;
  signed_name: string;
  completed_at: string;
}
