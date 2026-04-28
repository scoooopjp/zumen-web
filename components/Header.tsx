import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function Header() {
  const t = useTranslations("Header");
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: "rgba(245,240,232,0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderColor: "var(--border)",
      }}
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
        {/* Logo */}
        <Link href="/" className="flex items-center group shrink-0" aria-label={t("homeAriaLabel")}>
          <Image
            src="/images/zumen_logo.png"
            alt="ZUMEN"
            width={130}
            height={70}
            className="h-7 sm:h-8 w-auto object-contain transition-opacity group-hover:opacity-80"
            priority
          />
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-3 sm:gap-5 text-sm" aria-label={t("mainNavAriaLabel")}>
          <Link
            href="/category"
            className="font-medium transition-colors hover:opacity-70 whitespace-nowrap"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("browseBlueprints")}
          </Link>
          <Link
            href="/example"
            className="font-medium transition-colors hover:opacity-70 whitespace-nowrap"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("examples")}
          </Link>
          <Link
            href="/search"
            className="font-medium transition-colors hover:opacity-70 whitespace-nowrap"
            style={{ color: "var(--text-secondary)" }}
            aria-label={t("search")}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </Link>
          <a
            href="https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625"
            className="btn-primary text-sm whitespace-nowrap inline-flex items-center gap-1.5"
            style={{ borderRadius: "10px", padding: "7px 14px" }}
            aria-label={t("appStoreAriaLabel")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <span className="hidden sm:inline">{t("appStore")}</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
