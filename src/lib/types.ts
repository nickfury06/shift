// ── Roles ──────────────────────────────────────────────────
export type Role = "patron" | "responsable" | "staff";
export type StockDomain = "boissons" | "vins";
export type StockCategory = "spiritueux" | "sirops_cocktails" | "bieres" | "vins" | "champagnes" | "softs" | "consommables";

// ── Zones ──────────────────────────────────────────────────
export type Zone = "bar" | "terrasse" | "restaurant";

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
export type ReservationSeating = "interieur" | "terrasse" | "bar";
export type ReservationType = "diner" | "drinks";
export type ReservationStatus = "attendu" | "arrive";

// ── Table zones ────────────────────────────────────────────
export type TableZone = "restaurant" | "terrasse" | "terrasse_couverte" | "bar";

// ── Profile ────────────────────────────────────────────────
export type EmploymentType = "permanent" | "extra";

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  stock_domain: StockDomain | null;
  must_change_password: boolean;
  onboarding_completed: boolean;
  employment_type: EmploymentType;
  active: boolean;
  created_at: string;
}

// ── Tasks ──────────────────────────────────────────────────
export interface Task {
  id: string;
  title: string;
  note: string | null;
  zone: Zone;
  moment: Moment;
  assigned_to: string[];
  days: Day[];
  priority: number;
  is_reminder: boolean;
  is_libre: boolean;
  created_by: string | null;
  created_at: string;
}

export interface OneOffTask {
  id: string;
  title: string;
  note: string | null;
  zone: Zone;
  moment: Moment;
  assigned_to: string[];
  date: string;
  priority: number;
  is_reminder: boolean;
  is_libre: boolean;
  created_by: string | null;
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
  date: string;
  start_time: string;
  end_time: string;
  created_by: string | null;
  created_at: string;
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
  fnf_requested_by: string | null;
  fnf_status: "pending" | "accepted" | "refused" | null;
  created_by: string;
  created_at: string;
}

export interface VenueTable {
  id: string;
  zone: string;
  capacity: number;
  max_capacity: number;
  table_type: string;
  sort_order: number;
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
export type Affluence = "calme" | "normal" | "charge" | "rush";
export type ClosingState = "impeccable" | "correct" | "a_ameliorer";

export interface Debrief {
  id: string;
  user_id: string;
  date: string;
  global_rating: number;
  service_rating: number;
  team_rating: number;
  affluence: Affluence;
  closing_state: ClosingState;
  incidents: string | null;
  client_feedback: string | null;
  suggestions: string | null;
  created_at: string;
}

// ── Availability Requests ──────────────────────────────────
export interface AvailabilityRequest {
  id: string;
  user_id: string;
  date: string;
  reason: string | null;
  status: "pending" | "accepted" | "refused";
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
  category: StockCategory;
  domain: StockDomain;
  unit: string;
  current_stock: number;
  min_stock: number;
  bottle_size: string | null;
  cost_price: number | null;
  supplier: string | null;
  sort_order: number;
  created_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: "opened" | "inventory" | "received" | "adjustment";
  quantity: number;
  level: number | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

export interface StockOrder {
  id: string;
  product_id: string;
  quantity_needed: number | null;
  status: "pending" | "ordered" | "received";
  delivery_date: string | null;
  created_by: string;
  created_at: string;
}

export interface StockAlert {
  id: string;
  product_id: string;
  message: string | null;
  created_by: string;
  acknowledged: boolean;
  created_at: string;
}


// ── Rituals ───────────────────────────────────────────────
export interface Ritual {
  id: string;
  day: Day;
  time: string;
  name: string;
  description: string | null;
  organizer: string | null;
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
