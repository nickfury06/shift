"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, formatDateFr } from "@/lib/shift-utils";
import type { Debrief, Affluence, ClosingState, Profile } from "@/lib/types";
import { ChevronLeft, ChevronRight, ChevronDown, Send, AlertTriangle, MessageSquare, Lightbulb } from "lucide-react";

// ── Quick-tap configs ──────────────────────────────────────
const RATING_COLORS = ["", "#D44", "#D88", "#B89070", "#8B6A50", "#6B4A30"];
const RATING_LABELS = ["", "Mauvais", "Moyen", "OK", "Bien", "Excellent"];

const AFFLUENCE_OPTIONS: { value: Affluence; label: string; icon: string }[] = [
  { value: "calme", label: "Calme", icon: "🌙" },
  { value: "normal", label: "Normal", icon: "👍" },
  { value: "charge", label: "Chargé", icon: "🔥" },
  { value: "rush", label: "Rush", icon: "💥" },
];

const CLOSING_OPTIONS: { value: ClosingState; label: string; icon: string }[] = [
  { value: "impeccable", label: "Impeccable", icon: "✨" },
  { value: "correct", label: "Correct", icon: "👌" },
  { value: "a_ameliorer", label: "À améliorer", icon: "⚠️" },
];

export default function DebriefPage() {
  const { profile, user } = useAuth();
  const supabase = useRef(createClient()).current;
  const isPatron = profile?.role === "patron" || profile?.role === "responsable";

  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [myDebrief, setMyDebrief] = useState<Debrief | null>(null);
  const [saving, setSaving] = useState(false);

  // Patron
  const [allDebriefs, setAllDebriefs] = useState<Debrief[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dateOffset, setDateOffset] = useState(0);

  // Form
  const [globalRating, setGlobalRating] = useState(0);
  const [serviceRating, setServiceRating] = useState(0);
  const [teamRating, setTeamRating] = useState(0);
  const [affluence, setAffluence] = useState<Affluence | null>(null);
  const [closingState, setClosingState] = useState<ClosingState | null>(null);
  const [incidents, setIncidents] = useState("");
  const [clientFeedback, setClientFeedback] = useState("");
  const [suggestions, setSuggestions] = useState("");

  const shiftDate = getShiftDate();
  const viewDate = (() => {
    const d = new Date(shiftDate);
    d.setDate(d.getDate() + dateOffset);
    return d.toISOString().split("T")[0];
  })();

  const fetchData = useCallback(async () => {
    if (!user || !profile) return;

    const isP = profile.role === "patron" || profile.role === "responsable";

    if (isP) {
      const [{ data: debriefs }, { data: profiles }] = await Promise.all([
        supabase.from("debriefs").select("*").eq("date", viewDate).order("created_at"),
        supabase.from("profiles").select("id, name").order("name"),
      ]);
      setAllDebriefs((debriefs as Debrief[]) || []);
      const map: Record<string, string> = {};
      ((profiles as Pick<Profile, "id" | "name">[]) || []).forEach((p) => { map[p.id] = p.name; });
      setStaffMap(map);
    }

    const { data: mine } = await supabase
      .from("debriefs").select("*")
      .eq("user_id", user.id).eq("date", shiftDate)
      .maybeSingle();

    if (mine) {
      setMyDebrief(mine as Debrief);
      setSubmitted(true);
    }
    setLoading(false);
  }, [user, profile, supabase, shiftDate, viewDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canSubmit = globalRating > 0 && serviceRating > 0 && teamRating > 0 && affluence && closingState;

  async function handleSubmit() {
    if (!user || !canSubmit || saving) return;
    setSaving(true);

    await supabase.from("debriefs").insert({
      user_id: user.id,
      date: shiftDate,
      global_rating: globalRating,
      service_rating: serviceRating,
      team_rating: teamRating,
      affluence,
      closing_state: closingState,
      incidents: incidents.trim() || null,
      client_feedback: clientFeedback.trim() || null,
      suggestions: suggestions.trim() || null,
    });

    setSaving(false);
    setSubmitted(true);
    fetchData();
  }

  // ── Rating selector component ────────────────────────────
  function RatingRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{label}</span>
          {value > 0 && (
            <span style={{ fontSize: 12, fontWeight: 600, color: RATING_COLORS[value] }}>{RATING_LABELS[value]}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onChange(n)}
              style={{
                flex: 1, height: 48, borderRadius: 12, border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700,
                background: value === n ? RATING_COLORS[n] : "var(--secondary-bg)",
                color: value === n ? "#fff" : "var(--text-tertiary)",
                transform: value === n ? "scale(1.06)" : "scale(1)",
                opacity: value > 0 && value !== n ? 0.4 : 1,
                transition: "all 0.15s",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Helpers ──────────────────────────────────────────────
  function ratingColor(r: number): string {
    if (r >= 4) return "#8B5A40";
    if (r >= 3) return "var(--text-secondary)";
    return "var(--danger)";
  }

  const affluenceLabel = (a: Affluence) => AFFLUENCE_OPTIONS.find((o) => o.value === a);
  const closingLabel = (c: ClosingState) => CLOSING_OPTIONS.find((o) => o.value === c);

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
      <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 4 }}>
        Debrief
      </h1>

      {/* ════════════════════════════════════════════════════ */}
      {/* STAFF FORM                                          */}
      {/* ════════════════════════════════════════════════════ */}
      {!isPatron && !submitted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
          <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
            30 secondes pour résumer ton shift.
          </p>

          {/* Ratings */}
          <RatingRow label="Comment c'était ?" value={globalRating} onChange={setGlobalRating} />
          <RatingRow label="Le service client" value={serviceRating} onChange={setServiceRating} />
          <RatingRow label="L'équipe" value={teamRating} onChange={setTeamRating} />

          {/* Affluence */}
          <div>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", display: "block", marginBottom: 8 }}>
              Affluence
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {AFFLUENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setAffluence(opt.value)}
                  style={{
                    flex: 1, borderRadius: 12, padding: "10px 0", border: "none", cursor: "pointer",
                    textAlign: "center",
                    background: affluence === opt.value ? "var(--gradient-primary)" : "var(--secondary-bg)",
                    color: affluence === opt.value ? "#fff" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 18 }}>{opt.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Closing state */}
          <div>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", display: "block", marginBottom: 8 }}>
              État à la fermeture
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {CLOSING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setClosingState(opt.value)}
                  style={{
                    flex: 1, borderRadius: 12, padding: "10px 0", border: "none", cursor: "pointer",
                    textAlign: "center",
                    background: closingState === opt.value ? "var(--gradient-primary)" : "var(--secondary-bg)",
                    color: closingState === opt.value ? "#fff" : "var(--text-secondary)",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{ fontSize: 18 }}>{opt.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 500, marginTop: 2 }}>{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Separator */}
          <div style={{ height: 1, background: "var(--border-color)" }} />

          {/* Optional text fields */}
          <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: -8 }}>
            Optionnel — remplis ce qui est pertinent
          </p>

          {/* Incidents */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={14} style={{ color: "var(--warning)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Incidents / Problèmes</span>
            </div>
            <textarea
              placeholder="Machine en panne, plainte client, stock manquant..."
              value={incidents}
              onChange={(e) => setIncidents(e.target.value)}
              rows={2}
              style={{
                width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                background: "var(--input-bg)", padding: "10px 12px", fontSize: 13,
                color: "var(--text-primary)", outline: "none", resize: "none",
              }}
            />
          </div>

          {/* Client feedback */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <MessageSquare size={14} style={{ color: "#8B5A40" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Retours clients</span>
            </div>
            <textarea
              placeholder="Compliments, plaintes, remarques..."
              value={clientFeedback}
              onChange={(e) => setClientFeedback(e.target.value)}
              rows={2}
              style={{
                width: "100%", borderRadius: 12, border: "1px solid var(--border-color)",
                background: "var(--input-bg)", padding: "10px 12px", fontSize: 13,
                color: "var(--text-primary)", outline: "none", resize: "none",
              }}
            />
          </div>

          {/* Suggestions */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Lightbulb size={14} style={{ color: "var(--text-tertiary)" }} />
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>Suggestions</span>
            </div>
            <textarea
              placeholder="Comment on pourrait s'améliorer ?"
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              rows={2}
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
            disabled={!canSubmit || saving}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", borderRadius: 14, padding: "14px 0",
              fontSize: 15, fontWeight: 600, color: "#fff",
              background: "var(--gradient-primary)", border: "none", cursor: "pointer",
              opacity: canSubmit && !saving ? 1 : 0.4,
              transition: "opacity 0.2s",
            }}
          >
            <Send size={16} />
            {saving ? "..." : "Envoyer"}
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* STAFF: ALREADY SUBMITTED                            */}
      {/* ════════════════════════════════════════════════════ */}
      {!isPatron && submitted && myDebrief && (
        <div style={{ marginTop: 16 }}>
          <div className="card-medium" style={{ padding: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: "#8B5A40", marginBottom: 16 }}>
              Debrief envoyé ✓
            </p>

            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
              {[
                { label: "Global", val: myDebrief.global_rating },
                { label: "Service", val: myDebrief.service_rating },
                { label: "Équipe", val: myDebrief.team_rating },
              ].map((r) => (
                <div key={r.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: RATING_COLORS[r.val] }}>{r.val}/5</div>
                  <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>{r.label}</div>
                </div>
              ))}
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{affluenceLabel(myDebrief.affluence)?.icon}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>{affluenceLabel(myDebrief.affluence)?.label}</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20 }}>{closingLabel(myDebrief.closing_state)?.icon}</div>
                <div style={{ fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>{closingLabel(myDebrief.closing_state)?.label}</div>
              </div>
            </div>

            {(myDebrief.incidents || myDebrief.client_feedback || myDebrief.suggestions) && (
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {myDebrief.incidents && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <AlertTriangle size={11} style={{ display: "inline", marginRight: 4, color: "var(--warning)" }} />
                    {myDebrief.incidents}
                  </p>
                )}
                {myDebrief.client_feedback && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    <MessageSquare size={11} style={{ display: "inline", marginRight: 4, color: "#8B5A40" }} />
                    {myDebrief.client_feedback}
                  </p>
                )}
                {myDebrief.suggestions && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
                    <Lightbulb size={11} style={{ display: "inline", marginRight: 4 }} />
                    {myDebrief.suggestions}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* PATRON VIEW                                         */}
      {/* ════════════════════════════════════════════════════ */}
      {isPatron && (
        <div style={{ marginTop: 8 }}>
          {/* Date nav */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <button onClick={() => setDateOffset((o) => o - 1)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <ChevronLeft size={20} style={{ color: "var(--text-secondary)" }} />
            </button>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
              {dateOffset === 0 ? "Ce soir" : formatDateFr(viewDate)}
            </span>
            <button onClick={() => setDateOffset((o) => Math.min(o + 1, 0))} disabled={dateOffset >= 0} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, opacity: dateOffset >= 0 ? 0.3 : 1 }}>
              <ChevronRight size={20} style={{ color: "var(--text-secondary)" }} />
            </button>
          </div>

          {/* Averages */}
          {allDebriefs.length > 0 && (() => {
            const avg = (key: "global_rating" | "service_rating" | "team_rating") =>
              allDebriefs.reduce((s, d) => s + d[key], 0) / allDebriefs.length;
            const avgGlobal = avg("global_rating");
            const avgService = avg("service_rating");
            const avgTeam = avg("team_rating");

            // Most common affluence
            const affCounts: Record<string, number> = {};
            allDebriefs.forEach((d) => { affCounts[d.affluence] = (affCounts[d.affluence] || 0) + 1; });
            const topAff = Object.entries(affCounts).sort((a, b) => b[1] - a[1])[0]?.[0] as Affluence;

            // Incidents count
            const incidentCount = allDebriefs.filter((d) => d.incidents).length;

            return (
              <div className="card-medium" style={{ padding: 16, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center", marginBottom: 12 }}>
                  {[
                    { label: "Global", val: avgGlobal },
                    { label: "Service", val: avgService },
                    { label: "Équipe", val: avgTeam },
                  ].map((r) => (
                    <div key={r.label}>
                      <div style={{ fontSize: 24, fontWeight: 700, color: RATING_COLORS[Math.round(r.val)] }}>{r.val.toFixed(1)}</div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{r.label}</div>
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: 20 }}>{affluenceLabel(topAff)?.icon}</div>
                    <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{affluenceLabel(topAff)?.label}</div>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 12, color: "var(--text-tertiary)" }}>
                  <span>{allDebriefs.length} debrief{allDebriefs.length > 1 ? "s" : ""}</span>
                  {incidentCount > 0 && (
                    <span style={{ color: "var(--warning)" }}>
                      ⚠️ {incidentCount} incident{incidentCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Individual debriefs */}
          {allDebriefs.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allDebriefs.map((d) => {
                const expanded = expandedId === d.id;
                const hasText = d.incidents || d.client_feedback || d.suggestions;
                return (
                  <div key={d.id} className="card-light" style={{ overflow: "hidden" }}>
                    <button
                      onClick={() => setExpandedId(expanded ? null : d.id)}
                      style={{
                        width: "100%", padding: "14px 16px", background: "none", border: "none", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
                          {staffMap[d.user_id] || "Staff"}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: RATING_COLORS[d.global_rating], background: "var(--secondary-bg)", padding: "2px 8px", borderRadius: 6 }}>{d.global_rating}/5</span>
                        {d.incidents && (
                          <AlertTriangle size={13} style={{ color: "var(--warning)" }} />
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                          {affluenceLabel(d.affluence)?.icon}
                        </span>
                        <ChevronDown size={16} style={{
                          color: "var(--text-tertiary)",
                          transform: expanded ? "rotate(180deg)" : "rotate(0)",
                          transition: "transform 0.2s",
                        }} />
                      </div>
                    </button>

                    {expanded && (
                      <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                        {/* Ratings row */}
                        <div style={{ display: "flex", gap: 16 }}>
                          {[
                            { label: "Global", value: d.global_rating },
                            { label: "Service", value: d.service_rating },
                            { label: "Équipe", value: d.team_rating },
                          ].map((r) => (
                            <div key={r.label} style={{ textAlign: "center" }}>
                              <div style={{ fontSize: 18, fontWeight: 700, color: RATING_COLORS[r.value] }}>{r.value}/5</div>
                              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{r.label}</div>
                            </div>
                          ))}
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18 }}>{affluenceLabel(d.affluence)?.icon}</div>
                            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{affluenceLabel(d.affluence)?.label}</div>
                          </div>
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 18 }}>{closingLabel(d.closing_state)?.icon}</div>
                            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{closingLabel(d.closing_state)?.label}</div>
                          </div>
                        </div>

                        {/* Text fields */}
                        {hasText && (
                          <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                            {d.incidents && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--warning)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                  <AlertTriangle size={11} /> Incidents
                                </div>
                                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{d.incidents}</p>
                              </div>
                            )}
                            {d.client_feedback && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "#8B5A40", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                  <MessageSquare size={11} /> Retours clients
                                </div>
                                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>{d.client_feedback}</p>
                              </div>
                            )}
                            {d.suggestions && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 2, display: "flex", alignItems: "center", gap: 4 }}>
                                  <Lightbulb size={11} /> Suggestions
                                </div>
                                <p style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>{d.suggestions}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-light" style={{ padding: 32, textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Aucun debrief pour cette date</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
