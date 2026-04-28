"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import { haptic } from "@/lib/haptics";
import { getShiftDate, formatDateFr } from "@/lib/shift-utils";
import { markMessageRead } from "@/lib/message-reads";
import type { ManagerMessage, MessageRead } from "@/lib/types";
import { Send, Trash2, MessageCircle, Eye } from "lucide-react";
import EmptyState from "@/components/EmptyState";

export default function MessagesPage() {
  const { profile, user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirm();
  const supabase = useRef(createClient()).current;

  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [allUserIds, setAllUserIds] = useState<string[]>([]);
  const [reads, setReads] = useState<MessageRead[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose state — just content + date
  const [content, setContent] = useState("");
  const [date, setDate] = useState(getShiftDate());
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    const [{ data: msgs }, { data: profs }, { data: rds }] = await Promise.all([
      supabase.from("messages").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).limit(30),
      supabase.from("profiles").select("id, name"),
      supabase.from("message_reads").select("*"),
    ]);
    setMessages(msgs || []);
    const map: Record<string, string> = {};
    const ids: string[] = [];
    profs?.forEach((p: { id: string; name: string }) => { map[p.id] = p.name; ids.push(p.id); });
    setProfiles(map);
    setAllUserIds(ids);
    setReads((rds as MessageRead[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Realtime subscription on message_reads so the patron's "X/N ont lu"
  // counter ticks up live as teammates open the app.
  useEffect(() => {
    const ch = supabase.channel("messages-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads" }, () => fetchMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, fetchMessages]);

  // Mark every visible message as read by the current user. We only fire
  // the upsert once per (message_id, user_id) pair per session — RLS would
  // accept duplicates but it's wasted traffic.
  const markedThisSession = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    const myReadSet = new Set(reads.filter((r) => r.user_id === user.id).map((r) => r.message_id));
    messages.forEach((m) => {
      if (myReadSet.has(m.id)) return;
      if (markedThisSession.current.has(m.id)) return;
      markedThisSession.current.add(m.id);
      markMessageRead(supabase, m.id, user.id);
    });
  }, [messages, reads, user, supabase]);

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
  const isPatron = profile?.role === "patron";

  // Reader audience for a message = all users except the sender.
  // If you sent it, the denominator excludes you.
  function readersFor(msg: ManagerMessage): { read: string[]; pending: string[] } {
    const audience = allUserIds.filter((id) => id !== msg.created_by);
    const readSet = new Set(reads.filter((r) => r.message_id === msg.id).map((r) => r.user_id));
    return {
      read: audience.filter((id) => readSet.has(id)),
      pending: audience.filter((id) => !readSet.has(id)),
    };
  }

  return (
    <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Messages</h1>

        {/* Compose — content + date, author auto-detected */}
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
              const canDelete = isPatron || msg.created_by === user?.id;
              const { read, pending } = readersFor(msg);
              const totalAudience = read.length + pending.length;
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

                    {/* Read receipts — patron + sender both see this */}
                    {(isPatron || msg.created_by === user?.id) && totalAudience > 0 && (
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 8,
                          marginTop: 10, paddingTop: 10,
                          borderTop: "1px solid var(--border-color)",
                        }}
                      >
                        <Eye size={12} style={{ color: "var(--text-tertiary)" }} />
                        <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 500 }}>
                          {read.length}/{totalAudience} ont lu
                        </span>
                        <div style={{ display: "flex", gap: 3, marginLeft: "auto", flexWrap: "wrap" }}>
                          {[...read.map((id) => ({ id, status: "read" as const })), ...pending.map((id) => ({ id, status: "pending" as const }))].slice(0, 8).map(({ id, status }) => (
                            <div
                              key={id}
                              title={`${profiles[id] || "?"} · ${status === "read" ? "lu" : "pas encore"}`}
                              style={{
                                width: 22, height: 22, borderRadius: "50%",
                                background: status === "read" ? "var(--terra-medium)" : "var(--secondary-bg)",
                                color: status === "read" ? "#fff" : "var(--text-tertiary)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 10, fontWeight: 600,
                                opacity: status === "read" ? 1 : 0.6,
                                border: status === "read" ? "none" : "1px dashed var(--border-color)",
                              }}
                            >
                              {(profiles[id] || "?")[0]}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
