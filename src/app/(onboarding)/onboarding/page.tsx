"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OnboardingDoc, OnboardingCompletion } from "@/lib/types";
import { Check, FileText, ChevronRight } from "lucide-react";

export default function OnboardingPage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [docs, setDocs] = useState<OnboardingDoc[]>([]);
  const [completions, setCompletions] = useState<OnboardingCompletion[]>([]);
  const [activeDoc, setActiveDoc] = useState<OnboardingDoc | null>(null);
  const [signedName, setSignedName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (profile?.onboarding_completed) {
      router.push("/tonight");
      return;
    }

    async function load() {
      const [{ data: docsData }, { data: compData }] = await Promise.all([
        supabase.from("onboarding_docs").select("*").order("sort_order"),
        supabase.from("onboarding_completions").select("*").eq("user_id", user!.id),
      ]);
      setDocs(docsData || []);
      setCompletions(compData || []);
      setLoading(false);
    }
    load();
  }, [user, profile, router, supabase]);

  const completedDocIds = new Set(completions.map((c) => c.doc_id));
  const requiredDocs = docs.filter((d) => d.required);
  const allRequiredDone = requiredDocs.every((d) => completedDocIds.has(d.id));

  async function acknowledgeDoc() {
    if (!user || !activeDoc || !signedName.trim()) return;

    const { data } = await supabase.from("onboarding_completions").insert({
      user_id: user.id,
      doc_id: activeDoc.id,
      signed_name: signedName.trim(),
    }).select().single();

    if (data) {
      setCompletions((prev) => [...prev, data]);
      setActiveDoc(null);
      setSignedName("");
    }
  }

  async function completeOnboarding() {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
    router.push("/tonight");
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Reading a document
  if (activeDoc) {
    return (
      <div className="min-h-dvh p-4 pb-28 max-w-lg mx-auto">
        <button onClick={() => setActiveDoc(null)} className="text-sm text-muted-foreground mb-4 hover:text-foreground transition-colors">
          ← Retour
        </button>

        <h1 className="text-xl font-semibold tracking-tight mb-2">{activeDoc.title}</h1>

        <div className="glass-card p-5 mb-6">
          <div className="prose prose-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {activeDoc.content}
          </div>
        </div>

        {!completedDocIds.has(activeDoc.id) && (
          <div className="glass-card p-5 space-y-4">
            <p className="text-sm font-medium">J&apos;ai lu et compris ce document</p>
            <Input
              placeholder="Tapez votre nom complet pour signer"
              value={signedName}
              onChange={(e) => setSignedName(e.target.value)}
              className="h-12"
            />
            <Button
              className="w-full h-12"
              onClick={acknowledgeDoc}
              disabled={!signedName.trim()}
              style={{ background: "var(--gradient-primary)" }}
            >
              Signer et confirmer
            </Button>
          </div>
        )}

        {completedDocIds.has(activeDoc.id) && (
          <div className="glass-card p-5 text-center">
            <Check size={24} className="mx-auto mb-2 text-success" />
            <p className="text-sm font-medium">Document signé</p>
          </div>
        )}
      </div>
    );
  }

  // Document checklist
  return (
    <div className="min-h-dvh p-4 pb-28 max-w-lg mx-auto">
      <div className="text-center mb-8 mt-8">
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          Bienvenue{profile?.name ? `, ${profile.name}` : ""} !
        </h1>
        <p className="text-sm text-muted-foreground">
          Avant de commencer, prends connaissance de ces documents et signe-les.
        </p>
      </div>

      {/* Progress */}
      <div className="glass-card p-4 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progression</span>
          <span className="font-medium">{completedDocIds.size}/{docs.length}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--secondary-bg)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${docs.length > 0 ? (completedDocIds.size / docs.length) * 100 : 0}%`,
              background: "var(--gradient-primary)",
            }}
          />
        </div>
      </div>

      {/* Document list */}
      <div className="space-y-2 stagger-children">
        {docs.map((doc) => {
          const done = completedDocIds.has(doc.id);
          return (
            <button
              key={doc.id}
              onClick={() => setActiveDoc(doc)}
              className="glass-card glass-card-hover w-full p-4 flex items-center gap-3 text-left"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: done ? "var(--gradient-primary)" : "var(--secondary-bg)",
                }}
              >
                {done ? (
                  <Check size={18} strokeWidth={2.5} className="text-white" />
                ) : (
                  <FileText size={18} strokeWidth={1.5} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : ""}`}>
                  {doc.title}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{doc.category}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
            </button>
          );
        })}
      </div>

      {docs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Aucun document d&apos;onboarding configuré</p>
          <Button className="mt-4" onClick={completeOnboarding}>
            Continuer vers l&apos;app
          </Button>
        </div>
      )}

      {/* Complete button */}
      {allRequiredDone && docs.length > 0 && (
        <div className="mt-8">
          <Button
            className="w-full h-12 text-base font-medium"
            onClick={completeOnboarding}
            style={{ background: "var(--gradient-primary)" }}
          >
            Commencer à utiliser Shift
          </Button>
        </div>
      )}
    </div>
  );
}
