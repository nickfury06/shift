"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import type { StockProduct, StockOrder, StockAlert, StockCategory } from "@/lib/types";
import { Package, ClipboardList, ShoppingCart, AlertTriangle, Check, Plus, Minus, X, Bell, Truck } from "lucide-react";

const CATEGORY_LABELS: Record<StockCategory, string> = {
  spiritueux: "Spiritueux",
  sirops_cocktails: "Sirops & Cocktails",
  bieres: "Bières",
  vins: "Vins",
  champagnes: "Champagnes",
  softs: "Softs & Sans alcool",
  consommables: "Consommables",
};

const CATEGORY_ORDER: StockCategory[] = [
  "spiritueux", "sirops_cocktails", "bieres", "softs", "vins", "champagnes", "consommables",
];

type Tab = "produits" | "inventaire" | "commandes";

export default function StocksPage() {
  const { profile, user } = useAuth();
  const supabase = useRef(createClient()).current;
  const isManager = profile?.role === "patron" || profile?.role === "responsable";

  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("produits");
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});

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
    const ch = supabase
      .channel("stocks-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_products" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_orders" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_alerts" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, fetchData]);

  function stockStatus(p: StockProduct): "ok" | "low" | "critical" {
    if (p.current_stock <= 0) return "critical";
    if (p.current_stock <= p.min_stock) return "low";
    return "ok";
  }

  const statusColor = { ok: "#8B5A40", low: "var(--warning)", critical: "var(--danger)" };
  const statusBg = { ok: "rgba(139,90,64,0.08)", low: "rgba(212,160,74,0.1)", critical: "rgba(192,122,122,0.1)" };

  async function saveCount(productId: string) {
    if (!user || saving) return;
    const qty = parseFloat(countValue);
    if (isNaN(qty) || qty < 0) return;
    setSaving(true);
    await supabase.from("stock_products").update({ current_stock: qty }).eq("id", productId);
    await supabase.from("stock_movements").insert({
      product_id: productId,
      type: "inventory",
      quantity: qty,
      created_by: user.id,
    });
    setSaving(false);
    setCountingId(null);
    setCountValue("");
    fetchData();
  }

  async function sendAlert(productId: string) {
    if (!user) return;
    const product = products.find((p) => p.id === productId);
    await supabase.from("stock_alerts").insert({
      product_id: productId,
      message: `${product?.name} est bas`,
      created_by: user.id,
    });
    fetchData();
  }

  async function acknowledgeAlert(alertId: string) {
    await supabase.from("stock_alerts").update({ acknowledged: true }).eq("id", alertId);
    fetchData();
  }

  async function addToOrder(productId: string) {
    if (!user) return;
    if (orders.find((o) => o.product_id === productId)) return;
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

  const lowProducts = products.filter((p) => stockStatus(p) !== "ok");
  const orderProductIds = new Set(orders.map((o) => o.product_id));
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const orderedOrders = orders.filter((o) => o.status === "ordered");

  // Responsable sees only their domain
  const visibleProducts = profile?.role === "responsable" && profile.stock_domain
    ? products.filter((p) => p.domain === profile.stock_domain)
    : products;

  const groupedProducts = CATEGORY_ORDER
    .map((cat) => ({ category: cat, label: CATEGORY_LABELS[cat], items: visibleProducts.filter((p) => p.category === cat) }))
    .filter((g) => g.items.length > 0);

  if (loading) {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3, 4].map((i) => (
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

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 6 }}>
          {alerts.map((a) => {
            const prod = products.find((p) => p.id === a.product_id);
            return (
              <div key={a.id} className="card-medium" style={{
                padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
                borderLeft: "3px solid var(--warning)",
              }}>
                <AlertTriangle size={16} style={{ color: "var(--warning)", flexShrink: 0 }} />
                <div style={{ flex: 1, fontSize: 13, color: "var(--text-primary)" }}>
                  <span style={{ fontWeight: 500 }}>{prod?.name || "Produit"}</span>
                  <span style={{ color: "var(--text-secondary)" }}> — {profileMap[a.created_by] || "Staff"}</span>
                </div>
                {isManager && (
                  <button onClick={() => acknowledgeAlert(a.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                    <Check size={16} style={{ color: "var(--text-tertiary)" }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--secondary-bg)", borderRadius: 14, padding: 4 }}>
        {([
          { key: "produits" as Tab, label: "Produits", icon: <Package size={14} /> },
          { key: "inventaire" as Tab, label: "Inventaire", icon: <ClipboardList size={14} /> },
          { key: "commandes" as Tab, label: "Commandes", icon: <ShoppingCart size={14} />, badge: pendingOrders.length },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              borderRadius: 10, padding: "10px 0", border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500,
              background: tab === t.key ? "var(--card-bg)" : "transparent",
              color: tab === t.key ? "var(--text-primary)" : "var(--text-tertiary)",
              boxShadow: tab === t.key ? "var(--shadow-light)" : "none",
              transition: "all 0.2s",
            }}
          >
            {t.icon} {t.label}
            {t.badge ? (
              <span style={{
                fontSize: 10, fontWeight: 700, color: "#fff", background: "var(--terra-medium)",
                borderRadius: 8, padding: "1px 6px",
              }}>{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* ═══ PRODUITS ════════════════════════════════════ */}
      {tab === "produits" && groupedProducts.map((group) => (
        <div key={group.category} style={{ marginBottom: 24 }}>
          <p className="section-label" style={{ marginBottom: 8 }}>{group.label}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {group.items.map((p) => {
              const status = stockStatus(p);
              return (
                <div key={p.id} className="card-light" style={{
                  padding: "10px 14px", display: "flex", alignItems: "center", gap: 12,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: statusColor[status] }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                      min. {p.min_stock} {p.unit}{Number(p.min_stock) > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{
                    fontSize: 16, fontWeight: 700, color: statusColor[status],
                    background: statusBg[status], padding: "4px 10px", borderRadius: 8, minWidth: 40, textAlign: "center",
                  }}>
                    {p.current_stock}
                  </div>
                  <button onClick={() => sendAlert(p.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} title="Signaler">
                    <Bell size={14} style={{ color: "var(--text-tertiary)" }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* ═══ INVENTAIRE ══════════════════════════════════ */}
      {tab === "inventaire" && (
        <>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16 }}>
            Tap un produit pour compter le stock.
          </p>
          {groupedProducts.map((group) => (
            <div key={group.category} style={{ marginBottom: 24 }}>
              <p className="section-label" style={{ marginBottom: 8 }}>{group.label}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {group.items.map((p) => {
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
                          display: "flex", alignItems: "center", gap: 12,
                          borderRadius: isCounting ? "16px 16px 0 0" : 16,
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: 4, flexShrink: 0, background: statusColor[status] }} />
                        <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                          {p.name}
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 600, color: statusColor[status] }}>
                          {p.current_stock}
                        </span>
                      </button>

                      {isCounting && (
                        <div style={{
                          display: "flex", alignItems: "center", gap: 8, padding: "12px 14px",
                          background: "var(--secondary-bg)", borderRadius: "0 0 16px 16px",
                        }}>
                          <button
                            onClick={() => setCountValue(String(Math.max(0, (parseFloat(countValue) || 0) - 1)))}
                            style={{
                              width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer",
                              background: "var(--card-bg)", display: "flex", alignItems: "center", justifyContent: "center",
                            }}
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
                              background: "var(--card-bg)", padding: "8px 0",
                              color: "var(--text-primary)", outline: "none",
                            }}
                          />
                          <button
                            onClick={() => setCountValue(String((parseFloat(countValue) || 0) + 1))}
                            style={{
                              width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer",
                              background: "var(--card-bg)", display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <Plus size={18} style={{ color: "var(--text-secondary)" }} />
                          </button>
                          <button
                            onClick={() => saveCount(p.id)}
                            disabled={saving}
                            style={{
                              width: 44, height: 44, borderRadius: 12, border: "none", cursor: "pointer",
                              background: "var(--gradient-primary)", display: "flex", alignItems: "center", justifyContent: "center",
                            }}
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
        </>
      )}

      {/* ═══ COMMANDES ═══════════════════════════════════ */}
      {tab === "commandes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Auto-suggest low stock */}
          {lowProducts.filter((p) => !orderProductIds.has(p.id)).length > 0 && (
            <div>
              <p className="section-label" style={{ marginBottom: 8 }}>Stock bas — à commander ?</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {lowProducts.filter((p) => !orderProductIds.has(p.id)).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToOrder(p.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "6px 12px", borderRadius: 10, border: "1px dashed var(--warning)",
                      background: "rgba(212,160,74,0.06)", cursor: "pointer",
                      fontSize: 12, fontWeight: 500, color: "var(--warning)",
                    }}
                  >
                    <Plus size={12} /> {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pending orders */}
          {pendingOrders.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <p className="section-label">À commander</p>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{pendingOrders.length} produit{pendingOrders.length > 1 ? "s" : ""}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pendingOrders.map((o) => {
                  const prod = products.find((p) => p.id === o.product_id);
                  if (!prod) return null;
                  return (
                    <div key={o.id} className="card-light" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{prod.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                          Stock: {prod.current_stock} / min. {prod.min_stock}
                        </div>
                      </div>
                      {isManager && (
                        <button onClick={() => markOrdered(o.id)} style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                          background: "var(--gradient-primary)", fontSize: 11, fontWeight: 500, color: "#fff",
                        }}>
                          <Truck size={12} /> Commandé
                        </button>
                      )}
                      <button onClick={() => removeOrder(o.id)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                        <X size={14} style={{ color: "var(--text-tertiary)" }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ordered (waiting delivery) */}
          {orderedOrders.length > 0 && (
            <div>
              <p className="section-label" style={{ marginBottom: 8 }}>En attente de livraison</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {orderedOrders.map((o) => {
                  const prod = products.find((p) => p.id === o.product_id);
                  if (!prod) return null;
                  return (
                    <div key={o.id} className="card-light" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, opacity: 0.7 }}>
                      <Truck size={14} style={{ color: "var(--terra-medium)", flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{prod.name}</div>
                      {isManager && (
                        <button onClick={() => markReceived(o.id)} style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "6px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                          background: "var(--secondary-bg)", fontSize: 11, fontWeight: 500, color: "var(--text-secondary)",
                        }}>
                          <Check size={12} /> Reçu
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {orders.length === 0 && lowProducts.filter((p) => !orderProductIds.has(p.id)).length === 0 && (
            <div className="card-light" style={{ padding: 32, textAlign: "center" }}>
              <ShoppingCart size={28} style={{ color: "var(--text-tertiary)", margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Aucune commande en cours</p>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>Tout est en stock</p>
            </div>
          )}

          {/* Manual add */}
          {isManager && (
            <div>
              <p className="section-label" style={{ marginBottom: 8 }}>Ajouter manuellement</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 120, overflowY: "auto" }}>
                {visibleProducts.filter((p) => !orderProductIds.has(p.id)).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToOrder(p.id)}
                    style={{
                      padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: "var(--secondary-bg)", fontSize: 11, fontWeight: 500,
                      color: "var(--text-secondary)",
                    }}
                  >
                    + {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
