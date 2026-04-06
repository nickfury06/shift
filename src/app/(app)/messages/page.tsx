"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate, formatDateFr } from "@/lib/shift-utils";
import type { ManagerMessage } from "@/lib/types";
import MessageBanner from "@/components/MessageBanner";
import { Send, Trash2 } from "lucide-react";

export default function MessagesPage() {
  const { profile } = useAuth();
  const supabase = useRef(createClient()).current;

  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [sending, setSending] = useState(false);

  const shiftDate = getShiftDate();

  const fetchMessages = useCallback(async () => {
    const { data } = await supabase
      .from("manager_messages")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);
    setMessages((data as ManagerMessage[]) || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Guard: patron only
  if (profile && profile.role !== "patron") {
    return (
      <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div className="card-medium" style={{ padding: 24, textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)" }}>Acces reserve au patron</p>
        </div>
      </div>
    );
  }

  async function handleSend() {
    if (!title.trim() || !content.trim() || !profile) return;
    setSending(true);

    await supabase.from("manager_messages").insert({
      title: title.trim(),
      content: content.trim(),
      date: shiftDate,
      priority,
      created_by: profile.id,
    });

    setTitle("");
    setContent("");
    setPriority("normal");
    setSending(false);
    fetchMessages();
  }

  async function handleDelete(id: string) {
    await supabase.from("manager_messages").delete().eq("id", id);
    fetchMessages();
  }

  if (loading) {
    return (
      <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card-light" style={{ height: 40, width: "50%", borderRadius: 8, opacity: 0.5 }} />
          <div className="card-light" style={{ height: 128, borderRadius: 8, opacity: 0.5 }} />
          {[1, 2].map((i) => (
            <div key={i} className="card-light" style={{ height: 80, borderRadius: 8, opacity: 0.5 }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 20px", paddingBottom: 96 }} className="max-w-lg mx-auto">
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary)", paddingTop: 16 }}>Messages</h1>

        {/* Compose */}
        <div className="card-medium" style={{ padding: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p className="section-label">Nouveau message</p>

            <input
              type="text"
              placeholder="Titre / auteur"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-input px-3 py-2 text-sm outline-none"
            />

            <textarea
              placeholder="Contenu du message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl bg-input px-3 py-2 text-sm outline-none resize-none"
              rows={3}
            />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setPriority("normal")}
                  className={`pill ${priority === "normal" ? "text-white" : ""}`}
                  style={priority === "normal" ? { background: "var(--gradient-primary)", color: "#fff" } : undefined}
                >
                  Normal
                </button>
                <button
                  onClick={() => setPriority("urgent")}
                  className={`pill ${priority === "urgent" ? "bg-destructive text-white" : ""}`}
                >
                  Urgent
                </button>
              </div>

              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !content.trim()}
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Send size={14} />
                Envoyer
              </button>
            </div>
          </div>
        </div>

        {/* Message history */}
        <div>
          <p className="section-label" style={{ marginBottom: 8 }}>Historique</p>
          <div className="stagger" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className="card-heavy"
                style={{
                  position: "relative",
                  borderLeft: `3px solid ${msg.priority === "urgent" ? "var(--destructive)" : "var(--terra-deep)"}`,
                  padding: 16,
                }}
              >
                <div style={{ paddingRight: 32 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>{msg.content}</p>
                  <p style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 4 }}>{msg.title} · {formatDateFr(msg.date)}</p>
                </div>
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="flex items-center justify-center rounded-lg hover:bg-secondary"
                  style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28 }}
                  aria-label="Supprimer"
                >
                  <Trash2 size={13} className="text-destructive" />
                </button>
              </div>
            ))}

            {messages.length === 0 && (
              <div className="card-light" style={{ padding: 24, textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Aucun message</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
