"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { getShiftDate } from "@/lib/shift-utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import type { ManagerMessage } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function MessagesPage() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const today = getShiftDate();

  const [messages, setMessages] = useState<ManagerMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [content, setContent] = useState("");
  const [date, setDate] = useState(today);

  useEffect(() => {
    if (profile && profile.role !== "patron") {
      router.push("/ce-soir");
      return;
    }
    if (!user) return;

    async function load() {
      const [{ data: msgs }, { data: profs }] = await Promise.all([
        supabase.from("messages").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, name"),
      ]);
      setMessages(msgs || []);
      const map: Record<string, string> = {};
      profs?.forEach((p: { id: string; name: string }) => { map[p.id] = p.name; });
      setProfiles(map);
    }
    load();
  }, [profile, user, router, supabase]);

  async function handlePublish() {
    if (!content.trim() || !user) return;
    const { data } = await supabase.from("messages").insert({
      content: content.trim(), date, created_by: user.id,
    }).select().single();
    if (data) setMessages((prev) => [data, ...prev]);
    setContent("");
  }

  async function handleDelete(id: string) {
    await supabase.from("messages").delete().eq("id", id);
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  if (!profile || profile.role !== "patron") return null;

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      <h1 className="text-xl font-semibold tracking-tight mb-4">Messages</h1>

      {/* Compose */}
      <div className="mb-6 p-4 rounded-lg glass-card space-y-3">
        <Textarea
          placeholder="Message pour l'équipe..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Pour le :</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        </div>
        <Button className="w-full" onClick={handlePublish} disabled={!content.trim()}>
          Publier
        </Button>
      </div>

      {/* Message history */}
      <div className="space-y-2">
        {messages.map((m) => {
          const isPast = m.date < today;
          return (
            <div key={m.id} className={`p-3 rounded-lg glass-card border-l-[3px] ${m.date === today ? "border-l-primary" : "border-l-border"} ${isPast ? "opacity-50" : ""}`}>
              <p className="text-sm">{m.content}</p>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">
                  {profiles[m.created_by] || "?"} · {m.date}
                </span>
                <button onClick={() => handleDelete(m.id)} className="text-xs text-destructive">Supprimer</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
