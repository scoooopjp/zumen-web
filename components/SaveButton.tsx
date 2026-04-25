"use client";

import { useIsBookmarked, useToggleBookmark } from "@/lib/useBookmarks";
import { track } from "@/lib/analytics";

interface Props {
  slug: string;
}

/**
 * 設計図のブックマークボタン。localStorage ベースでサインイン不要。
 * 保存した設計図は /bookmarks から一覧できる。
 */
export default function SaveButton({ slug }: Props) {
  const saved = useIsBookmarked(slug);
  const toggle = useToggleBookmark(slug);

  return (
    <button
      onClick={() => {
        track(saved ? "bookmark_removed" : "bookmark_added", { slug });
        toggle();
      }}
      aria-label={saved ? "ブックマーク解除" : "設計図をブックマーク"}
      aria-pressed={saved}
      className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
      style={{
        background: saved ? "var(--amber-pale)" : "var(--surface)",
        border: `1px solid ${saved ? "var(--amber)" : "var(--border)"}`,
        color: saved ? "var(--amber)" : "var(--text-secondary)",
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
