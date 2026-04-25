"use client";

import { useState } from "react";
import AppGatedActionDialog from "./AppGatedActionDialog";
import { track } from "@/lib/analytics";

interface Props {
  kind: "blueprint" | "example";
}

const COPY = {
  blueprint: {
    source: "bookmark_blueprint",
    title: "ブックマークはアプリ限定",
    description:
      "保存した設計図はアプリでいつでも見返せます。サイズ変更や材料リスト生成もそのまま続けられます。",
  },
  example: {
    source: "bookmark_example",
    title: "作例ブックマークはアプリ限定",
    description:
      "気になった作例をアプリに保存して、自分で作るときにすぐ見返せます。",
  },
} as const;

export default function SaveButton({ kind }: Props) {
  const [open, setOpen] = useState(false);
  const copy = COPY[kind];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          track("bookmark_click", { kind });
          setOpen(true);
        }}
        aria-label="ブックマーク（アプリ限定）"
        className="flex items-center justify-center w-9 h-9 rounded-xl transition-colors"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--text-secondary)",
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      </button>
      <AppGatedActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={copy.title}
        description={copy.description}
        source={copy.source}
        ctaLabel="App Store でアプリを開く"
      />
    </>
  );
}
