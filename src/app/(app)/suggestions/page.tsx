"use client";

/**
 * Suggestions — staff idea box.
 *
 * Anyone authenticated can drop a quick idea (categorized + free text).
 * Patron reviews and resolves on /admin (and here, with extra controls).
 * Read-open: full transparency on what's been suggested + the patron's
 * decisions, so the team learns from each call.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import { haptic } from "@/lib/haptics";
import type { Suggestion, SuggestionCategory, SuggestionStatus, Profile } from "@/lib/types";
import { Lightbulb, Send, Trash2, Check, X as XIcon, Sparkles } from "lucide-react";
import EmptyState from "@/components/EmptyState";

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  service: "Service",
  menu: "Menu",
  organisation: "Organisation",
  autre: "Autre",
};

const STATUS_LABELS: Record<SuggestionStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  rejected: "Refusée",
  implemented: "Mise en place",
};

const STATUS_COLOR: Record<SuggestionStatus, string> = {
  pending: "var(--text-tertiary)",
  accepted: "#8B5A40",
  rejected: "var(--danger)",
  implemented: "#6B4A30",
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

  // Filter
  const [filter, setFilter] = useState<"all" | SuggestionStatus>("all");

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
    if (error) { toast.error("Erreur, réessaie"); haptic("error"); return; }
    haptic("success");
    toast.success("Idée envoyée — merci !");
    setContent("");
  }

  async function setStatus(id: string, status: SuggestionStatus) {
    if (!user) return;
    haptic(status === "accepted" || status === "implemented" ? "success" : "medium");
    const { error } = await supabase.from("suggestions").update({
      status,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success(STATUS_LABELS[status]);
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

  const filtered = filter === "all" ? suggestions : suggestions.filter((s) => s.status === filter);
  const counts = {
    all: suggestions.length,
    pending: suggestions.filter((s) => s.status === "pending").length,
    accepted: suggestions.filter((s) => s.status === "accepted").length,
    implemented: suggestions.filter((s) => s.status === "implemented").length,
    rejected: suggestions.filter((s) => s.status === "rejected").length,
  };

  return (
    <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: 0 }}>
            Boîte à idées
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 4 }}>
            Partage ce qu&apos;on pourrait améliorer. Le patron lit tout.
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
                  background: category === c ? "var(--gradient-primary)" : "var(--secondary-bg)",
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
            <Send size={14} /> Envoyer l&apos;idée
          </button>
        </div>

        {/* Filter pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {([
            { key: "all" as const, label: `Tout (${counts.all})` },
            { key: "pending" as const, label: `En attente (${counts.pending})` },
            { key: "accepted" as const, label: `Acceptées (${counts.accepted})` },
            { key: "implemented" as const, label: `En place (${counts.implemented})` },
            { key: "rejected" as const, label: `Refusées (${counts.rejected})` },
          ]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 500,
                background: filter === f.key ? "var(--text-primary)" : "var(--secondary-bg)",
                color: filter === f.key ? "var(--bg)" : "var(--text-secondary)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.length === 0 ? (
            <EmptyState
              icon={<Lightbulb size={24} />}
              title={filter === "all" ? "Aucune idée pour l'instant" : `Aucune idée ${STATUS_LABELS[filter as SuggestionStatus].toLowerCase()}`}
              message="Sois le premier·e à en partager une."
            />
          ) : filtered.map((s) => {
            const canDelete = s.created_by === user?.id || isPatron;
            const time = new Date(s.created_at);
            const dateStr = time.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
            return (
              <div
                key={s.id}
                className="card-light"
                style={{
                  padding: 14,
                  borderLeft: `3px solid ${STATUS_COLOR[s.status]}`,
                  display: "flex", flexDirection: "column", gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: STATUS_COLOR[s.status],
                    textTransform: "uppercase", letterSpacing: "0.04em",
                    background: "var(--secondary-bg)", padding: "3px 8px", borderRadius: 6,
                  }}>
                    {STATUS_LABELS[s.status]}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    {CATEGORY_LABELS[s.category]}
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
                <p style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                  — {profiles[s.created_by] || "?"} · {dateStr}
                  {s.resolved_by && (
                    <> · résolu par {profiles[s.resolved_by] || "?"}</>
                  )}
                </p>

                {/* Patron actions on pending */}
                {isPatron && s.status === "pending" && (
                  <div style={{ display: "flex", gap: 6, paddingTop: 4, borderTop: "1px dashed var(--border-color)" }}>
                    <button
                      onClick={() => setStatus(s.id, "accepted")}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 600,
                        background: "rgba(139,90,64,0.12)", color: "#8B5A40",
                      }}
                    >
                      <Check size={12} style={{ display: "inline", marginRight: 4 }} />
                      Accepter
                    </button>
                    <button
                      onClick={() => setStatus(s.id, "implemented")}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 600,
                        background: "rgba(107,74,48,0.12)", color: "#6B4A30",
                      }}
                    >
                      Mettre en place
                    </button>
                    <button
                      onClick={() => setStatus(s.id, "rejected")}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 8, border: "none", cursor: "pointer",
                        fontSize: 12, fontWeight: 600,
                        background: "rgba(192,122,122,0.1)", color: "var(--danger)",
                      }}
                    >
                      <XIcon size={12} style={{ display: "inline", marginRight: 4 }} />
                      Refuser
                    </button>
                  </div>
                )}

                {/* Patron can re-open from any non-pending state */}
                {isPatron && s.status !== "pending" && (
                  <button
                    onClick={() => setStatus(s.id, "pending")}
                    style={{
                      alignSelf: "flex-start", padding: "4px 10px", borderRadius: 6,
                      border: "none", cursor: "pointer",
                      fontSize: 11, fontWeight: 500,
                      background: "var(--secondary-bg)", color: "var(--text-tertiary)",
                    }}
                  >
                    Repasser en attente
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
