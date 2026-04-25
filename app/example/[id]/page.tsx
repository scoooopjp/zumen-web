import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AppOnlyGate from "@/components/AppOnlyGate";
import Breadcrumbs from "@/components/Breadcrumbs";
import LottieIcon from "@/components/LottieIcon";
import SaveButton from "@/components/SaveButton";
import ShareButton from "@/components/ShareButton";
import { fetchExamples, formatTime } from "@/lib/examples";

interface Props {
  params: Promise<{ id: string }>;
}

// UGC は動的にFetchして最新を返す
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const examples = await fetchExamples();
  const ex = examples.find((e) => e.id === id);
  if (!ex) return {};
  return {
    title: `${ex.authorName}さんの${ex.useCaseName}作例`,
    description: `実費¥${ex.actualCost.toLocaleString()}・制作時間${formatTime(ex.actualTimeMinutes)}。${ex.comment.slice(0, 80)}`,
    robots: { index: false }, // UGC は審査後に個別で index 化
    openGraph: {
      title: `${ex.authorName}さんの${ex.useCaseName} | ZUMEN`,
      description: ex.comment,
    },
  };
}

export default async function ExampleDetailPage({ params }: Props) {
  const { id } = await params;
  const examples = await fetchExamples();
  const ex = examples.find((e) => e.id === id);
  if (!ex) notFound();

  const dimensionsLabel =
    ex.actualWidth && ex.actualDepth && ex.actualHeight
      ? `W${ex.actualWidth} × D${ex.actualDepth} × H${ex.actualHeight} mm`
      : null;

  const BASE = "https://zumen.scoooop.com";
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${ex.authorName}さんの${ex.useCaseName}作例`,
    description: ex.comment,
    ...(ex.imageURL ? { image: ex.imageURL } : {}),
    datePublished: ex.createdAt,
    author: { "@type": "Person", name: ex.authorName },
    publisher: {
      "@type": "Organization",
      name: "ZUMEN",
      logo: {
        "@type": "ImageObject",
        url: `${BASE}/images/zumen_logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE}/example/${ex.id}`,
    },
    ...(ex.useCaseSlug
      ? { about: { "@type": "Thing", name: ex.useCaseName, url: `${BASE}/blueprint/${ex.useCaseSlug}` } }
      : {}),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <Breadcrumbs
        items={[
          { name: "TOP", href: "/" },
          { name: "作例ギャラリー", href: "/example" },
          ...(ex.useCaseSlug
            ? [{ name: ex.useCaseName, href: `/blueprint/${ex.useCaseSlug}` }]
            : []),
          { name: "作例" },
        ]}
      />

      {/* 画像 */}
      <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center mb-6 overflow-hidden">
        {ex.imageURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ex.imageURL} alt={`${ex.authorName}さんの${ex.useCaseName}`} className="w-full h-full object-cover" />
        ) : (
          <LottieIcon name="photoEmpty" size={160} ariaLabel="画像なし" />
        )}
      </div>

      {/* 投稿者・日付 */}
      <div className="flex items-center justify-between mb-4">
        {ex.authorUID ? (
          <Link href={`/user/${ex.authorUID}`} className="flex items-center gap-2 hover:opacity-80">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--amber-pale)" }}>
              <span className="text-sm">👤</span>
            </div>
            <span className="font-medium text-gray-900">{ex.authorName}</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "var(--amber-pale)" }}>
              <span className="text-sm">👤</span>
            </div>
            <span className="font-medium text-gray-900">{ex.authorName}</span>
          </div>
        )}
        <span className="text-sm text-gray-400">{ex.createdAt}</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex-1 min-w-0">{ex.useCaseName}</h1>
        <div className="flex items-center gap-2 shrink-0 no-print">
          <ShareButton title={`${ex.authorName}さんの${ex.useCaseName}作例`} text={ex.comment} />
          <SaveButton kind="example" />
        </div>
      </div>
      {ex.useCaseSlug && (
        <Link href={`/blueprint/${ex.useCaseSlug}`} className="text-sm font-semibold" style={{ color: "var(--amber)" }}>
          設計図を見る →
        </Link>
      )}

      {/* スタッツ */}
      <div
        className="grid grid-cols-3 gap-3 mt-6 rounded-2xl p-4 text-center"
        style={{ background: "var(--canvas)" }}
      >
        <div>
          <p className="text-xs text-gray-400">実費</p>
          <p className="font-bold text-gray-900 mt-0.5">¥{ex.actualCost.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">制作時間</p>
          <p className="font-bold text-gray-900 mt-0.5">{formatTime(ex.actualTimeMinutes)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">ホームセンター</p>
          <p className="font-bold text-gray-900 mt-0.5">{ex.retailer}</p>
        </div>
      </div>

      {/* 実寸 */}
      {dimensionsLabel && (
        <div className="mt-4 rounded-xl px-4 py-3" style={{ background: "var(--canvas)" }}>
          <p className="text-xs text-gray-400">実寸</p>
          <p className="font-medium text-gray-700 mt-0.5">{dimensionsLabel}</p>
        </div>
      )}

      {/* コメント */}
      <div className="mt-6">
        <h2 className="font-bold text-gray-900 mb-2">コメント</h2>
        <p className="text-gray-600 leading-relaxed">{ex.comment}</p>
      </div>

      {/* 作例の投稿ゲート */}
      <div className="mt-10">
        <h2 className="font-bold text-gray-900 mb-3">あなたの作品も投稿する</h2>
        <AppOnlyGate
          title="作品を投稿する"
          description="写真・実費・ホームセンター・コメントをアプリで投稿するとギャラリーに掲載されます。"
          ctaLabel="アプリで投稿する"
        >
          <div className="p-4 space-y-2" style={{ background: "var(--surface)" }}>
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--canvas)", color: "var(--text-tertiary)" }}>
              ひとこと...
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["実費 ¥", "時間", "店舗"].map((l) => (
                <div key={l} className="rounded-lg px-2 py-2 text-xs text-center" style={{ background: "var(--canvas)", color: "var(--text-tertiary)" }}>{l}</div>
              ))}
            </div>
          </div>
        </AppOnlyGate>
      </div>

      {/* App CTA */}
      <div className="mt-10">
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-mid) 100%)" }}
        >
          <p className="font-bold text-white mb-1">自分も作ってみるならアプリへ</p>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.65)" }}>
            カスタムサイズの設計図・ホームセンター別の材料リストを無料で生成。
          </p>
          <a
            href="https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625"
            className="btn-amber text-sm"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store でダウンロード（無料）
          </a>
        </div>
      </div>
    </div>
  );
}
