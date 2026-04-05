"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate } from "@/lib/shift-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SOURCE_ICONS, SEATING_ICONS, SEATING_LABELS, TYPE_LABELS, TABLE_ZONE_LABELS } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Reservation, ReservationSource, ReservationSeating, ReservationType, DiscountRequest, VenueTable } from "@/lib/types";
import { Plus, Trash2, ChevronLeft, ChevronRight, Check, Gift, X, AlertTriangle, Users } from "lucide-react";

export default function ReservationsPage() {
  const { profile, user } = useAuth();
  const supabase = createClient();
  const today = getShiftDate();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [venueTables, setVenueTables] = useState<VenueTable[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [viewDate, setViewDate] = useState(today);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [covers, setCovers] = useState("2");
  const [time, setTime] = useState(() => {
    const now = new Date();
    const minutes = now.getMinutes() < 30 ? "30" : "00";
    const hours = now.getMinutes() < 30 ? now.getHours() : now.getHours() + 1;
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  });
  const [seating, setSeating] = useState<ReservationSeating | "">("");
  const [type, setType] = useState<ReservationType | "">("");
  const [source, setSource] = useState<ReservationSource>("telephone");
  const [tableId, setTableId] = useState<string>("");
  const [notes, setNotes] = useState("");

  // F&F discount state
  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [discountRequests, setDiscountRequests] = useState<DiscountRequest[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestDate, setGuestDate] = useState(today);
  const [guestTime, setGuestTime] = useState("19:00");
  const [guestCount, setGuestCount] = useState("2");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [{ data: resas }, { data: profs }, { data: disc }, { data: tables }] = await Promise.all([
        supabase.from("reservations").select("*").eq("date", viewDate),
        supabase.from("profiles").select("id, name"),
        supabase.from("discount_requests").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
        supabase.from("venue_tables").select("*").order("zone").order("sort_order"),
      ]);
      setReservations(resas || []);
      setDiscountRequests(disc || []);
      setVenueTables(tables || []);
      const map: Record<string, string> = {};
      profs?.forEach((p: { id: string; name: string }) => { map[p.id] = p.name; });
      setProfiles(map);
      setLoading(false);
    }
    load();

    // Realtime
    const channel = supabase
      .channel("reservations-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations", filter: `date=eq.${viewDate}` }, () => {
        supabase.from("reservations").select("*").eq("date", viewDate).then(({ data }) => {
          if (data) setReservations(data);
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, viewDate, supabase]);

  const sorted = useMemo(() =>
    [...reservations].sort((a, b) => a.time.localeCompare(b.time)),
    [reservations]
  );

  const attendu = sorted.filter((r) => r.status === "attendu");
  const arrive = sorted.filter((r) => r.status === "arrive");
  const totalCovers = reservations.reduce((sum, r) => sum + r.covers, 0);

  // Check if overdue
  function getOverdueMin(r: Reservation): number {
    if (r.status !== "attendu") return 0;
    const now = new Date();
    const [h, m] = r.time.split(":").map(Number);
    const resTime = new Date();
    resTime.setHours(h, m, 0);
    const diff = Math.floor((now.getTime() - resTime.getTime()) / 60000);
    return diff > 0 ? diff : 0;
  }

  // Capacity calculations
  const totalCapacity = venueTables.reduce((sum, t) => sum + t.capacity, 0);
  const totalMaxCapacity = venueTables.reduce((sum, t) => sum + t.max_capacity, 0);
  const isLargeGroup = (covers: number) => covers >= 6;
  const hasAllergy = (notes: string | null) => notes && /allerg|gluten|lactose|végan|vegan|végétar|intoléran/i.test(notes);

  // Available tables for assignment
  const assignedTableIds = new Set(reservations.filter((r) => r.table_id).map((r) => r.table_id!));
  const availableTables = venueTables.filter((t) => !assignedTableIds.has(t.id));

  async function addReservation() {
    if (!name.trim() || !seating || !type || !user) return;
    const { data } = await supabase.from("reservations").insert({
      name: name.trim(), covers: parseInt(covers), time, date: viewDate,
      seating, type, source, notes: notes.trim() || null,
      table_id: tableId && tableId !== "none" ? tableId : null,
      status: "attendu", created_by: user.id,
    }).select().single();
    if (data) setReservations((prev) => [...prev, data]);
    setSheetOpen(false);
    setName(""); setCovers("2"); setNotes(""); setSeating(""); setType(""); setTableId("");
  }

  async function deleteReservation(id: string) {
    await supabase.from("reservations").delete().eq("id", id);
    setReservations((prev) => prev.filter((r) => r.id !== id));
  }

  async function markArrived(id: string) {
    const { data } = await supabase.from("reservations").update({
      status: "arrive", arrived_by: user?.id,
    }).eq("id", id).select().single();
    if (data) setReservations((prev) => prev.map((r) => r.id === id ? data : r));
  }

  async function markAttendu(id: string) {
    const { data } = await supabase.from("reservations").update({
      status: "attendu", arrived_by: null,
    }).eq("id", id).select().single();
    if (data) setReservations((prev) => prev.map((r) => r.id === id ? data : r));
  }

  async function submitDiscountRequest() {
    if (!user || !guestName.trim() || !guestDate) return;
    const { data } = await supabase.from("discount_requests").insert({
      user_id: user.id, guest_name: guestName.trim(), date: guestDate, time: guestTime, guest_count: parseInt(guestCount),
    }).select().single();
    if (data) setDiscountRequests((prev) => [data, ...prev]);
    setShowDiscountForm(false); setGuestName(""); setGuestDate(today); setGuestTime("19:00"); setGuestCount("2");
  }

  const formatDay = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  };

  function prevDay() {
    const d = new Date(viewDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setViewDate(d.toISOString().split("T")[0]);
  }

  function nextDay() {
    const d = new Date(viewDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    setViewDate(d.toISOString().split("T")[0]);
  }

  if (loading) {
    return <div className="p-4 max-w-lg mx-auto space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-card animate-pulse" />)}</div>;
  }

  if (!profile) return null;

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl" style={{ fontFamily: "var(--font-dm-serif)" }}>Réservations</h1>
        <div className="flex gap-2">
          {profile?.role !== "patron" && (
            <Button size="lg" variant="secondary" className="h-12 px-5" onClick={() => setShowDiscountForm(!showDiscountForm)}>
              <Gift size={18} className="mr-1.5" /> Inviter
            </Button>
          )}
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button size="lg" className="h-12 px-6 text-base font-medium"><Plus size={18} className="mr-1.5" /> Nouvelle résa</Button>
            </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader><SheetTitle>Nouvelle réservation</SheetTitle></SheetHeader>
            <div className="space-y-3 mt-4">
              <Input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
              <div className="flex gap-2">
                <Input type="number" min="1" max="30" value={covers} onChange={(e) => setCovers(e.target.value)} className="w-20" placeholder="Pers." />
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Emplacement</p>
                <div className="flex gap-2">
                  {(["interieur", "terrasse"] as ReservationSeating[]).map((s) => (
                    <button key={s} onClick={() => setSeating(s)} className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ background: seating === s ? "var(--primary)" : "var(--secondary)", color: seating === s ? "var(--primary-foreground)" : "var(--foreground)" }}>
                      {SEATING_ICONS[s]} {SEATING_LABELS[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Type</p>
                <div className="flex gap-2">
                  {(["diner", "drinks"] as ReservationType[]).map((t) => (
                    <button key={t} onClick={() => setType(t)} className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                      style={{ background: type === t ? "var(--primary)" : "var(--secondary)", color: type === t ? "var(--primary-foreground)" : "var(--foreground)" }}>
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Source</p>
                <div className="flex gap-2">
                  {(["telephone", "instagram", "walk-in"] as ReservationSource[]).map((s) => (
                    <button key={s} onClick={() => setSource(s)} className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors"
                      style={{ background: source === s ? "var(--primary)" : "var(--secondary)", color: source === s ? "var(--primary-foreground)" : "var(--foreground)" }}>
                      {SOURCE_ICONS[s]} {s === "walk-in" ? "Walk-in" : s === "telephone" ? "Tél" : "Insta"}
                    </button>
                  ))}
                </div>
              </div>
              {/* Table assignment (optional) */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Table (optionnel)</p>
                <Select value={tableId} onValueChange={setTableId}>
                  <SelectTrigger><SelectValue placeholder="Pas de table assignée" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Pas de table</SelectItem>
                    {availableTables
                      .filter((t) => !seating || (seating === "interieur" ? t.zone === "restaurant" : t.zone !== "restaurant"))
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          #{t.id} — {TABLE_ZONE_LABELS[t.zone]} ({t.capacity}p{t.max_capacity > t.capacity ? `, max ${t.max_capacity}` : ""})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea placeholder="Notes (allergies, demandes spéciales...)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              {name.trim() && !seating && (
                <p className="text-xs text-warning">Choisis un emplacement (Intérieur ou Terrasse)</p>
              )}
              {name.trim() && seating && !type && (
                <p className="text-xs text-warning">Choisis le type (Dîner ou Drinks)</p>
              )}
              <Button className="w-full" onClick={addReservation} disabled={!name.trim() || !seating || !type}>
                {!name.trim() ? "Ajouter la réservation" : !seating ? "Choisis un emplacement" : !type ? "Choisis le type" : "Ajouter la réservation"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>

      {/* F&F Discount form */}
      {showDiscountForm && (
        <div className="mb-4 p-4 rounded-lg bg-card space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-sm">Inviter un proche</h3>
            <button onClick={() => setShowDiscountForm(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <Input placeholder="Nom de l'invité" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          <div className="flex gap-2">
            <Input type="date" value={guestDate} onChange={(e) => setGuestDate(e.target.value)} />
            <Input type="time" value={guestTime} onChange={(e) => setGuestTime(e.target.value)} className="w-28" />
            <Input type="number" min="1" max="10" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} className="w-20" placeholder="Pers." />
          </div>
          <Button className="w-full" onClick={submitDiscountRequest} disabled={!guestName.trim() || !guestDate}>
            Envoyer la demande
          </Button>
          {discountRequests.length > 0 && (
            <div className="pt-2 border-t border-border space-y-1">
              <p className="text-xs text-muted-foreground">Mes invitations</p>
              {discountRequests.slice(0, 3).map((d) => (
                <div key={d.id} className="flex justify-between text-xs">
                  <span>{d.guest_name} — {d.date} ({d.guest_count}p)</span>
                  <Badge variant={d.status === "pending" ? "secondary" : d.status === "accepted" ? "default" : "destructive"} className="text-xs">
                    {d.status === "pending" ? "En attente" : d.status === "accepted" ? "Accepté" : "Refusé"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Date nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevDay}><ChevronLeft size={20} className="text-muted-foreground" /></button>
        <span className="text-sm font-medium capitalize">{formatDay(viewDate)} {viewDate === today && "· Ce soir"}</span>
        <button onClick={nextDay}><ChevronRight size={20} className="text-muted-foreground" /></button>
      </div>

      {/* Summary + Capacity */}
      <div className="p-3 rounded-lg bg-card mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-muted-foreground">{reservations.length} résas</span>
          <span className="text-sm font-bold text-primary">{totalCovers} / {totalCapacity} couverts</span>
        </div>
        {totalCapacity > 0 && (
          <Progress value={Math.min((totalCovers / totalCapacity) * 100, 100)} className="h-1.5" />
        )}
        {totalCovers > totalCapacity && (
          <p className="text-xs text-warning mt-1 flex items-center gap-1">
            <AlertTriangle size={12} /> Capacité standard dépassée ({totalCovers - totalCapacity} de plus)
          </p>
        )}
      </div>

      {/* Attendu */}
      {attendu.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Attendus</h3>
          <div className="space-y-2">
            {attendu.map((r) => {
              const overdue = getOverdueMin(r);
              return (
                <div key={r.id} className={`p-3 rounded-lg bg-card ${overdue >= 30 ? "border-l-[3px] border-l-destructive" : overdue >= 15 ? "border-l-[3px] border-l-warning" : ""}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{r.name}</span>
                        <span className="text-sm text-primary">{r.covers}p</span>
                        {isLargeGroup(r.covers) && <Badge variant="default" className="text-xs"><Users size={10} className="mr-0.5" />Groupe</Badge>}
                        <span className="text-xs">{SEATING_ICONS[r.seating]}</span>
                        <Badge variant="secondary" className="text-xs">{TYPE_LABELS[r.type]}</Badge>
                        {r.table_id && <Badge variant="outline" className="text-xs">#{r.table_id}</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{r.time.slice(0, 5)} · {SOURCE_ICONS[r.source]}</p>
                      {hasAllergy(r.notes) && (
                        <p className="text-xs mt-0.5 flex items-center gap-1 text-warning">
                          <AlertTriangle size={11} /> {r.notes}
                        </p>
                      )}
                      {r.notes && !hasAllergy(r.notes) && <p className="text-xs text-primary mt-0.5">{r.notes}</p>}
                      {overdue >= 15 && (
                        <p className="text-xs mt-1" style={{ color: overdue >= 30 ? "var(--destructive)" : "var(--warning)" }}>
                          En retard — {overdue} min {overdue >= 30 ? "· relancer ?" : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button onClick={() => markArrived(r.id)} className="p-1.5 rounded hover:bg-secondary" title="Arrivé">
                        <Check size={16} className="text-success" />
                      </button>
                      <button onClick={() => deleteReservation(r.id)} className="p-1.5 rounded hover:bg-secondary">
                        <Trash2 size={14} className="text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Arrivés */}
      {arrive.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Arrivés</h3>
          <div className="space-y-2">
            {arrive.map((r) => (
              <div key={r.id} className="p-3 rounded-lg bg-card opacity-60">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-sm">{r.covers}p</span>
                      <Badge variant="default" className="text-xs">✓ arrivé</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.time.slice(0, 5)} · accueilli par {profiles[r.arrived_by || ""] || "?"}
                    </p>
                  </div>
                  <button onClick={() => markAttendu(r.id)} className="text-xs text-muted-foreground">Annuler</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reservations.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Aucune résa pour {viewDate === today ? "ce soir" : "ce jour"} — c&apos;est calme !
        </div>
      )}
    </div>
  );
}
