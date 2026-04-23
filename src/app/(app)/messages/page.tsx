"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import { haptic } from "@/lib/haptics";
import { getShiftDate, formatDateFr } from "@/lib/shift-utils";
import type { ManagerMessage } from "@/lib/types";
import { Send, Trash2, MessageCircle } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function MessagesPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const supabase = useRef(createClient()).current;

  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Compose state — just content + date
  const [content, setContent] = useState("");
  const [date, setDate] = useState(getShiftDate());
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    const [{ data: msgs }, { data: profs }] = await Promise.all([
      supabase.from("messages").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).limit(30),
      supabase.from("profiles").select("id, name"),
    ]);
    setMessages(msgs || []);
    const map: Record<string, string> = {};
    profs?.forEach((p: { id: string; name: string }) => { map[p.id] = p.name; });
    setProfiles(map);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  async function handleSend() {
    if (!content.trim() || !user) return;
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      content: content.trim(),
      date,
      created_by: user.id,
    });
    setSending(false);
    if (error) { toast.error("Erreur, réessaie"); haptic("error"); return; }
    haptic("success");
    toast.success("Message envoyé");
    setContent("");
    fetchMessages();
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: "Supprimer ce message ?",
      variant: "danger",
      confirmLabel: "Supprimer",
    });
    if (!ok) return;
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) { toast.error("Erreur, réessaie"); return; }
    toast.success("Message supprimé");
    fetchMessages();
  }

  if (loading) {
    return (
      <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-light pulse" style={{ height: 40, width: "50%", borderRadius: 8, opacity: 0.5 }} />
          <div className="card-light pulse" style={{ height: 128, borderRadius: 8, opacity: 0.5 }} />
        </div>
      </div>
    );
  }

  const today = getShiftDate();

  return (
    <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Messages</h1>

        {/* Compose — just content + date, author auto-detected */}
        <div className="card-medium" style={{ padding: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p className="section-label">Nouveau message pour l&apos;équipe</p>

            <textarea
              placeholder="Ex: client a laissé ses clés au bar · rupture de citrons..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: "100%",
                borderRadius: 12,
                background: "var(--input-bg)",
                border: "1px solid var(--border-color)",
                padding: "12px 16px",
                fontSize: 14,
                color: "var(--text-primary)",
                outline: "none",
                resize: "none",
                minHeight: 80,
              }}
              rows={3}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Pour le :</span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{
                    borderRadius: 8,
                    background: "var(--input-bg)",
                    border: "1px solid var(--border-color)",
                    padding: "4px 8px",
                    fontSize: 12,
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !content.trim()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 12,
                  padding: "8px 16px",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#fff",
                  background: "var(--gradient-primary)",
                  border: "none",
                  cursor: "pointer",
                  opacity: sending || !content.trim() ? 0.5 : 1,
                }}
              >
                <Send size={14} />
                Publier
              </button>
            </div>
          </div>
        </div>

        {/* Message history */}
        <div>
          <p className="section-label" style={{ marginBottom: 8 }}>Historique</p>
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((msg) => {
              const isPast = msg.date < today;
              const canDelete = profile?.role === "patron" || msg.created_by === user?.id;
              return (
                <div
                  key={msg.id}
                  style={{
                    position: "relative",
                    background: "var(--card-bg)",
                    border: "1px solid var(--card-border)",
                    borderLeft: "3px solid var(--terra-medium)",
                    borderRadius: 16,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.06)",
                    padding: 16,
                    opacity: isPast ? 0.5 : 1,
                  }}
                >
                  <div style={{ paddingRight: 32 }}>
                    <p style={{ fontSize: 14, color: "var(--text-primary)", lineHeight: 1.5 }}>{msg.content}</p>
                    <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>
                      — {profiles[msg.created_by] || "?"} · {formatDateFr(msg.date)}
                    </p>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(msg.id)}
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        width: 28,
                        height: 28,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: 8,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                      aria-label="Supprimer"
                    >
                      <Trash2 size={13} style={{ color: "var(--danger)" }} />
                    </button>
                  )}
                </div>
              );
            })}

            {messages.length === 0 && (
              <EmptyState
                icon={<MessageCircle size={24} />}
                title="Aucun message pour l'instant"
                message="Partage une info, une alerte ou un rappel pour l'équipe du soir."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
