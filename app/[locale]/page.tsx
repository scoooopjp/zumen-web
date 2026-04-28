import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import BlueprintCard from "@/components/BlueprintCard";
import AppStoreCTA from "@/components/AppStoreCTA";
import ExampleCard from "@/components/ExampleCard";
import LottieIcon from "@/components/LottieIcon";
import RecentlyViewed from "@/components/RecentlyViewed";
import { categories } from "@/lib/data";
import { fetchRecentExamples } from "@/lib/examples";
import { fetchUseCases, fetchFeaturedUseCases, fetchExampleCountsByUseCase } from "@/lib/firestore";
import { localizedAlternates, SITE_BASE_URL } from "@/lib/i18nMeta";

// LP は Featured/作例ピックアップを含むため CDN キャッシュを 10 分で再検証する。
// Featured (`config/featured.popularUseCaseIds`) は人手 or バッチで更新される程度なので 10 分で十分。
export const revalidate = 600;

/* ─── SEO Metadata ─── */
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Home");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    keywords: ["DIY", "設計図", "木材リスト", "カインズ", "コメリ", "コーナン", "DCM", "棚", "ウッドデッキ", "2×4", "SPF材"],
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      type: "website",
      locale: locale === "en" ? "en_US" : "ja_JP",
      images: [{ url: `${SITE_BASE_URL}/opengraph-image`, width: 1200, height: 630, alt: "ZUMEN" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("twitterTitle"),
      description: t("twitterDescription"),
      images: [`${SITE_BASE_URL}/opengraph-image`],
    },
    alternates: localizedAlternates(locale, "/"),
  };
}

/* ─── JSON-LD Structured Data ─── */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://zumen.scoooop.com/#website",
      "url": "https://zumen.scoooop.com/",
      "name": "ZUMEN",
      "description": "DIY設計図・木材リスト自動生成サービス",
      "inLanguage": "ja",
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://zumen.scoooop.com/category?q={search_term_string}",
        },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://zumen.scoooop.com/#app",
      "name": "ZUMEN - DIY設計図・木材リスト",
      "operatingSystem": "iOS 17+",
      "applicationCategory": "LifestyleApplication",
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5.0",
        "ratingCount": "1",
      },
      "offers": [
        { "@type": "Offer", "price": "0", "priceCurrency": "JPY", "name": "基本プラン" },
        { "@type": "Offer", "price": "200", "priceCurrency": "JPY", "name": "カスタム設計（単発）" },
        { "@type": "Offer", "price": "500", "priceCurrency": "JPY", "name": "プレミアム月額" },
      ],
      "url": "https://apps.apple.com/jp/app/id6762496625",
      "downloadUrl": "https://apps.apple.com/jp/app/id6762496625",
      "screenshot": "https://zumen.scoooop.com/opengraph-image.png",
    },
    {
      "@type": "Organization",
      "@id": "https://www.scoooop.com/#org",
      "name": "SCOOOOP",
      "url": "https://www.scoooop.com",
    },
  ],
};

const APP_STORE_URL =
  "https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625";

const categoryIcon: Record<string, string> = {
  棚: "🗄️",
  本棚: "📚",
  TV台: "📺",
  ダイニングテーブル: "🍽️",
  "デスク・作業台": "🧑‍💻",
  ベンチ: "🪑",
  ガーデンテーブル: "🌳",
  ウッドデッキ: "🪵",
  ガーデンフェンス: "🌿",
  シューズラック: "👟",
  玄関収納: "🚪",
  フラワーボックス: "🌸",
  プランター台: "🪴",
  コンポスト: "♻️",
  キャットウォーク: "🐈",
  キャットタワー: "🐱",
  犬小屋: "🐕",
  ペット用収納: "🦴",
  子供用家具: "🧸",
  ハンガーラック: "👔",
  "物置・収納": "📦",
  "看板・インテリア": "🪧",
};

export default async function HomePage() {
  const t = await getTranslations("Home");
  const tFooter = await getTranslations("Footer");
  const locale = await getLocale();
  const [useCasesData, featuredUseCases, featuredExamples, exampleCounts] = await Promise.all([
    fetchUseCases(locale),
    fetchFeaturedUseCases(6, locale),
    fetchRecentExamples(3, locale),
    fetchExampleCountsByUseCase(),
  ]);
  const countsByCategory = useCasesData.reduce<Record<string, number>>((acc, uc) => {
    acc[uc.categorySlug] = (acc[uc.categorySlug] ?? 0) + 1;
    return acc;
  }, {});

  const features = [
    { lottie: "ruler", title: t("feature1Title"), desc: t("feature1Desc") },
    { lottie: "pencil", title: t("feature2Title"), desc: t("feature2Desc"), appOnly: true },
    { lottie: "storefront", title: t("feature3Title"), desc: t("feature3Desc") },
    { lottie: "cameraFlash", title: t("feature4Title"), desc: t("feature4Desc") },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        className="bp-grid relative overflow-hidden"
        style={{ paddingTop: "80px", paddingBottom: "72px" }}
      >
        {/* Ambient glow */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(217,123,42,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="max-w-5xl mx-auto px-4 text-center relative">
          <p className="section-label mb-4">{t("heroLabel")}</p>
          <h1
            className="font-bold leading-tight"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", color: "var(--navy-deep)", letterSpacing: "-0.03em" }}
          >
            {t("heroTitleLine1")}
            <br />
            <span style={{ color: "var(--amber)" }}>{t("heroTitleHighlight")}</span>
            {t("heroTitleLine2")}
          </h1>
          <p
            className="mt-5 mx-auto leading-relaxed"
            style={{ fontSize: "1.0625rem", color: "var(--text-secondary)", maxWidth: "480px" }}
          >
            {t("heroBodyLine1")}
            <br className="hidden sm:block" />
            {t("heroBodyLine2")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/category" className="btn-primary">
              {t("ctaBrowseBlueprints")}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/example" className="btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              {t("ctaBrowseExamples")}
            </Link>
            <a href={APP_STORE_URL} className="btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              {t("ctaAppStore")}
            </a>
          </div>
          {/* Social proof */}
          <p className="mt-6 text-xs flex flex-wrap justify-center gap-x-3 gap-y-1" style={{ color: "var(--text-tertiary)" }}>
            <span className="whitespace-nowrap">{t("socialProof1")}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">{t("socialProof2")}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">{t("socialProof3")}</span>
          </p>
        </div>
      </section>

      {/* ── カテゴリ ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-8 pb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h2
            className="font-bold"
            style={{ fontSize: "1.125rem", color: "var(--navy-deep)" }}
          >
            {t("categoriesTitle")}
          </h2>
          <Link
            href="/category"
            style={{ color: "var(--amber)", fontSize: "0.8125rem", fontWeight: 600 }}
          >
            {t("viewAll")}
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-shadow hover:shadow-sm"
              style={{
                background: "var(--parchment)",
                border: "0.8px solid var(--border)",
                color: "var(--navy-deep)",
              }}
            >
              <span className="text-base leading-none">{categoryIcon[cat.name] ?? "🪚"}</span>
              <span className="font-semibold">{tFooter(`categories.${cat.slug}` as never)}</span>
              <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {countsByCategory[cat.slug] ?? 0}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 設計図一覧 ────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold" style={{ fontSize: "1.375rem", color: "var(--navy-deep)" }}>
            {t("popularBlueprintsTitle")}
          </h2>
          <Link href="/category" style={{ color: "var(--amber)", fontSize: "0.875rem", fontWeight: 600 }}>
            {t("viewAll")}
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredUseCases.map((uc) => (
            <BlueprintCard key={uc.id} useCase={uc} exampleCount={exampleCounts[uc.id] ?? 0} />
          ))}
        </div>

        <RecentlyViewed useCases={useCasesData} exampleCounts={exampleCounts} />
      </section>

      {/* ── 作例ピックアップ ──────────────────────────────── */}
      {featuredExamples.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-16">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="section-label mb-1">{t("examplesLabel")}</p>
              <h2 className="font-bold" style={{ fontSize: "1.375rem", color: "var(--navy-deep)" }}>
                {t("examplesPickupTitle")}
              </h2>
            </div>
            <Link href="/example" style={{ color: "var(--amber)", fontSize: "0.875rem", fontWeight: 600 }}>
              {t("viewAll")}
            </Link>
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            {t("examplesPickupBody")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredExamples.map((ex) => (
              <ExampleCard key={ex.id} example={ex} />
            ))}
          </div>
        </section>
      )}

      {/* ── 機能紹介 ──────────────────────────────────────── */}
      <section style={{ background: "var(--parchment)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div className="max-w-5xl mx-auto px-4 py-16">
          <p className="section-label text-center mb-3">{t("featuresLabel")}</p>
          <h2 className="font-bold text-center mb-12" style={{ fontSize: "1.5rem", color: "var(--navy-deep)" }}>
            {t("featuresTitle")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="zumen-card p-6 flex gap-4 items-start"
                style={f.appOnly ? { borderColor: "rgba(217,123,42,0.35)" } : {}}
              >
                <div className="shrink-0 flex items-center justify-center" style={{ width: 64, height: 50 }}>
                  <LottieIcon name={f.lottie} size={64} ariaLabel={f.title} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold" style={{ color: "var(--navy-deep)" }}>{f.title}</p>
                    {f.appOnly && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "var(--amber-pale)", color: "var(--amber)" }}
                      >
                        {t("appOnlyBadge")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 対応ホームセンター ─────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="section-label mb-3">{t("retailersLabel")}</p>
        <h2 className="font-bold mb-8" style={{ fontSize: "1.375rem", color: "var(--navy-deep)" }}>
          {t("retailersTitle")}
          <br className="sm:hidden" />
          {t("retailersTitleSuffix")}
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { slug: "cainz",  emoji: "🔵" },
            { slug: "komeri", emoji: "🔴" },
            { slug: "kohnan", emoji: "🟠" },
            { slug: "dcm",    emoji: "🟢" },
          ].map((store) => (
            <Link
              key={store.slug}
              href={`/store/${store.slug}`}
              className="zumen-card flex flex-col items-center gap-3 p-6 w-32"
            >
              <span className="text-4xl">{store.emoji}</span>
              <span className="font-bold text-sm" style={{ color: "var(--navy-deep)" }}>
                {tFooter(`retailers.${store.slug}` as never)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── App CTA ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <AppStoreCTA
          variant="banner"
          title={t("appCtaTitle")}
          description={t("appCtaDescription")}
        />
      </section>
    </>
  );
}
