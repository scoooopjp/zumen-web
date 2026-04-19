import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AppStoreCTA from "@/components/AppStoreCTA";
import AppOnlyGate from "@/components/AppOnlyGate";
import SaveButton from "@/components/SaveButton";
import StepIllustration from "@/components/StepIllustration";
import BlueprintCard from "@/components/BlueprintCard";
import PartPriceTag from "@/components/PartPriceTag";
import {
  getBlueprintBySlug,
  getUseCaseBySlug,
  useCases,
  formatBudget,
  formatTime,
  blueprintDetails,
  getCategoryThumbnailURL,
} from "@/lib/data";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return blueprintDetails.map((bp) => ({ slug: bp.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const bp = getBlueprintBySlug(slug);
  if (!bp) return {};
  const ogUrl = `/og?title=${encodeURIComponent(bp.name)}&category=${encodeURIComponent(bp.category)}&difficulty=${encodeURIComponent(bp.difficulty)}&budget=${encodeURIComponent(formatBudget(bp.estimatedBudgetMin, bp.estimatedBudgetMax))}`;
  return {
    title: `${bp.name} DIY 設計図`,
    description: `${bp.name}のDIY設計図。難易度${bp.difficulty}、予算${formatBudget(bp.estimatedBudgetMin, bp.estimatedBudgetMax)}、制作時間${formatTime(bp.estimatedTimeMinutes)}。カインズ・コメリ対応の材料リスト付き。`,
    alternates: { canonical: `/blueprint/${slug}` },
    openGraph: {
      title: `${bp.name} DIY 設計図 | ZUMEN`,
      description: bp.description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
  };
}

const difficultyColor: Record<string, string> = {
  "初心者向け": "bg-green-100 text-green-700",
  "中級者向け": "bg-orange-100 text-orange-700",
  "上級者向け": "bg-red-100 text-red-700",
};

export default async function BlueprintPage({ params }: Props) {
  const { slug } = await params;
  const bp = getBlueprintBySlug(slug);
  if (!bp) notFound();

  const relatedUseCases = bp.relatedSlugs
    .map((s) => getUseCaseBySlug(s))
    .filter(Boolean) as typeof useCases;

  // 構造化データ (HowTo schema)
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `${bp.name}の作り方`,
    description: bp.description,
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "JPY",
      minValue: bp.estimatedBudgetMin,
      maxValue: bp.estimatedBudgetMax,
    },
    totalTime: `PT${bp.estimatedTimeMinutes}M`,
    tool: bp.tools.map((t) => ({ "@type": "HowToTool", name: t })),
    supply: bp.parts.map((p) => ({
      "@type": "HowToSupply",
      name: `${p.name} (${p.spec}) × ${p.quantity}${p.unit}`,
    })),
    step: bp.steps.map((s) => ({
      "@type": "HowToStep",
      position: s.order,
      name: s.title,
      text: s.description,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* パンくず */}
        <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1.5">
          <Link href="/" className="hover:text-gray-600">TOP</Link>
          <span>/</span>
          <Link href="/category" className="hover:text-gray-600">設計図一覧</Link>
          <span>/</span>
          <Link href={`/category/${bp.categorySlug}`} className="hover:text-gray-600">
            {bp.category}
          </Link>
          <span>/</span>
          <span className="text-gray-600">{bp.name}</span>
        </nav>

        {/* ヒーロー */}
        {(() => {
          const thumbURL = getCategoryThumbnailURL(bp.category);
          return thumbURL ? (
            <div className="relative rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: "3/2" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={thumbURL} alt={bp.imageAlt} className="w-full h-full object-cover" />
              <span
                className="absolute bottom-3 right-3 text-[11px] px-2 py-1 rounded"
                style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.92)" }}
              >
                ※完成イメージ
              </span>
            </div>
          ) : (
            <div className="aspect-video rounded-2xl flex items-center justify-center mb-6"
              style={{ background: "var(--canvas)" }}>
              <span className="text-6xl">🪚</span>
            </div>
          );
        })()}

        {/* タイトル・バッジ・保存ボタン */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="text-sm text-gray-400">{bp.category}</p>
          <SaveButton />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{bp.name}</h1>
        <p className="text-gray-500 mt-3 leading-relaxed">{bp.description}</p>

        <div className="flex flex-wrap gap-2 mt-4">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${difficultyColor[bp.difficulty]}`}>
            {bp.difficulty}
          </span>
          <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-600">
            {formatBudget(bp.estimatedBudgetMin, bp.estimatedBudgetMax)}
          </span>
          <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-600">
            {formatTime(bp.estimatedTimeMinutes)}
          </span>
          <span className="text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-600">
            {bp.indoorOutdoor}
          </span>
        </div>

        <div className="flex gap-2 mt-3">
          {bp.supportedRetailers.map((r) => (
            <span key={r} className="text-xs px-2 py-1 border border-gray-200 rounded-full text-gray-500">
              {r}
            </span>
          ))}
        </div>

        {/* 基本寸法 */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">基本寸法</h2>
          <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
            {[
              { label: "幅 (W)", value: `${bp.dimensions.width}mm` },
              { label: "奥行 (D)", value: `${bp.dimensions.depth}mm` },
              { label: "高さ (H)", value: `${bp.dimensions.height}mm` },
            ].map((d) => (
              <div key={d.label}>
                <p className="text-xs text-gray-400">{d.label}</p>
                <p className="font-bold text-gray-900 mt-0.5">{d.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* カット図 */}
        {bp.cutItems.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-3">カット図</h2>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {/* ヘッダー */}
              <div
                className="grid text-xs font-bold px-4 py-2.5"
                style={{
                  gridTemplateColumns: "1fr 120px 40px",
                  background: "var(--canvas)",
                  color: "var(--text-secondary)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span>部材名</span>
                <span>寸法 (T×W×L mm)</span>
                <span className="text-right">数</span>
              </div>
              {/* 行 */}
              {bp.cutItems.map((item, idx) => (
                <div
                  key={idx}
                  className="grid items-center px-4 py-3"
                  style={{
                    gridTemplateColumns: "1fr 120px 40px",
                    borderBottom: idx < bp.cutItems.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "var(--amber-pale)", color: "var(--amber)" }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium" style={{ color: "var(--navy-deep)" }}>
                      {item.partName}
                    </span>
                  </div>
                  <span
                    className="text-sm font-mono"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.thickness}×{item.width}×{item.length}
                  </span>
                  <span className="text-sm font-bold text-right" style={{ color: "var(--navy-deep)" }}>
                    ×{item.quantity}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 工具一覧 */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">必要工具</h2>
          <ul className="bg-gray-50 rounded-xl divide-y divide-gray-100">
            {bp.tools.map((tool) => (
              <li key={tool} className="px-4 py-3 flex items-center gap-3 text-sm text-gray-700">
                <span className="text-green-500">✓</span>
                {tool}
              </li>
            ))}
          </ul>
        </section>

        {/* 資材一覧 */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">資材一覧</h2>
          <div className="rounded-xl divide-y overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {bp.parts.map((part, idx) => (
              <div key={idx} className="px-4 py-3 text-sm" style={{ background: "var(--surface)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{part.name}</p>
                    <p className="text-gray-400 text-xs font-mono">{part.spec}</p>
                    {part.note && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{part.note}</p>
                    )}
                  </div>
                  <p className="font-bold text-gray-700 shrink-0 mt-0.5">
                    {part.quantity} {part.unit}
                  </p>
                </div>
                {/* 購入リンク — カインズ / コメリ / コーナン / DCM (with live prices) */}
                {(part.cainzURL || part.komeriURL || part.kohnanURL || part.dcmURL) && (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {part.cainzURL && (
                      <PartPriceTag
                        href={part.cainzURL}
                        searchURL={part.komeriURL || part.kohnanURL || part.dcmURL}
                        retailer="cainz"
                        label="カインズ"
                        style={{ background: "#1565C020", color: "#1565C0", border: "1px solid #1565C040" }}
                      />
                    )}
                    {part.komeriURL && (
                      <PartPriceTag
                        href={part.komeriURL}
                        searchURL={part.komeriURL}
                        retailer="komeri"
                        label="コメリ"
                        style={{ background: "#C0000020", color: "#C00000", border: "1px solid #C0000040" }}
                      />
                    )}
                    {part.kohnanURL && (
                      <PartPriceTag
                        href={part.kohnanURL}
                        searchURL={part.kohnanURL}
                        retailer="kohnan"
                        label="コーナン"
                        style={{ background: "#E6500020", color: "#E65000", border: "1px solid #E6500040" }}
                      />
                    )}
                    {part.dcmURL && (
                      <PartPriceTag
                        href={part.dcmURL}
                        searchURL={part.dcmURL}
                        retailer="dcm"
                        label="DCM"
                        style={{ background: "#2E7D3220", color: "#2E7D32", border: "1px solid #2E7D3240" }}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 工程 */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">工程</h2>
          <ol className="space-y-6">
            {bp.steps.map((step) => (
              <li key={step.order}>
                {/* ステップヘッダー */}
                <div className="flex gap-4 mb-3">
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "var(--navy-deep)" }}>
                    {step.order}
                  </div>
                  <div className="pt-1">
                    <p className="font-bold text-gray-900">{step.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                  </div>
                </div>
                {/* ビジュアルイラスト */}
                <StepIllustration
                  stepTitle={step.title}
                  stepDescription={step.description}
                  stepOrder={step.order}
                  totalSteps={bp.steps.length}
                />
              </li>
            ))}
          </ol>
        </section>

        {/* 注意点 */}
        {bp.warnings.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-3">注意点</h2>
            <ul
              className="space-y-2 p-4 rounded-xl"
              style={{ background: "var(--amber-pale)", border: "1px solid rgba(217,123,42,0.25)" }}
            >
              {bp.warnings.map((w) => (
                <li key={w} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-orange-500 shrink-0">⚠️</span>
                  {w}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* カスタム設計 — App 限定ゲート */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">カスタム設計</h2>
          <AppOnlyGate
            title="自分のサイズで設計図を生成"
            description="幅・奥行・高さを入力するだけでカインズ・コメリ別の材料リストと費用を自動計算します。"
            ctaLabel="アプリで試す（無料）"
          >
            {/* プレビューUI — app と同じレイアウト */}
            <div className="p-5 space-y-4" style={{ background: "var(--surface)" }}>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--navy-deep)" }}>
                  寸法を入力してください (mm)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {["幅 W", "奥行 D", "高さ H"].map((label) => (
                    <div key={label}>
                      <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
                      <div
                        className="rounded-lg px-3 py-2 text-sm"
                        style={{ background: "var(--canvas)", color: "var(--text-tertiary)", border: "1px solid var(--border)" }}
                      >
                        例: 900
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
                  参考: ベーシック寸法 {bp.dimensions.width}×{bp.dimensions.depth}×{bp.dimensions.height} mm
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--navy-deep)" }}>優先ホームセンター</p>
                <div className="flex gap-2">
                  {bp.supportedRetailers.map((r) => (
                    <span
                      key={r}
                      className="text-sm px-4 py-1.5 rounded-full"
                      style={{ background: "var(--canvas)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <div
                className="w-full py-3 rounded-xl text-center font-bold text-sm text-white"
                style={{ background: "var(--navy-deep)" }}
              >
                設計図を生成する
              </div>
            </div>
          </AppOnlyGate>
        </section>

        {/* 作例 */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">作例</h2>
            <Link
              href="/example"
              className="text-sm font-semibold"
              style={{ color: "var(--amber)" }}
            >
              すべて見る →
            </Link>
          </div>
          <AppStoreCTA
            variant="inline"
            title="作例を投稿するにはアプリから"
            description="写真・実費・コメントをアプリで投稿するとここに掲載されます。"
          />
        </div>

        {/* App CTA */}
        <div className="mt-12">
          <AppStoreCTA
            title="サイズを変えてカスタム設計"
            description="アプリでは幅・奥行・高さを入力するだけで設計図と材料リストを自動生成。"
          />
        </div>

        {/* 関連設計図 */}
        {relatedUseCases.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">関連設計図</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedUseCases.map((uc) => (
                <BlueprintCard key={uc.id} useCase={uc} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
