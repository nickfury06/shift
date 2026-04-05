// ============================================================
// Le Hive Management — Type Definitions
// Uses snake_case to match Supabase column names directly
// ============================================================

export type Role = "patron" | "responsable" | "staff";
export type StockDomain = "boissons" | "vins";
export type Moment = "ouverture" | "service" | "fermeture";
export type DayOfWeek = "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";
export type ReservationSource = "instagram" | "telephone" | "walk-in";
export type ReservationSeating = "interieur" | "terrasse";
export type ReservationType = "diner" | "drinks";
export type ReservationStatus = "attendu" | "arrive";

export type Zone =
  | "terrasse"
  | "terrasse_wc"
  | "restaurant"
  | "bar_escaliers"
  | "bar_salle"
  | "bar_gaming"
  | "bar_backbar"
  | "bar_reserve";

// --- Database row types (match Supabase columns) ---

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  stock_domain: StockDomain | null;
  must_change_password: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  note: string | null;
  zone: Zone;
  moment: Moment;
  assigned_to: string[];
  days: DayOfWeek[];
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
  task_type: "recurring" | "one_off";
  shift_date: string;
  completed_by: string;
  moment: Moment;
  completed_at: string;
}

export interface Schedule {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  created_by: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  name: string;
  covers: number;
  time: string;
  date: string;
  seating: ReservationSeating;
  type: ReservationType;
  source: ReservationSource;
  notes: string | null;
  status: ReservationStatus;
  arrived_by: string | null;
  table_id: string | null;
  created_by: string;
  created_at: string;
}

export type TableZone = "restaurant" | "terrasse" | "terrasse_couverte" | "bar";
export type TableType = "standard" | "high" | "round";

export interface VenueTable {
  id: string;
  zone: TableZone;
  capacity: number;
  max_capacity: number;
  table_type: TableType;
  sort_order: number;
}

export interface ManagerMessage {
  id: string;
  content: string;
  date: string;
  created_by: string;
  created_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  created_by: string;
  created_at: string;
}

export interface Debrief {
  id: string;
  user_id: string;
  date: string;
  global_score: number;
  service_score: number;
  coordination_score: number;
  ambiance_score: number;
  proprete_score: number;
  service_comment: string | null;
  coordination_comment: string | null;
  ambiance_comment: string | null;
  proprete_comment: string | null;
  suggestions: string | null;
  created_at: string;
}

export interface AvailabilityRequest {
  id: string;
  user_id: string;
  date: string;
  reason: string | null;
  status: "pending" | "accepted" | "refused";
  created_at: string;
}

export interface DiscountRequest {
  id: string;
  user_id: string;
  guest_name: string;
  date: string;
  time: string | null;
  guest_count: number;
  status: "pending" | "accepted" | "refused";
  patron_note: string | null;
  created_at: string;
}

export type StockCategory = "spiritueux" | "sirops_cocktails" | "bieres" | "vins" | "champagnes" | "softs" | "consommables";
export type StockMovementType = "opened" | "inventory" | "received" | "adjustment";

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
  type: StockMovementType;
  quantity: number;
  level: number | null;
  note: string | null;
  created_by: string;
  created_at: string;
}

export type StockOrderStatus = "pending" | "ordered" | "received";

export interface StockOrder {
  id: string;
  product_id: string;
  quantity_needed: number | null;
  status: StockOrderStatus;
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
