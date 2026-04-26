import type { Metadata } from "next";
import Link from "next/link";
import BlueprintCard from "@/components/BlueprintCard";
import AppStoreCTA from "@/components/AppStoreCTA";
import ExampleCard from "@/components/ExampleCard";
import LottieIcon from "@/components/LottieIcon";
import RecentlyViewed from "@/components/RecentlyViewed";
import { categories } from "@/lib/data";
import { fetchExamples } from "@/lib/examples";
import { fetchUseCases, fetchFeaturedUseCases, fetchExampleCountsByUseCase } from "@/lib/firestore";

export const dynamic = "force-dynamic";

/* ─── SEO Metadata ─── */
export const metadata: Metadata = {
  title: "ZUMEN｜DIY設計図・木材リスト自動生成アプリ",
  description:
    "棚・ベンチ・ウッドデッキなど22種のDIY設計図を無料公開。サイズを入力するだけでカインズ・コメリ・コーナン・DCM別の木材リストと費用を自動計算。初心者から上級者まで使えるDIY支援サービス。",
  keywords: ["DIY", "設計図", "木材リスト", "カインズ", "コメリ", "コーナン", "DCM", "棚", "ウッドデッキ", "2×4", "SPF材"],
  openGraph: {
    title: "ZUMEN｜DIY設計図・木材リスト自動生成アプリ",
    description:
      "棚・ベンチ・ウッドデッキなど22種のDIY設計図。サイズ入力でカインズ・コメリ別の材料リストを自動生成。",
    type: "website",
    locale: "ja_JP",
    images: [{ url: "/opengraph-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZUMEN｜DIY設計図・木材リスト自動生成",
    description: "22種の設計図から材料リストを自動生成。カインズ・コメリ対応。",
    images: ["/opengraph-image.png"],
  },
  alternates: { canonical: "https://zumen.scoooop.com/" },
};

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
        { "@type": "Offer", "price": "370", "priceCurrency": "JPY", "name": "カスタム設計（単発）" },
        { "@type": "Offer", "price": "480", "priceCurrency": "JPY", "name": "プレミアム月額" },
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

const features: Array<{ lottie: string; title: string; desc: string; appOnly?: boolean }> = [
  {
    lottie: "ruler",
    title: "22種の設計図",
    desc: "棚・ベンチ・デッキなど、厳選されたプロ品質の設計図を無料公開。",
  },
  {
    lottie: "pencil",
    title: "カスタム設計",
    desc: "幅・高さを入力するだけで最適な材料構成と費用を自動算出。アプリ限定機能。",
    appOnly: true,
  },
  {
    lottie: "storefront",
    title: "ホームセンター別リスト",
    desc: "カインズ・コメリ別に最適な材料と価格を自動選定。",
  },
  {
    lottie: "cameraFlash",
    title: "作例ギャラリー",
    desc: "実際に作った人のコスト・写真・サイズを参考にできる。",
  },
];

export default async function HomePage() {
  const [useCasesData, featuredUseCases, allExamples, exampleCounts] = await Promise.all([
    fetchUseCases(),
    fetchFeaturedUseCases(6),
    fetchExamples(),
    fetchExampleCountsByUseCase(),
  ]);
  const featuredExamples = allExamples.slice(0, 3);
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
          <p className="section-label mb-4">DIYをちゃんと作れるまで</p>
          <h1
            className="font-bold leading-tight"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)", color: "var(--navy-deep)", letterSpacing: "-0.03em" }}
          >
            つくりたいを、
            <br />
            <span style={{ color: "var(--amber)" }}>つくれる</span>に。
          </h1>
          <p
            className="mt-5 mx-auto leading-relaxed"
            style={{ fontSize: "1.0625rem", color: "var(--text-secondary)", maxWidth: "480px" }}
          >
            設計図から木材リスト・工程・費用まで。
            <br className="hidden sm:block" />
            DIYを「良さそう」で終わらせないサービス。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Link href="/category" className="btn-primary">
              設計図を見る
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a href={APP_STORE_URL} className="btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              App Store (無料)
            </a>
          </div>
          {/* Social proof */}
          <p className="mt-6 text-xs flex flex-wrap justify-center gap-x-3 gap-y-1" style={{ color: "var(--text-tertiary)" }}>
            <span className="whitespace-nowrap">iOS 17以上対応</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">完全無料で閲覧可能</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">カスタム設計はアプリ限定</span>
          </p>
        </div>
      </section>

      {/* ── カテゴリ ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2
          className="font-bold mb-8"
          style={{ fontSize: "1.375rem", color: "var(--navy-deep)" }}
        >
          カテゴリから探す
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="zumen-card flex flex-col items-center gap-2 p-4 text-center group"
            >
              <span className="text-3xl">{categoryIcon[cat.name] ?? "🪚"}</span>
              <p
                className="font-semibold text-sm leading-tight"
                style={{ color: "var(--navy-deep)" }}
              >
                {cat.name}
              </p>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                {useCasesData.filter((uc) => uc.categorySlug === cat.slug).length}件
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 設計図一覧 ────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold" style={{ fontSize: "1.375rem", color: "var(--navy-deep)" }}>
            人気の設計図
          </h2>
          <Link href="/category" style={{ color: "var(--amber)", fontSize: "0.875rem", fontWeight: 600 }}>
            すべて見る →
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
              <p className="section-label mb-1">みんなの作品</p>
              <h2 className="font-bold" style={{ fontSize: "1.375rem", color: "var(--navy-deep)" }}>
                作例ピックアップ
              </h2>
            </div>
            <Link href="/example" style={{ color: "var(--amber)", fontSize: "0.875rem", fontWeight: 600 }}>
              すべて見る →
            </Link>
          </div>
          <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
            ZUMENユーザーが実際に作った作品。実費・制作時間のリアルな参考に。
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
          <p className="section-label text-center mb-3">できること</p>
          <h2 className="font-bold text-center mb-12" style={{ fontSize: "1.5rem", color: "var(--navy-deep)" }}>
            設計から完成まで、まるごとサポート
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
                        App 限定
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
        <p className="section-label mb-3">対応ホームセンター</p>
        <h2 className="font-bold mb-8" style={{ fontSize: "1.375rem", color: "var(--navy-deep)" }}>
          お近くのホームセンターで
          <br className="sm:hidden" />
          そのまま買い物リストに
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { slug: "cainz",  name: "カインズ",  emoji: "🔵" },
            { slug: "komeri", name: "コメリ",    emoji: "🔴" },
            { slug: "kohnan", name: "コーナン",  emoji: "🟠" },
            { slug: "dcm",    name: "DCM",        emoji: "🟢" },
          ].map((store) => (
            <Link
              key={store.slug}
              href={`/store/${store.slug}`}
              className="zumen-card flex flex-col items-center gap-3 p-6 w-32"
            >
              <span className="text-4xl">{store.emoji}</span>
              <span className="font-bold text-sm" style={{ color: "var(--navy-deep)" }}>
                {store.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ── App CTA ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <AppStoreCTA
          variant="banner"
          title="カスタム設計はアプリで"
          description="幅・奥行・高さを入力するだけ。カインズ・コメリ別の材料リストと費用を即座に生成。"
        />
      </section>
    </>
  );
}
