"use client";

interface MessageBannerProps {
  content: string;
  author: string;
  priority?: "normal" | "urgent";
}

export default function MessageBanner({
  content,
  author,
  priority = "normal",
}: MessageBannerProps) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
        borderLeft: "3px solid var(--terra-medium, #C4785A)",
        borderRadius: 16,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 6px 20px rgba(0,0,0,0.06)",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 400,
          color: "var(--text-primary)",
          lineHeight: 1.5,
        }}
      >
        {content}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: "var(--text-secondary)",
          marginTop: 10,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <span style={{ color: "var(--text-tertiary)" }}>&mdash;</span>
        {author}
      </div>
    </div>
  );
}
