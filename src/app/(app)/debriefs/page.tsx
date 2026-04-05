"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { DEBRIEF_CATEGORIES, scoreColor } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Debrief, Profile } from "@/lib/types";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from "lucide-react";

type ScoreKey = "global_score" | "service_score" | "coordination_score" | "ambiance_score" | "proprete_score";

function getWeekDebriefs(debriefs: Debrief[], weeksAgo: number): Debrief[] {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - (weeksAgo + 1) * 7);
  const end = new Date(now);
  end.setDate(end.getDate() - weeksAgo * 7);
  return debriefs.filter((d) => {
    const date = new Date(d.date);
    return date >= start && date < end;
  });
}

function avgForKey(debriefs: Debrief[], key: ScoreKey): number {
  if (debriefs.length === 0) return 0;
  return debriefs.reduce((sum, d) => sum + (d[key] as number), 0) / debriefs.length;
}

export default function DebriefsPage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [debriefs, setDebriefs] = useState<Debrief[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterStaff, setFilterStaff] = useState<string>("all");
  const [filterPeriod, setFilterPeriod] = useState<string>("all");

  useEffect(() => {
    if (profile && profile.role === "staff") {
      router.push("/ce-soir");
      return;
    }
    if (!user) return;

    async function load() {
      const [{ data: deb }, { data: profs }] = await Promise.all([
        supabase.from("debriefs").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("profiles").select("*").neq("role", "patron"),
      ]);
      setDebriefs(deb || []);
      const map: Record<string, string> = {};
      profs?.forEach((p: Profile) => { map[p.id] = p.name; });
      setProfilesMap(map);
      setStaffList((profs || []) as Profile[]);
      setLoading(false);
    }
    load();
  }, [profile, user, router, supabase]);

  // Filtered debriefs
  const filtered = useMemo(() => {
    let result = debriefs;
    if (filterStaff !== "all") {
      result = result.filter((d) => d.user_id === filterStaff);
    }
    if (filterPeriod === "7") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 7);
      result = result.filter((d) => new Date(d.date) >= cutoff);
    } else if (filterPeriod === "30") {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 30);
      result = result.filter((d) => new Date(d.date) >= cutoff);
    }
    return result;
  }, [debriefs, filterStaff, filterPeriod]);

  // Current averages
  const avgScores = useMemo(() => {
    if (filtered.length === 0) return null;
    const keys: { label: string; key: ScoreKey }[] = [
      { label: "Global", key: "global_score" },
      { label: "Service", key: "service_score" },
      { label: "Coord.", key: "coordination_score" },
      { label: "Ambiance", key: "ambiance_score" },
      { label: "Propreté", key: "proprete_score" },
    ];
    return keys.map(({ label, key }) => ({
      label,
      value: avgForKey(filtered, key),
    }));
  }, [filtered]);

  // Trends: this week vs last week
  const trends = useMemo(() => {
    const thisWeek = getWeekDebriefs(debriefs, 0);
    const lastWeek = getWeekDebriefs(debriefs, 1);
    if (thisWeek.length === 0 || lastWeek.length === 0) return null;

    const keys: { label: string; key: ScoreKey }[] = [
      { label: "Global", key: "global_score" },
      { label: "Service", key: "service_score" },
      { label: "Coord.", key: "coordination_score" },
      { label: "Ambiance", key: "ambiance_score" },
      { label: "Propreté", key: "proprete_score" },
    ];

    return keys.map(({ label, key }) => {
      const current = avgForKey(thisWeek, key);
      const previous = avgForKey(lastWeek, key);
      const diff = current - previous;
      return { label, current, previous, diff };
    });
  }, [debriefs]);

  // Suggestions
  const allSuggestions = filtered
    .filter((d) => d.suggestions)
    .map((d) => ({ text: d.suggestions!, user: profilesMap[d.user_id] || "?", date: d.date }));

  // Recurring themes in comments (simple keyword frequency)
  const recurringThemes = useMemo(() => {
    const words: Record<string, number> = {};
    const stopWords = new Set(["le", "la", "les", "de", "du", "des", "un", "une", "et", "en", "à", "au", "ce", "pas", "pour", "que", "qui", "est", "on", "il", "je", "se", "ne", "plus", "très", "trop", "bien", "avec", "dans", "sur", "par"]);

    filtered.forEach((d) => {
      const allText = [d.service_comment, d.coordination_comment, d.ambiance_comment, d.proprete_comment, d.suggestions]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      allText.split(/\s+/).forEach((word) => {
        const clean = word.replace(/[^a-zàâäéèêëïîôùûüç-]/g, "");
        if (clean.length > 3 && !stopWords.has(clean)) {
          words[clean] = (words[clean] || 0) + 1;
        }
      });
    });

    return Object.entries(words)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [filtered]);

  if (loading) {
    return <div className="p-4 max-w-lg mx-auto space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-card animate-pulse" />)}</div>;
  }

  if (!profile || profile.role === "staff") return null;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-2xl mb-4" style={{ fontFamily: "var(--font-dm-serif)" }}>Debriefs</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Select value={filterStaff} onValueChange={setFilterStaff}>
          <SelectTrigger className="flex-1"><SelectValue placeholder="Tout le staff" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout le staff</SelectItem>
            {staffList.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Période" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tout</SelectItem>
            <SelectItem value="7">7 jours</SelectItem>
            <SelectItem value="30">30 jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Scores moyens */}
      {avgScores && (
        <div className="mb-6 p-4 rounded-lg bg-card">
          <h2 className="text-sm font-medium mb-3 text-muted-foreground">
            Scores moyens ({filtered.length} debrief{filtered.length > 1 ? "s" : ""})
          </h2>
          <div className="grid grid-cols-5 gap-2 text-center">
            {avgScores.map((item) => (
              <div key={item.label}>
                <p className="text-2xl font-bold" style={{ color: scoreColor(item.value) }}>
                  {item.value.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tendances semaine */}
      {trends && (
        <div className="mb-6 p-4 rounded-lg bg-card">
          <h2 className="text-sm font-medium mb-3 text-muted-foreground">Tendances (cette semaine vs précédente)</h2>
          <div className="space-y-2">
            {trends.map((t) => (
              <div key={t.label} className="flex items-center justify-between">
                <span className="text-sm">{t.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium" style={{ color: scoreColor(t.current) }}>
                    {t.current.toFixed(1)}
                  </span>
                  <span className="flex items-center gap-0.5 text-xs">
                    {t.diff > 0.2 ? (
                      <><TrendingUp size={14} className="text-success" /><span className="text-success">+{t.diff.toFixed(1)}</span></>
                    ) : t.diff < -0.2 ? (
                      <><TrendingDown size={14} className="text-destructive" /><span className="text-destructive">{t.diff.toFixed(1)}</span></>
                    ) : (
                      <><Minus size={14} className="text-muted-foreground" /><span className="text-muted-foreground">stable</span></>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thèmes récurrents */}
      {recurringThemes.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-card">
          <h2 className="text-sm font-medium mb-3 text-muted-foreground">Mots récurrents dans les commentaires</h2>
          <div className="flex flex-wrap gap-2">
            {recurringThemes.map(([word, count]) => (
              <span key={word} className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                {word} <span className="text-muted-foreground">×{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {allSuggestions.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium mb-2 text-muted-foreground">Suggestions ({allSuggestions.length})</h2>
          <div className="space-y-2">
            {allSuggestions.map((s, i) => (
              <div key={i} className="p-3 rounded-lg bg-card border-l-[3px] border-l-primary">
                <p className="text-sm">{s.text}</p>
                <p className="text-xs text-muted-foreground mt-1">— {s.user}, {s.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual debriefs */}
      <h2 className="text-sm font-medium mb-2 text-muted-foreground">Tous les debriefs</h2>
      <div className="space-y-2">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="p-4 rounded-lg bg-card cursor-pointer"
            onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{profilesMap[d.user_id] || "?"}</span>
                <span className="text-xs text-muted-foreground">{d.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold" style={{ color: scoreColor(d.global_score) }}>
                  {d.global_score}/5
                </span>
                {expandedId === d.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
              </div>
            </div>

            {/* Mini scores */}
            <div className="grid grid-cols-4 gap-2 mt-2">
              {DEBRIEF_CATEGORIES.map((cat) => {
                const score = d[`${cat.key}_score` as keyof Debrief] as number;
                return (
                  <div key={cat.key} className="text-center">
                    <p className="text-sm font-bold" style={{ color: scoreColor(score) }}>{score}</p>
                    <p className="text-xs text-muted-foreground">{cat.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Expanded details */}
            {expandedId === d.id && (
              <div className="mt-3 pt-3 border-t border-border space-y-1">
                {DEBRIEF_CATEGORIES.map((cat) => {
                  const comment = d[`${cat.key}_comment` as keyof Debrief] as string | null;
                  if (!comment) return null;
                  return (
                    <p key={cat.key} className="text-xs">
                      <strong>{cat.label} :</strong> {comment}
                    </p>
                  );
                })}
                {d.suggestions && (
                  <p className="text-xs text-primary mt-1">
                    <strong>💡 Suggestion :</strong> {d.suggestions}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">
          {debriefs.length === 0 ? "Aucun debrief pour le moment" : "Aucun debrief pour ces filtres"}
        </p>
      )}
    </div>
  );
}
