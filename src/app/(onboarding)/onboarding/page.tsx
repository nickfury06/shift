"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
      router.push("/accueil");
      return;
    }

    async function load() {
      const isExtra = profile?.employment_type === "extra";
      // Extras only see the essential docs (for_extras = true)
      let docsQuery = supabase.from("onboarding_docs").select("*").order("sort_order");
      if (isExtra) docsQuery = docsQuery.eq("for_extras", true);
      const [{ data: docsData }, { data: compData }] = await Promise.all([
        docsQuery,
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
    router.push("/accueil");
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
      <div className="min-h-dvh" style={{ padding: "0 20px", paddingBottom: 96 }}>
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => setActiveDoc(null)}
            style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16, marginTop: 16, background: "none", border: "none", cursor: "pointer" }}
          >
            ← Retour
          </button>

          <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 16 }}>{activeDoc.title}</h1>

          <div className="card-medium" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
              {activeDoc.content}
            </div>
          </div>

          {!completedDocIds.has(activeDoc.id) && (
            <div className="card-medium" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>J&apos;ai lu et compris ce document</p>
              <input
                type="text"
                placeholder="Tapez votre nom complet pour signer"
                value={signedName}
                onChange={(e) => setSignedName(e.target.value)}
                className="w-full rounded-xl bg-input px-4 py-3 text-sm outline-none"
                style={{ height: 48 }}
              />
              <button
                onClick={acknowledgeDoc}
                disabled={!signedName.trim()}
                className="w-full rounded-xl py-3 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--gradient-primary)", height: 48 }}
              >
                Signer et confirmer
              </button>
            </div>
          )}

          {completedDocIds.has(activeDoc.id) && (
            <div className="card-medium" style={{ padding: 24, textAlign: "center" }}>
              <Check size={24} style={{ margin: "0 auto 8px", color: "var(--terra-deep)" }} />
              <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>Document signe</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Document checklist
  return (
    <div className="min-h-dvh" style={{ padding: "0 20px", paddingBottom: 96 }}>
      <div className="max-w-lg mx-auto">
        <div style={{ textAlign: "center", marginBottom: 32, marginTop: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 8 }}>
            Bienvenue{profile?.name ? `, ${profile.name}` : ""} !
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Avant de commencer, prends connaissance de ces documents et signe-les.
          </p>
        </div>

        {/* Progress */}
        <div className="card-medium" style={{ padding: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 8 }}>
            <span style={{ color: "var(--text-secondary)" }}>Progression</span>
            <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>{completedDocIds.size}/{docs.length}</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, overflow: "hidden", background: "var(--secondary-bg)" }}>
            <div
              style={{
                height: "100%",
                borderRadius: 999,
                transition: "all 500ms",
                width: `${docs.length > 0 ? (completedDocIds.size / docs.length) * 100 : 0}%`,
                background: "var(--gradient-primary)",
              }}
            />
          </div>
        </div>

        {/* Document list */}
        <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {docs.map((doc) => {
            const done = completedDocIds.has(doc.id);
            return (
              <button
                key={doc.id}
                onClick={() => setActiveDoc(doc)}
                className="card-light"
                style={{
                  width: "100%",
                  padding: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  textAlign: "left",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    background: done ? "var(--terra-deep)" : "var(--secondary-bg)",
                  }}
                >
                  {done ? (
                    <Check size={18} strokeWidth={2.5} style={{ color: "#fff" }} />
                  ) : (
                    <FileText size={18} strokeWidth={1.5} style={{ color: "var(--text-tertiary)" }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: done ? "var(--text-tertiary)" : "var(--text-primary)",
                    textDecoration: done ? "line-through" : "none",
                  }}>
                    {doc.title}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "capitalize" }}>{doc.category}</p>
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
              </button>
            );
          })}
        </div>

        {docs.length === 0 && (
          <div style={{ textAlign: "center", paddingTop: 32, paddingBottom: 32 }}>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Aucun document d&apos;onboarding configure</p>
            <button
              onClick={completeOnboarding}
              className="rounded-xl px-4 py-2 text-sm font-medium text-white"
              style={{ background: "var(--gradient-primary)", marginTop: 16 }}
            >
              Continuer vers l&apos;app
            </button>
          </div>
        )}

        {/* Complete button */}
        {allRequiredDone && docs.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <button
              onClick={completeOnboarding}
              className="w-full rounded-xl text-base font-medium text-white"
              style={{ background: "var(--gradient-primary)", height: 48 }}
            >
              Commencer a utiliser Shift
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
