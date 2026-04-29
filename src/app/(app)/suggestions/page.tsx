"use client";

/**
 * Boîte à idées — simple board where anyone can drop an idea for the
 * team. Categories double as filter tags. No status workflow, no
 * patron resolution actions — just a public lightweight wall of
 * suggestions, kept honest by author attribution + delete-own.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import { haptic } from "@/lib/haptics";
import type { Suggestion, SuggestionCategory, Profile } from "@/lib/types";
import { Lightbulb, Send, Trash2, Sparkles } from "lucide-react";
import EmptyState from "@/components/EmptyState";

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  service: "Service",
  menu: "Menu",
  organisation: "Organisation",
  autre: "Autre",
};

// Color tag per category — visual differentiation for the wall view
const CATEGORY_COLOR: Record<SuggestionCategory, string> = {
  service: "#C4785A",
  menu: "#D4A04A",
  organisation: "#8B5A40",
  autre: "#8A857E",
};

export default function SuggestionsPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const supabase = useRef(createClient()).current;

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // New suggestion form
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<SuggestionCategory>("service");
  const [submitting, setSubmitting] = useState(false);

  // Filter — by category only (no status workflow anymore)
  const [filter, setFilter] = useState<"all" | SuggestionCategory>("all");

  const isPatron = profile?.role === "patron";

  const fetchData = useCallback(async () => {
    const [{ data: sgs }, { data: profs }] = await Promise.all([
      supabase.from("suggestions").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id, name"),
    ]);
    setSuggestions((sgs as Suggestion[]) || []);
    const map: Record<string, string> = {};
    ((profs as Pick<Profile, "id" | "name">[]) || []).forEach((p) => { map[p.id] = p.name; });
    setProfiles(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel("suggestions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "suggestions" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, fetchData]);

  async function handleSubmit() {
    if (!content.trim() || !user || submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from("suggestions").insert({
      content: content.trim(),
      category,
      created_by: user.id,
    });
    setSubmitting(false);
    if (error) {
      // Surface the real reason so we can see RLS / constraint issues
      console.error("suggestions insert failed:", error);
      toast.error(`Erreur : ${error.message}`);
      haptic("error");
      return;
    }
    haptic("success");
    toast.success("Idée envoyée — merci !");
    setContent("");
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer cette idée ?",
      variant: "danger",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    const { error } = await supabase.from("suggestions").delete().eq("id", id);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success("Supprimée");
  }

  if (loading) {
    return (
      <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-light pulse" style={{ height: 80, borderRadius: 16, marginBottom: 10, opacity: 0.5 }} />
        ))}
      </div>
    );
  }

  const filtered = filter === "all" ? suggestions : suggestions.filter((s) => s.category === filter);

  return (
    <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: 0 }}>
            Boîte à idées
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
            Partage ce qu&apos;on pourrait améliorer.
          </p>
        </div>

        {/* New suggestion form */}
        <div className="card-medium" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={14} style={{ color: "var(--terra-medium)" }} />
            <span className="section-label">Nouvelle idée</span>
          </div>
          <textarea
            placeholder="Ex: ranger les sirops par fréquence d'utilisation, proposer un brunch le dimanche…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              borderRadius: 12,
              background: "var(--input-bg)",
              border: "1px solid var(--border-color)",
              padding: "12px 14px",
              fontSize: 14,
              color: "var(--text-primary)",
              outline: "none",
              resize: "none",
              minHeight: 80,
              fontFamily: "inherit",
            }}
          />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(Object.keys(CATEGORY_LABELS) as SuggestionCategory[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                style={{
                  padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontSize: 12, fontWeight: 500,
                  background: category === c ? CATEGORY_COLOR[c] : "var(--secondary-bg)",
                  color: category === c ? "#fff" : "var(--text-secondary)",
                }}
              >
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || submitting}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 16px", borderRadius: 12,
              background: "var(--gradient-primary)", color: "#fff", border: "none",
              cursor: !content.trim() || submitting ? "default" : "pointer",
              opacity: !content.trim() || submitting ? 0.5 : 1,
              fontSize: 14, fontWeight: 600, minHeight: 44,
            }}
          >
            <Send size={14} /> Envoyer
          </button>
        </div>

        {/* Filter pills — only categories now */}
        {suggestions.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              onClick={() => setFilter("all")}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 500,
                background: filter === "all" ? "var(--text-primary)" : "var(--secondary-bg)",
                color: filter === "all" ? "var(--bg)" : "var(--text-secondary)",
              }}
            >
              Tout ({suggestions.length})
            </button>
            {(Object.keys(CATEGORY_LABELS) as SuggestionCategory[]).map((c) => {
              const count = suggestions.filter((s) => s.category === c).length;
              if (count === 0) return null;
              return (
                <button
                  key={c}
                  onClick={() => setFilter(c)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                    fontSize: 12, fontWeight: 500,
                    background: filter === c ? CATEGORY_COLOR[c] : "var(--secondary-bg)",
                    color: filter === c ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {CATEGORY_LABELS[c]} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Lightbulb size={24} />}
              title="Aucune idée pour l'instant"
              message="Sois le premier·e à en partager une."
            />
          ) : filtered.map((s) => {
            const canDelete = s.created_by === user?.id || isPatron;
            const time = new Date(s.created_at);
            const dateStr = time.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
            const color = CATEGORY_COLOR[s.category];
            return (
              <div
                key={s.id}
                className="card-light"
                style={{
                  padding: 14,
                  borderLeft: `3px solid ${color}`,
                  display: "flex", flexDirection: "column", gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color, textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    background: "var(--secondary-bg)", padding: "3px 8px", borderRadius: 6,
                  }}>
                    {CATEGORY_LABELS[s.category]}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {profiles[s.created_by] || "?"} · {dateStr}
                  </span>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(s.id)}
                      style={{
                        marginLeft: "auto", width: 26, height: 26, borderRadius: 6,
                        background: "none", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                      aria-label="Supprimer"
                    >
                      <Trash2 size={12} style={{ color: "var(--text-tertiary)" }} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5, whiteSpace: "pre-wrap", margin: 0 }}>
                  {s.content}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
