"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate } from "@/lib/shift-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ScoreSelector from "@/components/ScoreSelector";
import { DEBRIEF_CATEGORIES } from "@/lib/constants";
import { motion } from "motion/react";

export default function DebriefPage() {
  const { profile, user } = useAuth();
  const supabase = createClient();
  const today = getShiftDate();

  const [alreadyFilled, setAlreadyFilled] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [globalScore, setGlobalScore] = useState(0);
  const [scores, setScores] = useState({ service: 3, coordination: 3, ambiance: 3, proprete: 3 });
  const [comments, setComments] = useState({ service: "", coordination: "", ambiance: "", proprete: "" });
  const [suggestions, setSuggestions] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("debriefs")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle()
      .then(({ data }) => {
        setAlreadyFilled(!!data);
        setLoading(false);
      });
  }, [user, today, supabase]);

  async function handleSubmit() {
    if (!user || globalScore === 0) return;
    setSubmitting(true);

    const { error } = await supabase.from("debriefs").insert({
      user_id: user.id,
      date: today,
      global_score: globalScore,
      service_score: scores.service,
      coordination_score: scores.coordination,
      ambiance_score: scores.ambiance,
      proprete_score: scores.proprete,
      service_comment: comments.service || null,
      coordination_comment: comments.coordination || null,
      ambiance_comment: comments.ambiance || null,
      proprete_comment: comments.proprete || null,
      suggestions: suggestions || null,
    });

    setSubmitting(false);
    if (!error) setSubmitted(true);
  }

  if (loading || !profile) {
    return <div className="p-4 max-w-lg mx-auto"><div className="h-32 bg-card rounded-lg animate-pulse" /></div>;
  }

  if (alreadyFilled || submitted) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <h1 className="text-2xl mb-4" style={{ fontFamily: "var(--font-dm-serif)" }}>Debrief</h1>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 rounded-lg bg-card text-center"
        >
          <p className="text-4xl mb-4">✅</p>
          <p className="text-lg font-medium">Merci {profile.name} !</p>
          <p className="text-sm text-muted-foreground mt-2">
            Ton retour est précieux. Tes observations aident l&apos;équipe à s&apos;améliorer chaque soir.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      <h1 className="text-2xl mb-1" style={{ fontFamily: "var(--font-dm-serif)" }}>Debrief</h1>
      <p className="text-sm text-muted-foreground mb-6">Comment s&apos;est passé le service ce soir ?</p>

      {/* Global score */}
      <div className="mb-6 p-4 rounded-lg bg-card">
        <label className="block font-medium mb-3">Note globale</label>
        <div className="flex justify-center">
          <ScoreSelector value={globalScore} onChange={setGlobalScore} size="large" />
        </div>
        {globalScore === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-2">Sélectionne une note pour continuer</p>
        )}
      </div>

      {/* Category scores */}
      {DEBRIEF_CATEGORIES.map((cat) => (
        <div key={cat.key} className="mb-4 p-4 rounded-lg bg-card">
          <div className="flex justify-between items-center mb-2">
            <label className="font-medium">{cat.label}</label>
            <ScoreSelector
              value={scores[cat.key]}
              onChange={(n) => setScores((prev) => ({ ...prev, [cat.key]: n }))}
              size="small"
            />
          </div>
          <Textarea
            placeholder={`Commentaire sur ${cat.label.toLowerCase()} (optionnel)...`}
            value={comments[cat.key]}
            onChange={(e) => setComments((prev) => ({ ...prev, [cat.key]: e.target.value }))}
            rows={2}
            className="text-sm"
          />
        </div>
      ))}

      {/* Suggestions */}
      <div className="mb-6 p-4 rounded-lg bg-card">
        <label className="block font-medium mb-2">Suggestions d&apos;amélioration</label>
        <Textarea
          placeholder="Une idée de cocktail, un process à changer, un problème à signaler..."
          value={suggestions}
          onChange={(e) => setSuggestions(e.target.value)}
          rows={3}
        />
      </div>

      {/* Submit — sticky at bottom */}
      <div className="sticky bottom-20 pt-4">
        <Button
          className="w-full h-12 text-base font-medium shadow-lg"
          onClick={handleSubmit}
          disabled={globalScore === 0 || submitting}
        >
          {submitting ? "Envoi..." : globalScore === 0 ? "Sélectionne une note globale" : "Envoyer le debrief"}
        </Button>
      </div>
    </div>
  );
}
