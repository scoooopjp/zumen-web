"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  ctaLabel?: string;
  /** track() に渡す訴求コンテキスト (例: "bookmark_blueprint") */
  source: string;
}

export default function AppGatedActionDialog({
  open,
  onClose,
  title,
  description,
  ctaLabel,
  source,
}: Props) {
  const t = useTranslations("AppGate");
  const resolvedCta = ctaLabel ?? t("defaultCta");
  useEffect(() => {
    if (!open) return;
    track("app_prompt_shown", { source });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, source]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-gate-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
    >
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />

      <div
        className="relative w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 mx-0 sm:mx-4 mb-0 sm:mb-0"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div
          className="w-12 h-1 mx-auto rounded-full mb-4 sm:hidden"
          style={{ background: "var(--border)" }}
          aria-hidden="true"
        />

        <div className="flex items-start gap-3 mb-3">
          <div
            className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--amber-pale)" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ color: "var(--amber)" }}
              aria-hidden="true"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="flex-1 pt-0.5">
            <span
              className="text-[10px] font-bold tracking-wider uppercase"
              style={{ color: "var(--amber)" }}
            >
              {t("appOnlyBadge")}
            </span>
            <h2 id="app-gate-title" className="font-bold text-lg" style={{ color: "var(--navy-deep)" }}>
              {title}
            </h2>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>

        <a
          href={APP_STORE_URL}
          onClick={() => track("app_prompt_cta_click", { source })}
          className="btn-primary w-full justify-center text-sm"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
          {resolvedCta}
        </a>

        <button
          type="button"
          onClick={onClose}
          className="w-full text-sm mt-2 py-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}
