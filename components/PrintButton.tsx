"use client";

import { track } from "@/lib/analytics";

export default function PrintButton() {
  const onClick = () => {
    track("print_click", {});
    if (typeof window !== "undefined") window.print();
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
      aria-label="設計図を印刷"
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
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      印刷
    </button>
  );
}
