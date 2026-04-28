"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import AppGatedActionDialog from "./AppGatedActionDialog";
import { track } from "@/lib/analytics";

interface Props {
  kind: "blueprint" | "example";
}

export default function SaveButton({ kind }: Props) {
  const t = useTranslations("Save");
  const [open, setOpen] = useState(false);
  const source = kind === "blueprint" ? "bookmark_blueprint" : "bookmark_example";
  const title = kind === "blueprint" ? t("blueprintTitle") : t("exampleTitle");
  const description = kind === "blueprint" ? t("blueprintDescription") : t("exampleDescription");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          track("bookmark_click", { kind });
          setOpen(true);
        }}
        aria-label={t("ariaLabel")}
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
        title={title}
        description={description}
        source={source}
        ctaLabel={t("ctaLabel")}
      />
    </>
  );
}
