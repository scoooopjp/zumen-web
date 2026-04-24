"use client";

import LottieIcon from "./LottieIcon";
import { track } from "@/lib/analytics";

interface AppStoreCTAProps {
  variant?: "primary" | "banner" | "inline";
  title?: string;
  description?: string;
}

const APP_STORE_URL =
  "https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625";

export default function AppStoreCTA({
  variant = "primary",
  title = "カスタム設計はアプリで",
  description = "自分のサイズに合わせた設計図・材料リストをその場で生成。無料で試せます。",
}: AppStoreCTAProps) {
  const onClick = () => track("app_store_click", { variant });

  /* ── Banner variant ── */
  if (variant === "banner") {
    return (
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-mid) 100%)",
          position: "relative",
        }}
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px)," +
              "linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 p-8 md:p-10">
          <div>
            <p className="section-label mb-2" style={{ color: "var(--amber-light)" }}>
              App 限定機能
            </p>
            <p className="text-xl font-bold text-white">{title}</p>
            <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              {description}
            </p>
          </div>
          <a href={APP_STORE_URL} onClick={onClick} className="btn-amber shrink-0 text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            App Store でダウンロード
          </a>
        </div>
      </div>
    );
  }

  /* ── Inline variant ── */
  if (variant === "inline") {
    return (
      <div
        className="zumen-card flex items-center gap-4 p-5"
      >
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--amber-pale)" }}
        >
          <LottieIcon name="pencil" size={44} ariaLabel={title} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold" style={{ color: "var(--navy-deep)" }}>{title}</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{description}</p>
        </div>
        <a href={APP_STORE_URL} onClick={onClick} className="btn-primary shrink-0 text-sm" style={{ padding: "9px 18px", borderRadius: "10px" }}>
          無料
        </a>
      </div>
    );
  }

  /* ── Primary (default) ── */
  return (
    <div className="zumen-card p-6 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "var(--navy-deep)" }}
          aria-hidden="true"
        >
          {/* Mini ZUMEN icon */}
          <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
            <path d="M10 10h20v4L14 30h16v4H10v-4l16-16H10v-4z" fill="white" fillRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="font-bold" style={{ color: "var(--navy-deep)" }}>{title}</p>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>{description}</p>
        </div>
      </div>
      <a href={APP_STORE_URL} onClick={onClick} className="btn-primary text-sm justify-center">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
        </svg>
        無料でダウンロード (iPhone)
      </a>
    </div>
  );
}
