"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import { getNow } from "@/lib/shift-utils";
import type { StockProduct, StockOrder, StockAlert, StockCategory } from "@/lib/types";
import { Search, AlertTriangle, Check, Plus, Minus, X, Bell, Truck, Clock, Package, ClipboardList, ShoppingCart, ChevronDown } from "lucide-react";

const CATEGORY_LABELS: Record<StockCategory, string> = {
  spiritueux: "Spiritueux",
  sirops_cocktails: "Sirops & Cocktails",
  bieres: "Bières",
  vins: "Vins",
  champagnes: "Champagnes",
  softs: "Softs",
  consommables: "Consommables",
};

const CATEGORY_ORDER: StockCategory[] = [
  "spiritueux", "sirops_cocktails", "bieres", "softs", "vins", "champagnes", "consommables",
];

// France Boissons deadlines
function getNextDeadline(): { label: string; urgent: boolean; minutesLeft: number | null } {
  const now = getNow();
  const day = now.getDay(); // 0=sun 1=mon 2=tue 3=wed 4=thu 5=fri 6=sat
  const hour = now.getHours();
  const minute = now.getMinutes();

  const minutesUntil11 = (11 - hour) * 60 - minute;

  // Tue before 11h → deadline today
  if (day === 2 && hour < 11) return { label: "Aujourd'hui 11h → livré mercredi", urgent: true, minutesLeft: minutesUntil11 };
  // Thu before 11h → deadline today
  if (day === 4 && hour < 11) return { label: "Aujourd'hui 11h → livré vendredi", urgent: true, minutesLeft: minutesUntil11 };
  // After tue 11h, before thu 11h → next is thursday
  if ((day === 2 && hour >= 11) || day === 3 || (day === 4 && hour < 11))
    return { label: "Jeudi 11h → livré vendredi", urgent: day === 3, minutesLeft: null };
  // After thu 11h through monday → next is tuesday
  return { label: "Mardi 11h → livré mercredi", urgent: day === 1, minutesLeft: null };
}

function formatMinutesLeft(m: number): string {
  if (m <= 0) return "maintenant";
  if (m < 60) return `dans ${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `dans ${h}h` : `dans ${h}h${String(rem).padStart(2, "0")}`;
}

type View = "signal" | "inventaire" | "commande";

function getDomainLabel(domain: string): string {
  return domain === "vins" ? "Vins" : "Boissons";
}

export default function StocksPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const { confirm: confirmDialog } = useConfirm();
  const supabase = useRef(createClient()).current;
  const [orderQuantities, setOrderQuantities] = useState<Record<string, number>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("shift-order-qtys") || "{}"); }
    catch { return {}; }
  });
  const [manualProductIds, setManualProductIds] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem("shift-manual-order") || "[]")); }
    catch { return new Set(); }
  });
  const [showAddProduct, setShowAddProduct] = useState(false);

  function updateQty(id: string, qty: number) {
    const next = { ...orderQuantities, [id]: qty };
    setOrderQuantities(next);
    localStorage.setItem("shift-order-qtys", JSON.stringify(next));
  }
  function addManual(id: string) {
    const next = new Set(manualProductIds); next.add(id);
    setManualProductIds(next);
    localStorage.setItem("shift-manual-order", JSON.stringify([...next]));
    setShowAddProduct(false);
  }
  function removeManual(id: string) {
    const next = new Set(manualProductIds); next.delete(id);
    setManualProductIds(next);
    localStorage.setItem("shift-manual-order", JSON.stringify([...next]));
    const nextQty = { ...orderQuantities }; delete nextQty[id];
    setOrderQuantities(nextQty);
    localStorage.setItem("shift-order-qtys", JSON.stringify(nextQty));
  }
  function clearOrder() {
    setOrderQuantities({});
    setManualProductIds(new Set());
    localStorage.removeItem("shift-order-qtys");
    localStorage.removeItem("shift-manual-order");
  }
  const isManager = profile?.role === "patron" || profile?.role === "responsable";

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("signal");
  const [didAutoSwitchToCommande, setDidAutoSwitchToCommande] = useState(false);
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  // Inventory
  const [countingId, setCountingId] = useState<string | null>(null);
  const [countValue, setCountValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [invSearch, setInvSearch] = useState("");
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  function toggleCat(cat: string) {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  const fetchData = useCallback(async () => {
    const [prodRes, orderRes, alertRes, profRes] = await Promise.all([
      supabase.from("stock_products").select("*").order("sort_order"),
      supabase.from("stock_orders").select("*").in("status", ["pending", "ordered"]).order("created_at"),
      supabase.from("stock_alerts").select("*").eq("acknowledged", false).order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, name"),
    ]);
    setProducts((prodRes.data as StockProduct[]) || []);
    setOrders((orderRes.data as StockOrder[]) || []);
    setAlerts((alertRes.data as StockAlert[]) || []);
    const map: Record<string, string> = {};
    ((profRes.data as { id: string; name: string }[]) || []).forEach((p) => { map[p.id] = p.name; });
    setProfileMap(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-switch managers to Commande view when inside France Boissons deadline window (Tue/Thu before 11h)
  useEffect(() => {
    if (!isManager || didAutoSwitchToCommande) return;
    const { minutesLeft } = getNextDeadline();
    if (minutesLeft !== null && minutesLeft > 0) {
      setView("commande");
      setDidAutoSwitchToCommande(true);
    }
  }, [isManager, didAutoSwitchToCommande]);

  useEffect(() => {
    const ch = supabase.channel("stocks-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_products" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_orders" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_alerts" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, fetchData]);

  // ── Helpers ─────────────────────────────────────────────
  function stockStatus(p: StockProduct): "ok" | "low" | "critical" {
    if (p.current_stock <= 0) return "critical";
    if (p.current_stock <= p.min_stock) return "low";
    return "ok";
  }
  const statusDot = { ok: "#8B5A40", low: "var(--warning)", critical: "var(--danger)" };

  async function sendAlert(productId: string) {
    if (!user) return;
    const p = products.find((x) => x.id === productId);
    await supabase.from("stock_alerts").insert({
      product_id: productId,
      message: `${p?.name} est bas`,
      created_by: user.id,
    });
    setSearch("");
    fetchData();
  }

  async function acknowledgeAlert(id: string) {
    await supabase.from("stock_alerts").update({ acknowledged: true }).eq("id", id);
    fetchData();
  }

  async function saveCount(productId: string) {
    if (!user || saving) return;
    const qty = parseFloat(countValue);
    if (isNaN(qty) || qty < 0) return;
    setSaving(true);
    await supabase.from("stock_products").update({ current_stock: qty }).eq("id", productId);
    await supabase.from("stock_movements").insert({ product_id: productId, type: "inventory", quantity: qty, created_by: user.id });
    setSaving(false);
    setCountingId(null);
    setCountValue("");
    fetchData();
  }

  async function addToOrder(productId: string) {
    if (!user || orders.find((o) => o.product_id === productId)) return;
    await supabase.from("stock_orders").insert({ product_id: productId, created_by: user.id });
    fetchData();
  }

  async function markOrdered(orderId: string) {
    await supabase.from("stock_orders").update({ status: "ordered" }).eq("id", orderId);
    fetchData();
  }

  async function markReceived(orderId: string) {
    await supabase.from("stock_orders").update({ status: "received" }).eq("id", orderId);
    fetchData();
  }

  async function removeOrder(orderId: string) {
    await supabase.from("stock_orders").delete().eq("id", orderId);
    fetchData();
  }

  // ── Derived ─────────────────────────────────────────────
  // Responsables only see their domain — EXCEPT for `consommables`,
  // which both responsables (and patron) can manage. Whoever is on
  // site signals the need; Benjamin then passes the Metro order.
  const visibleProducts = profile?.role === "responsable" && profile.stock_domain
    ? products.filter((p) => p.domain === profile.stock_domain || p.category === "consommables")
    : products;

  const searchResults = search.length >= 2
    ? products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8)
    : [];

  const alertedProductIds = new Set(alerts.map((a) => a.product_id));
  const orderProductIds = new Set(orders.map((o) => o.product_id));
  const lowProducts = visibleProducts.filter((p) => stockStatus(p) !== "ok");
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const orderedOrders = orders.filter((o) => o.status === "ordered");
  const deadline = getNextDeadline();

  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, label: CATEGORY_LABELS[cat], items: visibleProducts.filter((p) => p.category === cat) }))
    .filter((g) => g.items.length > 0);

  if (loading) {
    return (
      <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-light pulse" style={{ height: 56, borderRadius: 16, marginBottom: 10, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
      <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 16 }}>
        Stocks
      </h1>

      {/* ── France Boissons deadline banner (Tue/Thu before 11h, managers) ── */}
      {isManager && deadline.minutesLeft !== null && deadline.minutesLeft > 0 && (
        <button
          onClick={() => setView("commande")}
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: 12,
            padding: "12px 14px", marginBottom: 16, borderRadius: 14,
            background: deadline.minutesLeft <= 30 ? "rgba(200,60,60,0.08)" : "rgba(212,160,74,0.08)",
            border: `1px solid ${deadline.minutesLeft <= 30 ? "rgba(200,60,60,0.25)" : "rgba(212,160,74,0.25)"}`,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <Clock size={18} style={{ color: deadline.minutesLeft <= 30 ? "var(--danger)" : "var(--warning)", flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              Commande France Boissons — deadline 11h ({formatMinutesLeft(deadline.minutesLeft)})
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
              {deadline.label}
            </div>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 600, color: "#fff",
            background: deadline.minutesLeft <= 30 ? "var(--danger)" : "var(--warning)",
            padding: "4px 10px", borderRadius: 8, flexShrink: 0,
          }}>
            Préparer
          </span>
        </button>
      )}

      {/* ── Tabs (manager only sees all 3) ───────────────── */}
      {isManager ? (
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--secondary-bg)", borderRadius: 14, padding: 4 }}>
          {([
            { key: "signal" as View, label: "Signaler", icon: <Bell size={14} /> },
            { key: "inventaire" as View, label: "Inventaire", icon: <ClipboardList size={14} /> },
            { key: "commande" as View, label: "Commande", icon: <ShoppingCart size={14} /> },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                borderRadius: 10, padding: "10px 0", border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 500,
                background: view === t.key ? "var(--card-bg)" : "transparent",
                color: view === t.key ? "var(--text-primary)" : "var(--text-tertiary)",
                boxShadow: view === t.key ? "var(--shadow-light)" : "none",
                transition: "all 0.2s",
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {/* ═══════════════════════════════════════════════════ */}
      {/* SIGNAL VIEW (everyone)                             */}
      {/* ═══════════════════════════════════════════════════ */}
      {(view === "signal" || !isManager) && (
        <div>
          {/* Search bar */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%", borderRadius: 14, border: "1px solid var(--border-color)",
                background: "var(--input-bg)", padding: "12px 14px 12px 40px", fontSize: 15,
                color: "var(--text-primary)", outline: "none",
              }}
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={16} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}
          </div>

          {/* Search results */}
          {searchResults.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              {searchResults.map((p) => {
                const alreadyFlagged = alertedProductIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => !alreadyFlagged && sendAlert(p.id)}
                    disabled={alreadyFlagged}
                    className="card-light"
                    style={{
                      width: "100%", textAlign: "left", cursor: alreadyFlagged ? "default" : "pointer",
                      padding: "12px 14px", border: "none",
                      display: "flex", alignItems: "center", gap: 12,
                      opacity: alreadyFlagged ? 0.5 : 1,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "var(--text-primary)" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{CATEGORY_LABELS[p.category]}</div>
                    </div>
                    {alreadyFlagged ? (
                      <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Déjà signalé</span>
                    ) : (
                      <div style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "6px 14px", borderRadius: 10,
                        background: "rgba(212,160,74,0.1)", color: "var(--warning)", fontSize: 13, fontWeight: 600,
                      }}>
                        <Bell size={14} /> Signaler
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Active alerts */}
          {alerts.length > 0 && (
            <div style={{ marginBottom: search ? 0 : 16 }}>
              <p className="section-label" style={{ marginBottom: 8 }}>
                Signalés ({alerts.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {alerts.map((a) => {
                  const prod = products.find((p) => p.id === a.product_id);
                  const time = new Date(a.created_at);
                  const timeStr = `${time.getHours()}h${String(time.getMinutes()).padStart(2, "0")}`;
                  return (
                    <div key={a.id} className="card-medium" style={{
                      padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
                      borderLeft: "3px solid var(--warning)",
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                          {prod?.name || "Produit"}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          {profileMap[a.created_by] || "Staff"} · {timeStr}
                        </div>
                      </div>
                      {isManager && (
                        <button onClick={() => acknowledgeAlert(a.id)} style={{
                          padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                          background: "var(--secondary-bg)", fontSize: 11, color: "var(--text-secondary)",
                          display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <Check size={12} /> OK
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {alerts.length === 0 && !search && (
            <div className="card-light" style={{ padding: 32, textAlign: "center" }}>
              <Bell size={28} style={{ color: "var(--text-tertiary)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Rien à signaler</p>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>
                Recherche un produit pour le signaler comme manquant
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* INVENTAIRE (manager only)                          */}
      {/* ═══════════════════════════════════════════════════ */}
      {view === "inventaire" && isManager && (() => {
        const alertedInv = new Set(alerts.map((a) => a.product_id));
        const q = invSearch.toLowerCase();
        const filteredGrouped = q
          ? grouped.map((g) => ({
              ...g,
              items: g.items.filter((p) => p.name.toLowerCase().includes(q)),
            })).filter((g) => g.items.length > 0)
          : grouped;

        return (
        <div>
          {/* Search */}
          <div style={{ position: "relative", marginBottom: 16 }}>
            <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-tertiary)" }} />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={invSearch}
              onChange={(e) => setInvSearch(e.target.value)}
              style={{
                width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                background: "var(--input-bg)", padding: "10px 14px 10px 36px", fontSize: 14,
                color: "var(--text-primary)", outline: "none",
              }}
            />
            {invSearch && (
              <button onClick={() => setInvSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <X size={14} style={{ color: "var(--text-tertiary)" }} />
              </button>
            )}
          </div>

          {filteredGrouped.length === 0 && (
            <div className="card-light" style={{ padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Aucun produit trouvé</p>
            </div>
          )}

          {filteredGrouped.map((g) => {
            // Auto-expand when searching, otherwise respect user's toggle
            const isCollapsed = q ? false : collapsedCats.has(g.cat);
            const lowCount = g.items.filter((p) => stockStatus(p) !== "ok").length;
            const flaggedCount = g.items.filter((p) => alertedInv.has(p.id)).length;
            return (
            <div key={g.cat} style={{ marginBottom: 12 }}>
              <button
                onClick={() => toggleCat(g.cat)}
                style={{
                  width: "100%", background: "none", border: "none", cursor: "pointer",
                  padding: "6px 4px", display: "flex", alignItems: "center", gap: 8,
                  marginBottom: isCollapsed ? 0 : 6,
                }}
              >
                <ChevronDown size={13} style={{
                  color: "var(--text-tertiary)",
                  transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                }} />
                <span className="section-label" style={{ margin: 0 }}>{g.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", marginLeft: "auto" }}>
                  {g.items.length}
                </span>
                {lowCount > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 600, color: "var(--warning)", background: "rgba(212,160,74,0.1)", padding: "1px 6px", borderRadius: 4 }}>
                    {lowCount} bas
                  </span>
                )}
                {flaggedCount > 0 && (
                  <Bell size={11} style={{ color: "var(--warning)" }} />
                )}
              </button>
              {!isCollapsed && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {g.items.map((p) => {
                  const isCounting = countingId === p.id;
                  const status = stockStatus(p);
                  const isFlagged = alertedInv.has(p.id);
                  return (
                    <div key={p.id}>
                      <button
                        onClick={() => {
                          if (isCounting) { setCountingId(null); return; }
                          setCountingId(p.id);
                          setCountValue(String(p.current_stock));
                        }}
                        className="card-light"
                        style={{
                          width: "100%", textAlign: "left", cursor: "pointer",
                          padding: "10px 14px", border: "none",
                          display: "flex", alignItems: "center", gap: 10,
                          borderRadius: isCounting ? "14px 14px 0 0" : 14,
                          borderLeft: isFlagged ? "3px solid var(--warning)" : undefined,
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: statusDot[status], flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{p.name}</span>
                        {isFlagged && <Bell size={12} style={{ color: "var(--warning)" }} />}
                        <span style={{ fontSize: 15, fontWeight: 700, color: statusDot[status] }}>{p.current_stock}</span>
                      </button>

                      {isCounting && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "10px 14px",
                          background: "var(--secondary-bg)", borderRadius: "0 0 14px 14px",
                        }}>
                          <button
                            onClick={() => setCountValue(String(Math.max(0, (parseFloat(countValue) || 0) - 1)))}
                            style={{ width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer", background: "var(--card-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Minus size={18} style={{ color: "var(--text-secondary)" }} />
                          </button>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={countValue}
                            onChange={(e) => setCountValue(e.target.value)}
                            autoFocus
                            style={{
                              flex: 1, textAlign: "center", fontSize: 24, fontWeight: 700,
                              borderRadius: 12, border: "1px solid var(--border-color)",
                              background: "var(--card-bg)", padding: "6px 0",
                              color: "var(--text-primary)", outline: "none",
                            }}
                          />
                          <button
                            onClick={() => setCountValue(String((parseFloat(countValue) || 0) + 1))}
                            style={{ width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer", background: "var(--card-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Plus size={18} style={{ color: "var(--text-secondary)" }} />
                          </button>
                          <button
                            onClick={() => saveCount(p.id)}
                            disabled={saving}
                            style={{ width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer", background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            <Check size={18} style={{ color: "#fff" }} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              )}
            </div>
            );
          })}
        </div>
        );
      })()}

      {/* ═══ COMMANDE ═══════════════════════════════════ */}
      {view === "commande" && isManager && (() => {
        // Products to order: below min_stock OR flagged OR manually added
        const alertedIds = new Set(alerts.map((a) => a.product_id));
        const toOrder = visibleProducts.filter((p) =>
          stockStatus(p) !== "ok" || alertedIds.has(p.id) || manualProductIds.has(p.id)
        );
        // Ensure quantity defaults
        const getQty = (p: StockProduct) => orderQuantities[p.id] ?? Math.max(p.min_stock - p.current_stock, p.min_stock);
        // Products that can be added manually (not already in order)
        const orderIds = new Set(toOrder.map((p) => p.id));
        const availableToAdd = visibleProducts.filter((p) => !orderIds.has(p.id));

        const byCategory = CATEGORY_ORDER
          .map((cat) => ({ cat, label: CATEGORY_LABELS[cat], items: toOrder.filter((p) => p.category === cat) }))
          .filter((g) => g.items.length > 0);

        function buildOrderText(): string {
          const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
          const domainLabel = profile?.role === "responsable" && profile.stock_domain
            ? getDomainLabel(profile.stock_domain)
            : "Boissons & Vins";
          let txt = `Commande Le Hive — ${domainLabel}\n${today}\n\n`;
          byCategory.forEach((g) => {
            txt += `${g.label.toUpperCase()}\n`;
            g.items.forEach((p) => {
              const qty = getQty(p);
              txt += `- ${p.name}: ${qty} ${p.unit}${qty > 1 ? "s" : ""}`;
              if (p.bottle_size) txt += ` (${p.bottle_size})`;
              txt += `\n`;
            });
            txt += "\n";
          });
          txt += `Total: ${toOrder.length} référence${toOrder.length > 1 ? "s" : ""}\n`;
          return txt;
        }

        async function copyOrder() {
          const text = buildOrderText();
          try {
            await navigator.clipboard.writeText(text);
            toast.success("Liste copiée — prête à coller dans un mail");
          } catch {
            toast.error("Impossible de copier");
          }
        }

        function sendByEmail() {
          const text = buildOrderText();
          const subject = encodeURIComponent(`Commande Le Hive — ${new Date().toLocaleDateString("fr-FR")}`);
          const body = encodeURIComponent(text);
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }

        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* FB deadline */}
            <div className="card-medium" style={{
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 10,
              borderLeft: deadline.urgent ? "3px solid var(--danger)" : "3px solid var(--terra-medium)",
            }}>
              <Clock size={16} style={{ color: deadline.urgent ? "var(--danger)" : "var(--terra-medium)", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: deadline.urgent ? "var(--danger)" : "var(--text-primary)" }}>
                  Prochaine commande FB
                </div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{deadline.label}</div>
              </div>
            </div>

            {toOrder.length === 0 ? (
              <div className="card-light" style={{ padding: 32, textAlign: "center" }}>
                <Package size={28} style={{ color: "var(--text-tertiary)", margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Rien à commander</p>
                <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>Tout est en stock</p>
              </div>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="section-label">À commander ({toOrder.length})</p>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>Ajuste les quantités</span>
                </div>

                {byCategory.map((g) => (
                  <div key={g.cat}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                      {g.label}
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {g.items.map((p) => {
                        const qty = getQty(p);
                        const isAlerted = alertedIds.has(p.id);
                        const isManual = manualProductIds.has(p.id);
                        return (
                          <div key={p.id} className="card-light" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                                {p.name}
                                {isAlerted && <Bell size={11} style={{ color: "var(--warning)" }} />}
                                {isManual && !isAlerted && stockStatus(p) === "ok" && (
                                  <span style={{ fontSize: 9, fontWeight: 600, color: "var(--terra-medium)", background: "rgba(196,120,90,0.1)", padding: "1px 6px", borderRadius: 4 }}>AJOUTÉ</span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                                Stock: {p.current_stock} · min. {p.min_stock}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <button
                                onClick={() => updateQty(p.id, Math.max(1, qty - 1))}
                                style={{ width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer", background: "var(--secondary-bg)", fontSize: 16 }}
                              >−</button>
                              <input
                                type="number"
                                value={qty}
                                onChange={(e) => updateQty(p.id, Math.max(1, parseInt(e.target.value) || 1))}
                                style={{
                                  width: 44, textAlign: "center", fontSize: 14, fontWeight: 600,
                                  borderRadius: 8, border: "1px solid var(--border-color)",
                                  background: "var(--card-bg)", padding: "4px 0", color: "var(--text-primary)", outline: "none",
                                }}
                              />
                              <button
                                onClick={() => updateQty(p.id, qty + 1)}
                                style={{ width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer", background: "var(--secondary-bg)", fontSize: 16 }}
                              >+</button>
                              {isManual && stockStatus(p) === "ok" && !isAlerted && (
                                <button
                                  onClick={() => removeManual(p.id)}
                                  style={{ width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer", background: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                                  title="Retirer de la commande"
                                >
                                  <X size={14} style={{ color: "var(--text-tertiary)" }} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Add a product manually */}
                <div>
                  {!showAddProduct ? (
                    <button
                      onClick={() => setShowAddProduct(true)}
                      style={{
                        width: "100%", padding: "12px 0", borderRadius: 12,
                        border: "1px dashed var(--border-color)", background: "transparent",
                        color: "var(--text-secondary)", fontSize: 13, fontWeight: 500,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <Plus size={14} /> Ajouter un produit
                    </button>
                  ) : (
                    <div className="card-light" style={{ padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Ajouter à la commande</span>
                        <button onClick={() => setShowAddProduct(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                          <X size={14} style={{ color: "var(--text-tertiary)" }} />
                        </button>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 200, overflowY: "auto" }}>
                        {availableToAdd.length === 0 ? (
                          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Tous les produits sont déjà dans la commande</span>
                        ) : (
                          availableToAdd.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => addManual(p.id)}
                              style={{
                                padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                                background: "var(--secondary-bg)", fontSize: 12, fontWeight: 500,
                                color: "var(--text-secondary)",
                              }}
                            >+ {p.name}</button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={copyOrder}
                    style={{
                      flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      padding: "14px 0", borderRadius: 14, border: "none", cursor: "pointer",
                      background: "var(--gradient-primary)", color: "#fff",
                      fontSize: 14, fontWeight: 600,
                    }}
                  >
                    <ClipboardList size={16} /> Copier la liste
                  </button>
                  <button
                    onClick={sendByEmail}
                    style={{
                      padding: "14px 18px", borderRadius: 14, border: "1px solid var(--border-color)", cursor: "pointer",
                      background: "var(--card-bg)", color: "var(--text-primary)",
                      fontSize: 14, fontWeight: 500,
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    ✉️ Mail
                  </button>
                </div>

                {/* Clear order */}
                <button
                  onClick={async () => {
                    const ok = await confirmDialog({
                      title: "Réinitialiser la commande ?",
                      message: "Tous les produits et quantités de la liste actuelle seront effacés.",
                      variant: "danger",
                      confirmLabel: "Réinitialiser",
                    });
                    if (ok) clearOrder();
                  }}
                  style={{
                    padding: "10px 0", background: "none", border: "none",
                    fontSize: 12, color: "var(--text-tertiary)", cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  Réinitialiser la liste
                </button>
              </>
            )}
          </div>
        );
      })()}

    </div>
  );
}
