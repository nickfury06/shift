"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { Profile, Role, StockDomain } from "@/lib/types";
import { Plus, X, KeyRound } from "lucide-react";

function generatePassword(): string {
  const words = ["soleil", "plage", "vague", "olive", "citron", "miel", "sable", "brise", "palme", "azur", "corail", "jasmin"];
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 99) + 1;
  return `${w1}-${w2}-${num}`;
}

export default function StaffPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  // Form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<Role>("staff");
  const [stockDomain, setStockDomain] = useState<StockDomain | "">("");

  useEffect(() => {
    if (profile && profile.role !== "patron") {
      router.push("/ce-soir");
      return;
    }

    async function load() {
      const { data } = await supabase.from("profiles").select("*").order("role").order("name");
      setStaffList(data || []);
      setLoading(false);
    }
    load();
  }, [profile, router, supabase]);

  async function createAccount() {
    if (!firstName.trim() || !lastName.trim()) return;

    const email = `${firstName.trim().toLowerCase()}.${lastName.trim().toLowerCase()}@lehive.staff`;
    const password = generatePassword();

    // Create auth user via Supabase admin (this requires service role in production)
    // For now, we'll use the client-side signUp which works for demo
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: `${firstName.trim()} ${lastName.trim()}`,
          role,
        },
      },
    });

    if (authError || !authData.user) {
      console.error("Error creating user:", authError?.message);
      return;
    }

    // Update profile with additional fields
    await supabase.from("profiles").update({
      name: `${firstName.trim()} ${lastName.trim()}`,
      role,
      stock_domain: role === "responsable" ? stockDomain || null : null,
      must_change_password: true,
    }).eq("id", authData.user.id);

    // Refresh list
    const { data } = await supabase.from("profiles").select("*").order("role").order("name");
    setStaffList(data || []);

    setCredentials({ email, password });
    setShowForm(false);
    setFirstName(""); setLastName(""); setRole("staff"); setStockDomain("");
  }

  async function resetPassword(userId: string) {
    const newPassword = generatePassword();
    // In production, use service role to reset
    // For demo, we'll just show the generated password
    setCredentials({ email: staffList.find((s) => s.id === userId)?.email || "", password: newPassword });

    await supabase.from("profiles").update({ must_change_password: true }).eq("id", userId);
  }

  if (loading) {
    return <div className="p-4 max-w-lg mx-auto space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-lg bg-card animate-pulse" />)}</div>;
  }

  if (!profile || profile.role !== "patron") return null;

  const roleLabel = (r: string) => r === "patron" ? "Patron" : r === "responsable" ? "Responsable" : "Staff";
  const roleBadgeVariant = (r: string) => r === "patron" ? "default" as const : r === "responsable" ? "secondary" as const : "outline" as const;

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Staff</h1>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus size={14} className="mr-1" /> Nouveau
        </Button>
      </div>

      {/* Credentials modal */}
      {credentials && (
        <div className="mb-4 p-4 rounded-lg glass-card border-2 border-primary">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium text-primary">Identifiants</h3>
            <button onClick={() => setCredentials(null)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <div className="space-y-1 text-sm">
            <p><strong>Email :</strong> {credentials.email}</p>
            <p><strong>Mot de passe :</strong> {credentials.password}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Note-le maintenant — il ne sera plus affiché.</p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-4 p-4 rounded-lg glass-card space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-sm">Nouveau compte</h3>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-muted-foreground" /></button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <Input placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as Role)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="responsable">Responsable</SelectItem>
              <SelectItem value="patron">Patron</SelectItem>
            </SelectContent>
          </Select>
          {role === "responsable" && (
            <Select value={stockDomain} onValueChange={(v) => setStockDomain(v as StockDomain)}>
              <SelectTrigger><SelectValue placeholder="Domaine stock" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="boissons">Boissons</SelectItem>
                <SelectItem value="vins">Vins</SelectItem>
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">
            Email auto : {firstName.trim().toLowerCase() || "prenom"}.{lastName.trim().toLowerCase() || "nom"}@lehive.staff
          </p>
          <Button className="w-full" onClick={createAccount} disabled={!firstName.trim() || !lastName.trim()}>
            Créer le compte
          </Button>
        </div>
      )}

      {/* Staff list */}
      <div className="space-y-2">
        {staffList.map((s) => (
          <div key={s.id} className="p-3 rounded-lg glass-card flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{s.name}</span>
                <Badge variant={roleBadgeVariant(s.role)} className="text-xs">{roleLabel(s.role)}</Badge>
                {s.stock_domain && <Badge variant="outline" className="text-xs">{s.stock_domain}</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{s.email}</p>
            </div>
            <button onClick={() => resetPassword(s.id)} className="p-1.5 rounded hover:bg-secondary" title="Reset mot de passe">
              <KeyRound size={14} className="text-muted-foreground" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
