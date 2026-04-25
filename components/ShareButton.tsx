"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

interface Props {
  title: string;
  text?: string;
}

export default function ShareButton({ title, text }: Props) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    track("share_click", { url });
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // user canceled — silent
      }
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {
        // ignore
      }
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
      style={{
        background: "var(--surface)",
        color: "var(--text-secondary)",
        border: "1px solid var(--border)",
      }}
      aria-label="シェア"
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? "コピー済み" : "シェア"}
    </button>
  );
}
