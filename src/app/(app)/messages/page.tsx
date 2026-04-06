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
      <div className="p-4 pb-28 max-w-lg mx-auto">
        <div className="glass-card p-6 text-center">
          <p className="text-muted-foreground">Acces reserve au patron</p>
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
      <div className="p-4 pb-28 max-w-lg mx-auto space-y-4">
        <div className="bg-card rounded-lg animate-pulse h-10 w-1/2" />
        <div className="bg-card rounded-lg animate-pulse h-32" />
        {[1, 2].map((i) => (
          <div key={i} className="bg-card rounded-lg animate-pulse h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Messages</h1>

      {/* Compose */}
      <div className="glass-card p-4 space-y-3">
        <h3 className="text-base font-semibold tracking-tight">Nouveau message</h3>

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

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setPriority("normal")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                priority === "normal" ? "text-white" : "pill"
              }`}
              style={priority === "normal" ? { background: "var(--gradient-primary)" } : undefined}
            >
              Normal
            </button>
            <button
              onClick={() => setPriority("urgent")}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                priority === "urgent" ? "bg-destructive text-white" : "pill"
              }`}
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

      {/* Message history */}
      <div>
        <h3 className="text-base font-semibold tracking-tight mb-2">Historique</h3>
        <div className="space-y-2 stagger-children">
          {messages.map((msg) => (
            <div key={msg.id} className="relative">
              <MessageBanner
                content={msg.content}
                author={`${msg.title} · ${formatDateFr(msg.date)}`}
                priority={msg.priority}
              />
              <button
                onClick={() => handleDelete(msg.id)}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg hover:bg-secondary"
                aria-label="Supprimer"
              >
                <Trash2 size={13} className="text-destructive" />
              </button>
            </div>
          ))}

          {messages.length === 0 && (
            <div className="glass-card p-6 text-center">
              <p className="text-sm text-muted-foreground">Aucun message</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
