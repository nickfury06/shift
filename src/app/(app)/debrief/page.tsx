"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, formatDateFr } from "@/lib/shift-utils";
import type { Debrief, Profile } from "@/lib/types";
import { ChevronDown, ChevronLeft, ChevronRight, Send } from "lucide-react";

const CATEGORIES = [
  { key: "global", label: "Global", desc: "Impression générale du shift" },
  { key: "service", label: "Service", desc: "Qualité du service client" },
  { key: "coordination", label: "Coordination", desc: "Communication et travail d'équipe" },
  { key: "ambiance", label: "Ambiance", desc: "Atmosphère du lieu" },
  { key: "proprete", label: "Propreté", desc: "État des lieux et hygiène" },
] as const;

type ScoreKey = "global_score" | "service_score" | "coordination_score" | "ambiance_score" | "proprete_score";
type CommentKey = "service_comment" | "coordination_comment" | "ambiance_comment" | "proprete_comment";

export default function DebriefPage() {
  const { profile, user } = useAuth();
  const supabase = useRef(createClient()).current;
  const isPatron = profile?.role === "patron" || profile?.role === "responsable";

  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [myDebrief, setMyDebrief] = useState<Debrief | null>(null);

  // Patron view
  const [allDebriefs, setAllDebriefs] = useState<Debrief[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});
  const [expandedDebrief, setExpandedDebrief] = useState<string | null>(null);
  const [dateOffset, setDateOffset] = useState(0);

  // Form state
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    global_score: 0,
    service_score: 0,
    coordination_score: 0,
    ambiance_score: 0,
    proprete_score: 0,
  });
  const [comments, setComments] = useState<Record<CommentKey | "suggestions", string>>({
    service_comment: "",
    coordination_comment: "",
    ambiance_comment: "",
    proprete_comment: "",
    suggestions: "",
  });

  const shiftDate = getShiftDate();
  // Navigate dates for patron view
  const viewDate = (() => {
    const d = new Date(shiftDate);
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().split("T")[0];
  })();
  const viewDateLabel = formatDateFr(viewDate);

  const fetchData = useCallback(async () => {
    if (!user) return;

    if (isPatron) {
      const [{ data: debriefs }, { data: profiles }] = await Promise.all([
        supabase.from("debriefs").select("*").eq("date", viewDate).order("created_at"),
        supabase.from("profiles").select("id, name").order("name"),
      ]);
      setAllDebriefs((debriefs as Debrief[]) || []);
      const map: Record<string, string> = {};
      ((profiles as Pick<Profile, "id" | "name">[]) || []).forEach((p) => { map[p.id] = p.name; });
      setStaffMap(map);
    }

    // Also check if current user already submitted
    const { data: mine } = await supabase
      .from("debriefs")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", shiftDate)
      .maybeSingle();

    if (mine) {
      setMyDebrief(mine as Debrief);
      setSubmitted(true);
    }

    setLoading(false);
  }, [user, supabase, shiftDate, viewDate, isPatron]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit() {
    if (!user) return;
    // Validate all scores filled
    const allFilled = Object.values(scores).every((s) => s >= 1);
    if (!allFilled) return;

    const payload = {
      user_id: user.id,
      date: shiftDate,
      ...scores,
      service_comment: comments.service_comment.trim() || null,
      coordination_comment: comments.coordination_comment.trim() || null,
      ambiance_comment: comments.ambiance_comment.trim() || null,
      proprete_comment: comments.proprete_comment.trim() || null,
      suggestions: comments.suggestions.trim() || null,
    };

    const { error } = await supabase.from("debriefs").insert(payload);
    if (!error) {
      setSubmitted(true);
      fetchData();
    }
  }

  function scoreColor(score: number): string {
    if (score >= 4) return "var(--terra-deep)";
    if (score >= 3) return "var(--terra-medium)";
    if (score >= 2) return "var(--warning)";
    return "var(--danger)";
  }

  if (loading) {
    return (
      <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-light" style={{ height: 64, borderRadius: 16, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 24 }}>
        Debrief
      </h1>

      {/* ── Staff: Fill debrief form ──────────────────────── */}
      {!isPatron && !submitted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Comment s&apos;est passé le shift ? Note chaque catégorie de 1 à 5.
          </p>

          {CATEGORIES.map((cat) => {
            const scoreKey = `${cat.key}_score` as ScoreKey;
            return (
              <div key={cat.key}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                    {cat.label}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)", marginLeft: 8 }}>
                    {cat.desc}
                  </span>
                </div>

                {/* Score buttons */}
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setScores((prev) => ({ ...prev, [scoreKey]: n }))}
                      style={{
                        width: 44, height: 44, borderRadius: 12,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer",
                        background: scores[scoreKey] === n
                          ? "var(--gradient-primary)"
                          : "var(--secondary-bg)",
                        color: scores[scoreKey] === n ? "#fff" : "var(--text-secondary)",
                        transition: "all 0.2s ease",
                        transform: scores[scoreKey] === n ? "scale(1.05)" : "scale(1)",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                {/* Comment field (not for global) */}
                {cat.key !== "global" && (
                  <textarea
                    placeholder="Commentaire (optionnel)"
                    value={comments[`${cat.key}_comment` as CommentKey]}
                    onChange={(e) =>
                      setComments((prev) => ({
                        ...prev,
                        [`${cat.key}_comment`]: e.target.value,
                      }))
                    }
                    rows={2}
                    style={{
                      width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                      background: "var(--input-bg)", padding: "10px 12px", fontSize: 13,
                      color: "var(--text-primary)", outline: "none", resize: "none",
                    }}
                  />
                )}
              </div>
            );
          })}

          {/* Suggestions */}
          <div>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", display: "block", marginBottom: 8 }}>
              Suggestions
            </span>
            <textarea
              placeholder="Des idées pour améliorer le service ?"
              value={comments.suggestions}
              onChange={(e) => setComments((prev) => ({ ...prev, suggestions: e.target.value }))}
              rows={3}
              style={{
                width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                background: "var(--input-bg)", padding: "10px 12px", fontSize: 13,
                color: "var(--text-primary)", outline: "none", resize: "none",
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!Object.values(scores).every((s) => s >= 1)}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", borderRadius: 12, padding: "12px 0", fontSize: 14, fontWeight: 500,
              color: "#fff", background: "var(--gradient-primary)", border: "none", cursor: "pointer",
              opacity: Object.values(scores).every((s) => s >= 1) ? 1 : 0.5,
              transition: "opacity 0.2s",
            }}
          >
            <Send size={16} />
            Envoyer le debrief
          </button>
        </div>
      )}

      {/* ── Staff: Already submitted ─────────────────────── */}
      {!isPatron && submitted && myDebrief && (
        <div className="card-medium" style={{ padding: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--terra-deep)", marginBottom: 16 }}>
            Debrief envoyé pour aujourd&apos;hui
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {CATEGORIES.map((cat) => {
              const score = myDebrief[`${cat.key}_score` as keyof Debrief] as number;
              return (
                <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{cat.label}</span>
                  <span style={{
                    fontSize: 14, fontWeight: 600, color: scoreColor(score),
                    background: "var(--secondary-bg)", padding: "2px 8px", borderRadius: 6,
                  }}>
                    {score}/5
                  </span>
                </div>
              );
            })}
          </div>
          {myDebrief.suggestions && (
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 12, fontStyle: "italic" }}>
              &ldquo;{myDebrief.suggestions}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* ── Patron: View all debriefs ────────────────────── */}
      {isPatron && (
        <>
          {/* Date nav */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            marginBottom: 20,
          }}>
            <button
              onClick={() => setDateOffset((o) => o - 1)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
            >
              <ChevronLeft size={20} style={{ color: "var(--text-secondary)" }} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
              {viewDateLabel}
            </span>
            <button
              onClick={() => setDateOffset((o) => Math.min(o + 1, 0))}
              disabled={dateOffset >= 0}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, opacity: dateOffset >= 0 ? 0.3 : 1 }}
            >
              <ChevronRight size={20} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>

          {/* Averages summary */}
          {allDebriefs.length > 0 && (
            <div className="card-medium" style={{ padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between" }}>
                {CATEGORIES.map((cat) => {
                  const avg =
                    allDebriefs.reduce((sum, d) => sum + (d[`${cat.key}_score` as keyof Debrief] as number), 0) /
                    allDebriefs.length;
                  return (
                    <div key={cat.key} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 20, fontWeight: 600, color: scoreColor(Math.round(avg)) }}>
                        {avg.toFixed(1)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 2 }}>
                        {cat.label}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", marginTop: 12 }}>
                {allDebriefs.length} debrief{allDebriefs.length > 1 ? "s" : ""}
              </div>
            </div>
          )}

          {/* Individual debriefs */}
          {allDebriefs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allDebriefs.map((d) => {
                const isExpanded = expandedDebrief === d.id;
                const globalScore = d.global_score;
                return (
                  <div key={d.id} className="card-light" style={{ overflow: "hidden" }}>
                    <button
                      onClick={() => setExpandedDebrief(isExpanded ? null : d.id)}
                      style={{
                        width: "100%", padding: "14px 16px", background: "none", border: "none",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                          {staffMap[d.user_id] || "Inconnu"}
                        </span>
                        <span style={{
                          fontSize: 13, fontWeight: 600, color: scoreColor(globalScore),
                          background: "var(--secondary-bg)", padding: "2px 8px", borderRadius: 6,
                        }}>
                          {globalScore}/5
                        </span>
                      </div>
                      <ChevronDown
                        size={16}
                        style={{
                          color: "var(--text-tertiary)",
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    </button>

                    {isExpanded && (
                      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Scores */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                          {CATEGORIES.filter((c) => c.key !== "global").map((cat) => {
                            const score = d[`${cat.key}_score` as keyof Debrief] as number;
                            return (
                              <div key={cat.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{cat.label}</span>
                                <span style={{
                                  fontSize: 13, fontWeight: 600, color: scoreColor(score),
                                  background: "var(--secondary-bg)", padding: "2px 6px", borderRadius: 4,
                                }}>
                                  {score}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Comments */}
                        {(["service", "coordination", "ambiance", "proprete"] as const).map((key) => {
                          const comment = d[`${key}_comment` as keyof Debrief] as string | null;
                          if (!comment) return null;
                          const label = CATEGORIES.find((c) => c.key === key)?.label;
                          return (
                            <div key={key}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                {label}
                              </span>
                              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
                                {comment}
                              </p>
                            </div>
                          );
                        })}

                        {d.suggestions && (
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                              Suggestions
                            </span>
                            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2, fontStyle: "italic" }}>
                              {d.suggestions}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-light" style={{ padding: 24, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Aucun debrief pour cette date
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
