"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export default function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "32px 20px",
        gap: 12,
      }}
    >
      {icon && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "var(--secondary-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-tertiary)",
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>
          {title}
        </div>
        {message && (
          <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: 300 }}>
            {message}
          </div>
        )}
      </div>
      {action && (action.href ? (
        <Link
          href={action.href}
          style={{
            marginTop: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            color: "#fff",
            background: "var(--gradient-primary)",
            textDecoration: "none",
            minHeight: 40,
          }}
        >
          {action.label}
        </Link>
      ) : (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "9px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            color: "#fff",
            background: "var(--gradient-primary)",
            border: "none",
            cursor: "pointer",
            minHeight: 40,
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
