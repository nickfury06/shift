"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { StockProduct, StockOrder, StockAlert, StockCategory, StockDomain } from "@/lib/types";
import { Plus, Package, AlertTriangle, X, ClipboardList, ShoppingCart, Search, Bell, Check, Trash2 } from "lucide-react";

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
  "spiritueux", "sirops_cocktails", "bieres", "vins", "champagnes", "softs", "consommables",
];

type StockMode = "default" | "commander" | "inventaire";

export default function StocksPage() {
  const { profile, user } = useAuth();
  const supabase = createClient();

  const [products, setProducts] = useState<StockProduct[]>([]);
  const [orders, setOrders] = useState<StockOrder[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // UI state
  const [mode, setMode] = useState<StockMode>("default");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<StockCategory | "all">("all");
  const [showAddForm, setShowAddForm] = useState(false);

  // Add product form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<StockCategory>("spiritueux");
  const [newDomain, setNewDomain] = useState<StockDomain>("boissons");
  const [newMinStock, setNewMinStock] = useState("1");
  const [newBottleSize, setNewBottleSize] = useState("");
  const [newCostPrice, setNewCostPrice] = useState("");
  const [newSupplier, setNewSupplier] = useState("");
  const [addedCount, setAddedCount] = useState(0);

  // Inventory state
  const [inventoryCounted, setInventoryCounted] = useState<Set<string>>(new Set());
  const inventoryRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Alert sent confirmation
  const [alertSentId, setAlertSentId] = useState<string | null>(null);

  const isResponsable = profile?.role === "responsable";
  const isPatron = profile?.role === "patron";
  const canManageStock = isResponsable || isPatron;
  const domainFilter = isResponsable ? profile?.stock_domain : null;

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [{ data: prods }, { data: ords }, { data: alrts }, { data: profs }] = await Promise.all([
        supabase.from("stock_products").select("*").order("category").order("name"),
        supabase.from("stock_orders").select("*").in("status", ["pending", "ordered"]).order("created_at", { ascending: false }),
        supabase.from("stock_alerts").select("*").eq("acknowledged", false).order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, name"),
      ]);
      setProducts(prods || []);
      setOrders(ords || []);
      setAlerts(alrts || []);
      const map: Record<string, string> = {};
      profs?.forEach((p: { id: string; name: string }) => { map[p.id] = p.name; });
      setProfilesMap(map);
      setLoading(false);
    }
    load();
  }, [user, supabase]);

  // Filtered products
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (domainFilter && p.domain !== domainFilter) return false;
      if (filterCategory !== "all" && p.category !== filterCategory) return false;
      if (searchQuery) {
        return p.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });
  }, [products, domainFilter, filterCategory, searchQuery]);

  const lowStockProducts = products.filter((p) => p.current_stock <= p.min_stock && (!domainFilter || p.domain === domainFilter));
  const pendingOrders = orders.filter((o) => o.status === "pending");
  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged);

  // ============================================================
  // Actions
  // ============================================================

  // Commander: add product to order list
  async function addToOrder(productId: string, quantity: number | null) {
    if (!user) return;
    const existing = orders.find((o) => o.product_id === productId && o.status === "pending");
    if (existing) {
      const { data } = await supabase.from("stock_orders").update({ quantity_needed: quantity }).eq("id", existing.id).select().single();
      if (data) setOrders((prev) => prev.map((o) => o.id === existing.id ? data : o));
    } else {
      const { data } = await supabase.from("stock_orders").insert({
        product_id: productId, quantity_needed: quantity, status: "pending", created_by: user.id,
      }).select().single();
      if (data) setOrders((prev) => [...prev, data]);
    }
  }

  async function removeFromOrder(productId: string) {
    const existing = orders.find((o) => o.product_id === productId && o.status === "pending");
    if (existing) {
      await supabase.from("stock_orders").delete().eq("id", existing.id);
      setOrders((prev) => prev.filter((o) => o.id !== existing.id));
    }
  }

  async function markOrdered() {
    const pendingIds = pendingOrders.map((o) => o.id);
    if (pendingIds.length === 0) return;
    await supabase.from("stock_orders").update({ status: "ordered" }).in("id", pendingIds);
    setOrders((prev) => prev.map((o) => pendingIds.includes(o.id) ? { ...o, status: "ordered" as const } : o));
  }

  // Inventaire: save count for one product
  async function saveInventoryCount(productId: string, value: number) {
    if (!user) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    await supabase.from("stock_movements").insert({
      product_id: productId, type: "inventory", quantity: value - product.current_stock, created_by: user.id,
    });

    const { data } = await supabase.from("stock_products").update({ current_stock: value }).eq("id", productId).select().single();
    if (data) {
      setProducts((prev) => prev.map((p) => p.id === productId ? data : p));
      setInventoryCounted((prev) => new Set([...prev, productId]));
    }
  }

  function handleInventoryKeyDown(e: React.KeyboardEvent<HTMLInputElement>, productId: string, index: number) {
    if (e.key === "Enter") {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val) && val >= 0) saveInventoryCount(productId, val);
      // Auto-advance to next product
      const nextProduct = filtered[index + 1];
      if (nextProduct) {
        const nextRef = inventoryRefs.current[nextProduct.id];
        if (nextRef) nextRef.focus();
      }
    }
  }

  // Signaler: staff flags a product as low
  async function sendAlert(productId: string) {
    if (!user) return;
    const product = products.find((p) => p.id === productId);
    await supabase.from("stock_alerts").insert({
      product_id: productId, message: `${product?.name} presque vide`, created_by: user.id,
    });
    setAlertSentId(productId);
    setTimeout(() => setAlertSentId(null), 3000);
    if (navigator.vibrate) navigator.vibrate(50);
  }

  // Acknowledge alert (responsable/patron)
  async function acknowledgeAlert(alertId: string) {
    await supabase.from("stock_alerts").update({ acknowledged: true }).eq("id", alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }

  // Add product
  async function addProduct() {
    if (!newName.trim() || !user) return;
    const domain = isResponsable && profile?.stock_domain ? profile.stock_domain : newDomain;
    const { data } = await supabase.from("stock_products").insert({
      name: newName.trim(),
      category: newCategory,
      domain,
      min_stock: parseFloat(newMinStock) || 1,
      current_stock: 0,
      bottle_size: newBottleSize.trim() || null,
      cost_price: newCostPrice ? parseFloat(newCostPrice) : null,
      supplier: newSupplier.trim() || null,
    }).select().single();
    if (data) setProducts((prev) => [...prev, data]);
    setNewName(""); // Only clear name — keep category, domain, supplier, size for batch entry
    setAddedCount((c) => c + 1);
  }

  async function deleteProduct(id: string) {
    await supabase.from("stock_movements").delete().eq("product_id", id);
    await supabase.from("stock_orders").delete().eq("product_id", id);
    await supabase.from("stock_alerts").delete().eq("product_id", id);
    await supabase.from("stock_products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }

  if (loading) {
    return <div className="p-4 max-w-lg mx-auto space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 rounded-lg bg-card animate-pulse" />)}</div>;
  }

  if (!profile) return null;

  const inventoryProgress = `${inventoryCounted.size}/${filtered.length}`;

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Stocks</h1>
        <div className="flex gap-1.5">
          {canManageStock && (
            <>
              <Button
                size="sm"
                variant={mode === "commander" ? "default" : "secondary"}
                onClick={() => setMode(mode === "commander" ? "default" : "commander")}
              >
                <ShoppingCart size={14} className="mr-1" />
                {pendingOrders.length > 0 && <span className="mr-1">({pendingOrders.length})</span>}
                Commander
              </Button>
              <Button
                size="sm"
                variant={mode === "inventaire" ? "default" : "secondary"}
                onClick={() => { setMode(mode === "inventaire" ? "default" : "inventaire"); setInventoryCounted(new Set()); }}
              >
                <ClipboardList size={14} className="mr-1" />
                Inventaire
              </Button>
            </>
          )}
          {canManageStock && mode === "default" && (
            <Button size="sm" variant="secondary" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Unacknowledged alerts (responsable/patron) */}
      {canManageStock && unacknowledgedAlerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {unacknowledgedAlerts.map((a) => (
            <div key={a.id} className="p-3 rounded-lg glass-card border-l-[3px] border-l-warning flex justify-between items-center">
              <div>
                <p className="text-sm font-medium flex items-center gap-1.5">
                  <Bell size={14} className="text-warning" />
                  {a.message || products.find((p) => p.id === a.product_id)?.name}
                </p>
                <p className="text-xs text-muted-foreground">Signalé par {profilesMap[a.created_by] || "?"}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => acknowledgeAlert(a.id)}>
                <Check size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Low stock warning */}
      {lowStockProducts.length > 0 && mode === "default" && (
        <div className="mb-4 p-3 rounded-lg glass-card border-l-[3px] border-l-warning">
          <p className="text-sm flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-warning" />
            <span className="font-medium">{lowStockProducts.length} produit{lowStockProducts.length > 1 ? "s" : ""} en stock bas</span>
          </p>
        </div>
      )}

      {/* Commander mode: order summary */}
      {mode === "commander" && pendingOrders.length > 0 && (
        <div className="mb-4 p-4 rounded-lg glass-card border border-primary/20">
          <h3 className="text-sm font-medium mb-2">Liste de commande ({pendingOrders.length})</h3>
          <div className="space-y-1 mb-3">
            {pendingOrders.map((o) => {
              const prod = products.find((p) => p.id === o.product_id);
              return (
                <div key={o.id} className="flex justify-between text-sm">
                  <span>{prod?.name}</span>
                  <span className="text-primary font-medium">{o.quantity_needed || "?"}</span>
                </div>
              );
            })}
          </div>
          <Button className="w-full" onClick={markOrdered}>
            <Check size={14} className="mr-1" /> Commande passée
          </Button>
        </div>
      )}

      {/* Inventaire mode: progress */}
      {mode === "inventaire" && (
        <div className="mb-4 p-3 rounded-lg glass-card">
          <p className="text-sm text-muted-foreground">
            Progression : <span className="font-bold text-foreground">{inventoryProgress}</span> comptés
          </p>
        </div>
      )}

      {/* Search bar */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X size={14} className="text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        <button
          onClick={() => setFilterCategory("all")}
          className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
          style={{
            background: filterCategory === "all" ? "var(--color-primary)" : "var(--color-secondary)",
            color: filterCategory === "all" ? "var(--color-primary-foreground)" : "var(--color-foreground)",
          }}
        >
          Tout ({filtered.length})
        </button>
        {CATEGORY_ORDER.map((cat) => {
          const count = products.filter((p) => p.category === cat && (!domainFilter || p.domain === domainFilter)).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}
              className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
              style={{
                background: filterCategory === cat ? "var(--color-primary)" : "var(--color-secondary)",
                color: filterCategory === cat ? "var(--color-primary-foreground)" : "var(--color-foreground)",
              }}
            >
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Add product form */}
      {showAddForm && canManageStock && (
        <div className="mb-4 p-4 rounded-lg glass-card space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-sm">Nouveau produit {addedCount > 0 && <span className="text-muted-foreground">({addedCount} ajoutés)</span>}</h3>
            <button onClick={() => { setShowAddForm(false); setAddedCount(0); }}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <Input placeholder="Nom du produit" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
          <Select value={newCategory} onValueChange={(v) => setNewCategory(v as StockCategory)}>
            <SelectTrigger><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              {CATEGORY_ORDER.map((cat) => <SelectItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</SelectItem>)}
            </SelectContent>
          </Select>
          {isPatron && (
            <Select value={newDomain} onValueChange={(v) => setNewDomain(v as StockDomain)}>
              <SelectTrigger><SelectValue placeholder="Domaine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="boissons">Boissons (Benjamin)</SelectItem>
                <SelectItem value="vins">Vins (Maxime)</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Contenance (70cl, 33cl...)" value={newBottleSize} onChange={(e) => setNewBottleSize(e.target.value)} />
            <Input type="number" min="0" step="0.5" value={newMinStock} onChange={(e) => setNewMinStock(e.target.value)} placeholder="Stock min alerte" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Fournisseur" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} />
            <Input type="number" min="0" step="0.01" placeholder="Prix d'achat (€)" value={newCostPrice} onChange={(e) => setNewCostPrice(e.target.value)} />
          </div>
          <Button className="w-full" onClick={addProduct} disabled={!newName.trim()}>Ajouter et continuer</Button>
        </div>
      )}

      {/* Product list */}
      <div className="space-y-2">
        {filtered.map((product, index) => {
          const isLow = product.current_stock <= product.min_stock;
          const pendingOrder = orders.find((o) => o.product_id === product.id && o.status === "pending");
          const isCounted = inventoryCounted.has(product.id);
          const isAlertSent = alertSentId === product.id;

          return (
            <div
              key={product.id}
              className={`p-3 rounded-lg glass-card transition-all ${isLow && mode === "default" ? "border-l-[3px] border-l-warning" : ""} ${isCounted ? "border-l-[3px] border-l-success" : ""} ${isAlertSent ? "ring-2 ring-success/50" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{product.name}</span>
                    {product.bottle_size && <span className="text-xs text-muted-foreground">{product.bottle_size}</span>}
                    <Badge variant="secondary" className="text-xs flex-shrink-0">{CATEGORY_LABELS[product.category]}</Badge>
                  </div>
                  {mode !== "inventaire" && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-lg font-bold" style={{ color: isLow ? "var(--color-warning)" : "var(--color-foreground)" }}>
                        {product.current_stock % 1 === 0 ? product.current_stock : product.current_stock.toFixed(2)}
                      </span>
                      <span className="text-xs text-muted-foreground">{product.unit}{product.current_stock !== 1 ? "s" : ""}</span>
                      {isLow && <AlertTriangle size={12} className="text-warning" />}
                      {mode === "commander" && product.supplier && <span className="text-xs text-muted-foreground">· {product.supplier}</span>}
                      {isPatron && product.cost_price && <span className="text-xs text-muted-foreground">· {product.cost_price}€</span>}
                    </div>
                  )}
                </div>

                {/* Default mode: Signaler button (staff) + delete (patron) */}
                {mode === "default" && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-11 px-3"
                      onClick={() => sendAlert(product.id)}
                    >
                      {isAlertSent ? <><Check size={14} className="mr-1" />Signalé</> : <><Bell size={14} className="mr-1" />Signaler</>}
                    </Button>
                    {isPatron && (
                      <Button size="sm" variant="secondary" className="h-11 w-11 p-0 text-destructive" onClick={() => deleteProduct(product.id)}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                )}

                {/* Commander mode: toggle "à commander" */}
                {mode === "commander" && canManageStock && (
                  <div className="flex items-center gap-1">
                    {pendingOrder ? (
                      <>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          defaultValue={pendingOrder.quantity_needed || ""}
                          key={`order-${pendingOrder.id}`}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val) && val > 0) addToOrder(product.id, val);
                          }}
                          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                          placeholder="Qté"
                          className="w-16 h-11 text-center text-sm font-bold rounded-lg border border-primary bg-secondary"
                        />
                        <Button size="sm" variant="secondary" className="h-11 w-11 p-0" onClick={() => removeFromOrder(product.id)}>
                          <X size={14} />
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" className="h-11" onClick={() => addToOrder(product.id, null)}>
                        <ShoppingCart size={14} className="mr-1" /> À commander
                      </Button>
                    )}
                  </div>
                )}

                {/* Inventaire mode: single number input */}
                {mode === "inventaire" && canManageStock && (
                  <div className="flex items-center gap-1">
                    <input
                      ref={(el) => { inventoryRefs.current[product.id] = el; }}
                      type="number"
                      min="0"
                      step="0.25"
                      defaultValue={product.current_stock}
                      key={`inv-${product.id}-${product.current_stock}`}
                      onKeyDown={(e) => handleInventoryKeyDown(e, product.id, index)}
                      onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val >= 0 && val !== product.current_stock) {
                          saveInventoryCount(product.id, val);
                        }
                      }}
                      className={`w-20 h-11 text-center text-sm font-bold rounded-lg border bg-secondary ${isCounted ? "border-success" : "border-border"}`}
                    />
                    {isCounted && <Check size={16} className="text-success flex-shrink-0" />}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <Package size={32} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {searchQuery ? `Aucun produit pour "${searchQuery}"` : products.length === 0 ? "Aucun produit — ajoute tes premières bouteilles" : "Aucun produit pour ces filtres"}
          </p>
        </div>
      )}
    </div>
  );
}
