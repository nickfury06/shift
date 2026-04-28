"use client";

/**
 * Messages — équipe instant messaging.
 *
 * WhatsApp-style chat: bubbles, avatars, day separators, relative
 * timestamps, realtime push. No more date picker — messages are tied
 * to "now". Read receipts (message_reads) drive an audit trail visible
 * to patron + sender ("5/7 ont lu").
 */

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { createClient } from "@/lib/supabase/client";
import { haptic } from "@/lib/haptics";
import { getShiftDate } from "@/lib/shift-utils";
import { markMessageRead } from "@/lib/message-reads";
import type { ManagerMessage, MessageRead } from "@/lib/types";
import { Send, Trash2, MessageCircle, Eye } from "lucide-react";
import EmptyState from "@/components/EmptyState";

// ── Date helpers ──────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / (24 * 3600 * 1000));
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = dayDiff(d, now);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff > 0 && diff < 7) {
    return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: diff > 365 ? "numeric" : undefined });
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffSec = (Date.now() - d.getTime()) / 1000;
  if (diffSec < 60) return "à l'instant";
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 24 * 3600) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

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

  // Compose state — pure chat: no date, no metadata. Just text.
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    const [{ data: msgs }, { data: profs }, { data: rds }] = await Promise.all([
      supabase.from("messages").select("*").order("created_at", { ascending: false }).limit(50),
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

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime: messages + reads → instant chat feel
  useEffect(() => {
    const ch = supabase.channel("messages-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads" }, () => fetchMessages())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, fetchMessages]);

  // Auto-mark visible messages as read (once per session per id)
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
      date: getShiftDate(), // kept for back-compat; UI no longer asks
      created_by: user.id,
    });
    setSending(false);
    if (error) { toast.error("Erreur, réessaie"); haptic("error"); return; }
    haptic("success");
    setContent("");
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
    toast.success("Supprimé");
  }

  // Group messages by day. We render newest first (top), with day
  // separators between groups. Chat-style "newest at bottom" doesn't
  // suit this app's glance-and-go pattern.
  const grouped = useMemo(() => {
    const groups: { day: string; items: ManagerMessage[] }[] = [];
    messages.forEach((m) => {
      const day = dayLabel(m.created_at);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(m);
      else groups.push({ day, items: [m] });
    });
    return groups;
  }, [messages]);

  function readersFor(msg: ManagerMessage): { read: string[]; pending: string[] } {
    const audience = allUserIds.filter((id) => id !== msg.created_by);
    const readSet = new Set(reads.filter((r) => r.message_id === msg.id).map((r) => r.user_id));
    return {
      read: audience.filter((id) => readSet.has(id)),
      pending: audience.filter((id) => !readSet.has(id)),
    };
  }

  if (loading) {
    return (
      <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-light pulse" style={{ height: 64, borderRadius: 16, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  const isPatron = profile?.role === "patron";

  return (
    <div style={{ paddingTop: 16, paddingRight: 20, paddingLeft: 20, paddingBottom: 140 }} className="max-w-lg mx-auto">
      <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)", marginBottom: 4 }}>
        Messages équipe
      </h1>
      <p style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 18 }}>
        Communique en temps réel avec l&apos;équipe.
      </p>

      {/* Chat history */}
      {messages.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={24} />}
          title="Aucun message pour l'instant"
          message="Lance la conversation — note de service, info pratique, alerte rapide…"
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {grouped.map((group) => (
            <div key={group.day}>
              {/* Day separator */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                margin: "8px 0 12px",
              }}>
                <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
                <span style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--text-tertiary)",
                }}>
                  {group.day}
                </span>
                <div style={{ flex: 1, height: 1, background: "var(--border-color)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {group.items.map((msg) => {
                  const isMine = msg.created_by === user?.id;
                  const author = profiles[msg.created_by] || "?";
                  const { read, pending } = readersFor(msg);
                  const totalAudience = read.length + pending.length;
                  const showReadReceipts = (isPatron || isMine) && totalAudience > 0;
                  const canDelete = isPatron || isMine;
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: "flex",
                        flexDirection: isMine ? "row-reverse" : "row",
                        alignItems: "flex-end",
                        gap: 8,
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%",
                        background: isMine ? "var(--gradient-primary)" : "var(--secondary-bg)",
                        color: isMine ? "#fff" : "var(--text-secondary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, flexShrink: 0,
                      }}>
                        {author[0]?.toUpperCase() || "?"}
                      </div>

                      {/* Bubble */}
                      <div style={{
                        position: "relative",
                        maxWidth: "78%",
                        padding: "9px 13px",
                        borderRadius: 16,
                        background: isMine ? "var(--terra-medium)" : "var(--card-bg)",
                        color: isMine ? "#fff" : "var(--text-primary)",
                        border: isMine ? "none" : "1px solid var(--card-border)",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }}>
                        {!isMine && (
                          <div style={{
                            fontSize: 11, fontWeight: 600,
                            color: "var(--terra-medium)",
                            marginBottom: 2,
                          }}>
                            {author}
                          </div>
                        )}
                        <p style={{
                          fontSize: 14, lineHeight: 1.45,
                          margin: 0, whiteSpace: "pre-wrap",
                          color: "inherit",
                        }}>
                          {msg.content}
                        </p>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 6,
                          marginTop: 4,
                          fontSize: 10, opacity: 0.75,
                          color: isMine ? "rgba(255,255,255,0.85)" : "var(--text-tertiary)",
                        }}>
                          <span>{relativeTime(msg.created_at)}</span>
                          {showReadReceipts && (
                            <>
                              <span>·</span>
                              <Eye size={10} />
                              <span>{read.length}/{totalAudience}</span>
                            </>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(msg.id)}
                              aria-label="Supprimer"
                              style={{
                                marginLeft: "auto",
                                background: "none", border: "none", cursor: "pointer",
                                padding: 0, color: "inherit", opacity: 0.5,
                                display: "flex", alignItems: "center",
                              }}
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer — fixed at the bottom, outside the page wrapper so it
          floats above the bottom nav clearance. */}
      <div
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          left: 16, right: 16,
          maxWidth: 480,
          margin: "0 auto",
          zIndex: 30,
          background: "var(--card-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          padding: 8,
          display: "flex",
          alignItems: "flex-end",
          gap: 6,
        }}
      >
        <textarea
          placeholder="Écris un message…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={(e) => {
            // Enter (without shift) submits — chat convention. Shift+Enter for newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
          style={{
            flex: 1,
            border: "none",
            background: "var(--input-bg)",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 14,
            color: "var(--text-primary)",
            outline: "none",
            resize: "none",
            minHeight: 40,
            maxHeight: 120,
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending}
          aria-label="Envoyer"
          style={{
            width: 40, height: 40, borderRadius: 12, border: "none", cursor: "pointer",
            background: "var(--gradient-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: !content.trim() || sending ? 0.4 : 1,
            transition: "opacity 0.15s",
            flexShrink: 0,
          }}
        >
          <Send size={16} style={{ color: "#fff" }} />
        </button>
      </div>
    </div>
  );
}
