"use client";

import type { ManagerMessage } from "@/lib/types";

interface MessageBannerProps {
  message: ManagerMessage;
  authorName?: string;
}

export default function MessageBanner({ message, authorName }: MessageBannerProps) {
  return (
    <div
      className="glass-card p-4 border-l-[3px] transition-all"
      style={{ borderLeftColor: "var(--color-primary)" }}
    >
      <p className="text-sm leading-relaxed">{message.content}</p>
      {authorName && (
        <p className="text-xs text-muted-foreground mt-2">— {authorName}</p>
      )}
    </div>
  );
}
