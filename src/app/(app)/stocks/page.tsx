"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getNow } from "@/lib/shift-utils";
import type { StockProduct, StockOrder, StockAlert, StockCategory } from "@/lib/types";
import { Search, AlertTriangle, Check, Plus, Minus, X, Bell, Truck, Clock, Package, ClipboardList, ShoppingCart } from "lucide-react";

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
function getNextDeadline(): { label: string; urgent: boolean } {
  const now = getNow();
  const day = now.getDay(); // 0=sun 1=mon 2=tue 3=wed 4=thu 5=fri 6=sat
  const hour = now.getHours();

  // Tue before 11h → deadline today
  if (day === 2 && hour < 11) return { label: "Aujourd'hui 11h → livré mercredi", urgent: true };
  // Thu before 11h → deadline today
  if (day === 4 && hour < 11) return { label: "Aujourd'hui 11h → livré vendredi", urgent: true };
  // After tue 11h, before thu 11h → next is thursday
  if ((day === 2 && hour >= 11) || day === 3 || (day === 4 && hour < 11))
    return { label: "Jeudi 11h → livré vendredi", urgent: day === 3 };
  // After thu 11h through monday → next is tuesday
  return { label: "Mardi 11h → livré mercredi", urgent: day === 1 };
}

type View = "signal" | "inventaire" | "commande";

export default function StocksPage() {
  const { profile, user } = useAuth();
  const supabase = useRef(createClient()).current;
  const isManager = profile?.role === "patron" || profile?.role === "responsable";

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("signal");
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");

  // Inventory
  const [countingId, setCountingId] = useState<string | null>(null);
  const [countValue, setCountValue] = useState("");
  const [saving, setSaving] = useState(false);

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
  const visibleProducts = profile?.role === "responsable" && profile.stock_domain
    ? products.filter((p) => p.domain === profile.stock_domain)
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
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-light" style={{ height: 56, borderRadius: 16, marginBottom: 10, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 16 }}>
        Stocks
      </h1>

      {/* ── Tabs (manager only sees all 3) ───────────────── */}
      {isManager ? (
        <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--secondary-bg)", borderRadius: 14, padding: 4 }}>
          {([
            { key: "signal" as View, label: "Signaler", icon: <Bell size={14} /> },
            { key: "inventaire" as View, label: "Inventaire", icon: <ClipboardList size={14} /> },
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
      {view === "inventaire" && isManager && (
        <div>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>
            Tap un produit, ajuste le stock.
          </p>
          {grouped.map((g) => (
            <div key={g.cat} style={{ marginBottom: 20 }}>
              <p className="section-label" style={{ marginBottom: 8 }}>{g.label}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {g.items.map((p) => {
                  const isCounting = countingId === p.id;
                  const status = stockStatus(p);
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
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: 4, background: statusDot[status], flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{p.name}</span>
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
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
