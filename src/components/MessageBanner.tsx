"use client";

import type { ManagerMessage, Profile } from "@/lib/types";

interface MessageBannerProps {
  message: ManagerMessage;
  authorName?: string;
}

export default function MessageBanner({ message, authorName }: MessageBannerProps) {
  return (
    <div className="p-3 rounded-lg border-l-[3px] border-l-primary bg-card">
      <p className="text-sm">{message.content}</p>
      {authorName && (
        <p className="text-xs text-muted-foreground mt-1">— {authorName}</p>
      )}
    </div>
  );
}
