/**
 * AppOnlyGate — アプリ限定機能のゲートUI
 *
 * Webでは機能のプレビューを表示しつつ、
 * App Store への誘導CTAを重ねてアプリへ流す。
 */

import LottieIcon from "./LottieIcon";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625";

const AppleIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

interface AppOnlyGateProps {
  title: string;
  description: string;
  ctaLabel?: string;
  children: React.ReactNode;
}

/**
 * 機能プレビューを薄く表示し、上にゲートオーバーレイを重ねる
 */
export default function AppOnlyGate({
  title,
  description,
  ctaLabel = "アプリで使う",
  children,
}: AppOnlyGateProps) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      {/* コンテンツのプレビュー（操作不可） */}
      <div
        className="pointer-events-none select-none"
        style={{ opacity: 0.35, filter: "blur(1.5px)" }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* ゲートオーバーレイ */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,252,247,0.55) 0%, rgba(255,252,247,0.92) 40%)",
        }}
      >
        {/* クラウンバッジ */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--amber-pale)" }}
        >
          <LottieIcon name="pencil" size={44} ariaLabel="カスタム設計" />
        </div>

        <div>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: "var(--amber-pale)", color: "var(--amber)" }}
            >
              App 限定
            </span>
          </div>
          <p className="font-bold text-base" style={{ color: "var(--navy-deep)" }}>{title}</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)", maxWidth: "280px" }}>
            {description}
          </p>
        </div>

        <a
          href={APP_STORE_URL}
          className="btn-primary text-sm"
          style={{ padding: "10px 24px" }}
        >
          <AppleIcon />
          {ctaLabel}
        </a>
      </div>
    </div>
  );
}
