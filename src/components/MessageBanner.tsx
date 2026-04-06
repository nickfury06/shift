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
      className="card-heavy"
      style={{
        borderLeft: "3px solid var(--terra-medium, #C4785A)",
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
