"use client";

interface MessageBannerProps {
  content: string;
  author: string;
  priority?: "normal" | "urgent";
}

export default function MessageBanner({ content, author, priority = "normal" }: MessageBannerProps) {
  return (
    <div
      className="glass-card p-4"
      style={{ borderLeft: "3px solid var(--color-primary)" }}
    >
      <p className={`text-sm ${priority === "urgent" ? "font-semibold" : ""}`}>
        {content}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">{author}</p>
    </div>
  );
}
