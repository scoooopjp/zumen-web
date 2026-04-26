import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import AppStoreCTA from "@/components/AppStoreCTA";
import AppOnlyGate from "@/components/AppOnlyGate";
import BlueprintPartsTable from "@/components/BlueprintPartsTable";
import CustomDesignPreview from "@/components/CustomDesignPreview";
import PrintButton from "@/components/PrintButton";
import SaveButton from "@/components/SaveButton";
import ShareButton from "@/components/ShareButton";
import ViewRecorder from "@/components/ViewRecorder";
import StepIllustration from "@/components/StepIllustration";
import BlueprintCard from "@/components/BlueprintCard";
import ExampleCard from "@/components/ExampleCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import LottieIcon from "@/components/LottieIcon";
import RelatedNav from "@/components/RelatedNav";
import {
  getBlueprintBySlug,
  getBlueprintByTemplateID,
  getUseCaseBySlug,
  useCases,
  formatBudget,
  formatTime,
  blueprintDetails,
  getCategoryThumbnailURL,
  enrichPartWithRetailerURLs,
  retailerSlugs,
} from "@/lib/data";
import RatingsCommentsSection from "@/components/RatingsCommentsSection";
import {
  fetchUseCaseById,
  fetchBlueprintByUseCaseID,
  fetchExampleCountsByUseCase,
  fetchExamples,
  fetchComments,
  fetchRatingSummary,
} from "@/lib/firestore";
import type { FSBlueprintDetail } from "@/lib/firestore";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;
export const revalidate = 3600;

export async function generateStaticParams() {
  return blueprintDetails.map((bp) => ({ slug: bp.slug }));
}

/** UseCase・FirestoreのBlueprintDetailを返す */
async function resolvePageData(slug: string): Promise<{
  bp: (typeof blueprintDetails)[number];
  uc: Awaited<ReturnType<typeof fetchUseCaseById>>;
  fsBp: FSBlueprintDetail | null;
} | null> {
  // 1) UseCase slug / ID を先に解決し、個別の Firestore データを優先する
  const uc = await fetchUseCaseById(slug);
  if (uc?.templateID) {
    const bp = getBlueprintByTemplateID(uc.templateID) ?? getBlueprintBySlug(slug);
    if (!bp) return null;
    const fsBp = await fetchBlueprintByUseCaseID(uc.id);
    return { bp, uc, fsBp };
  }

  // 2) Firestore に個別データがないテンプレートslugはローカル定義を使う
  const direct = getBlueprintBySlug(slug);
  if (direct) {
    return { bp: direct, uc: null, fsBp: null };
  }

  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await resolvePageData(slug);
  if (!data) return {};
  const { bp, uc } = data;
  const name = uc?.name ?? bp.name;
  const difficulty = uc?.difficulty ?? bp.difficulty;
  const budgetMin = uc?.estimatedBudgetMin ?? bp.estimatedBudgetMin;
  const budgetMax = uc?.estimatedBudgetMax ?? bp.estimatedBudgetMax;
  const time = uc?.estimatedTimeMinutes ?? bp.estimatedTimeMinutes;
  const category = uc?.category ?? bp.category;
  const ogUrl = `/og?title=${encodeURIComponent(name)}&category=${encodeURIComponent(category)}&difficulty=${encodeURIComponent(difficulty)}&budget=${encodeURIComponent(formatBudget(budgetMin, budgetMax))}`;
  const description = `${name}のDIY設計図。難易度${difficulty}、予算${formatBudget(budgetMin, budgetMax)}、制作時間${formatTime(time)}。カインズ・コメリ対応の材料リスト付き。`;
  const ogTitle = `${name} DIY 設計図 | ZUMEN`;
  const ogDescription = uc?.description ?? bp.description;
  return {
    title: `${name} DIY 設計図`,
    description,
    alternates: { canonical: `/blueprint/${slug}` },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "article",
      url: `/blueprint/${slug}`,
      images: [{ url: ogUrl, width: 1200, height: 630, alt: `${name} DIY 設計図` }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
      images: [ogUrl],
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
  const data = await resolvePageData(slug);
  if (!data) notFound();

  const { bp, uc, fsBp } = data;
  const exampleCounts = await fetchExampleCountsByUseCase();
  const exampleCount = uc ? exampleCounts[uc.id] ?? 0 : 0;
  const [examples, rating, comments] = uc
    ? await Promise.all([
        exampleCount > 0 ? fetchExamples(uc.id) : Promise.resolve([]),
        fetchRatingSummary({ kind: "useCase", id: uc.id }),
        fetchComments({ kind: "useCase", id: uc.id }),
      ])
    : [[], { count: 0, average: 0 }, []];
  const previewExamples = examples.slice(0, 6);

  // use case 固有の値を優先、なければテンプレートの値にフォールバック
  const name        = uc?.name ?? fsBp?.name ?? bp.name;
  const description = uc?.description ?? bp.description;
  const difficulty  = uc?.difficulty ?? bp.difficulty;
  const budgetMin   = uc?.estimatedBudgetMin ?? bp.estimatedBudgetMin;
  const budgetMax   = uc?.estimatedBudgetMax ?? bp.estimatedBudgetMax;
  const time        = uc?.estimatedTimeMinutes ?? bp.estimatedTimeMinutes;
  const indoor      = uc?.indoorOutdoor ?? fsBp?.indoorOutdoor ?? bp.indoorOutdoor;
  const retailers   = uc?.supportedRetailers ?? bp.supportedRetailers;

  // Firestore blueprint を優先、なければローカルにフォールバック
  const dimensions = fsBp?.dimensions ?? bp.dimensions;
  const tools      = fsBp?.tools ?? bp.tools;
  const warnings   = fsBp?.warnings ?? bp.warnings;
  const steps      = fsBp?.steps ?? bp.steps;
  const cutItems   = fsBp?.cutItems ?? bp.cutItems;
  // parts: Firestore データにリテーラーURLを付与してマージ
  const parts = (fsBp?.parts ?? bp.parts).map((p) => ({
    ...p,
    ...(fsBp ? enrichPartWithRetailerURLs(p.name, p.spec) : {}),
  }));

  const relatedUseCases = bp.relatedSlugs
    .map((s) => getUseCaseBySlug(s))
    .filter(Boolean) as typeof useCases;

  // 構造化データ (HowTo schema)
  const heroImage = uc?.imageURL ?? getCategoryThumbnailURL(uc?.category ?? bp.category);
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `${name}の作り方`,
    description,
    ...(heroImage ? { image: heroImage } : {}),
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "JPY",
      minValue: budgetMin,
      maxValue: budgetMax,
    },
    totalTime: `PT${time}M`,
    tool: tools.map((t) => ({ "@type": "HowToTool", name: typeof t === "string" ? t : t.name })),
    supply: parts.map((p) => ({
      "@type": "HowToSupply",
      name: `${p.name} (${p.spec}) × ${p.quantity}${p.unit}`,
    })),
    step: steps.map((s) => ({
      "@type": "HowToStep",
      position: s.order,
      name: s.title,
      text: s.description,
    })),
    ...(rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average.toFixed(1),
            ratingCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <ViewRecorder slug={slug} />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { name: "TOP", href: "/" },
            { name: "設計図一覧", href: "/category" },
            {
              name: uc?.category ?? bp.category,
              href: `/category/${uc?.categorySlug ?? bp.categorySlug}`,
            },
            { name },
          ]}
        />

        {/* ヒーロー */}
        {heroImage ? (
          <div className="relative rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: "3/2" }}>
            <Image
              src={heroImage}
              alt={uc?.imageAlt || bp.imageAlt || `${name}の完成イメージ — ${uc?.category ?? bp.category}DIY設計図`}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="w-full h-full object-cover"
            />
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
            <LottieIcon name="saw" size={160} ariaLabel="設計図を準備中" />
          </div>
        )}

        {/* タイトル・バッジ・保存ボタン */}
        <div className="flex items-start justify-between gap-3 mb-1">
          <p className="text-sm text-gray-400">{uc?.category ?? bp.category}</p>
          <div className="flex items-center gap-2 no-print">
            <ShareButton title={`${name} DIY 設計図`} text={description} />
            <PrintButton />
            <SaveButton kind="blueprint" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
        <p className="text-gray-500 mt-3 leading-relaxed">{description}</p>

        <div className="flex flex-wrap gap-2 mt-4">
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${difficultyColor[difficulty]}`}>
            {difficulty}
          </span>
          <span
            className="text-sm px-3 py-1 rounded-full"
            style={{
              background: "var(--surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {formatBudget(budgetMin, budgetMax)}
          </span>
          <span
            className="text-sm px-3 py-1 rounded-full"
            style={{
              background: "var(--surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {formatTime(time)}
          </span>
          <span
            className="text-sm px-3 py-1 rounded-full"
            style={{
              background: "var(--surface)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border)",
            }}
          >
            {indoor}
          </span>
          {exampleCount > 0 && (
            <span
              className="text-sm px-3 py-1 rounded-full inline-flex items-center gap-1"
              style={{
                background: "var(--surface)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
              aria-label={`作例 ${exampleCount} 件`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              作例 {exampleCount}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-3">
          {retailers.map((r) => (
            <span
              key={r}
              className="text-xs px-2 py-1 rounded-full"
              style={{
                background: "var(--surface)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {r}
            </span>
          ))}
        </div>

        {/* 基本寸法 */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">基本寸法</h2>
          <div
            className="rounded-xl p-4 grid grid-cols-3 gap-4 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            {[
              { label: "幅 (W)", value: `${dimensions.width}mm` },
              { label: "奥行 (D)", value: `${dimensions.depth}mm` },
              { label: "高さ (H)", value: `${dimensions.height}mm` },
            ].map((d) => (
              <div key={d.label}>
                <p className="text-xs text-gray-400">{d.label}</p>
                <p className="font-bold text-gray-900 mt-0.5">{d.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* カット図 */}
        {cutItems.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-3">カット図</h2>
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
            >
              {/* ヘッダー */}
              <div
                className="grid text-xs font-bold px-4 py-2.5"
                style={{
                  gridTemplateColumns: "1fr 120px 40px",
                  background: "var(--parchment)",
                  color: "var(--text-secondary)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <span>部材名</span>
                <span>寸法 (T×W×L mm)</span>
                <span className="text-right">数</span>
              </div>
              {/* 行 */}
              {cutItems.map((item, idx) => (
                <div
                  key={idx}
                  className="grid items-center px-4 py-3"
                  style={{
                    gridTemplateColumns: "1fr 120px 40px",
                    borderBottom: idx < cutItems.length - 1 ? "1px solid var(--border)" : "none",
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
            {tools.map((tool) => {
              const toolName = typeof tool === "string" ? tool : tool.name;
              const toolNote = typeof tool === "string" ? undefined : tool.note;
              return (
                <li key={toolName} className="px-4 py-3 flex items-start gap-3 text-sm">
                  <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                  <div>
                    <p className="font-medium text-gray-800">{toolName}</p>
                    {toolNote && (
                      <p className="text-xs text-gray-400 mt-0.5">{toolNote}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 資材一覧 */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">資材一覧</h2>
          <BlueprintPartsTable parts={parts} />
        </section>

        {/* 工程 */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">工程</h2>
          <ol className="space-y-6">
            {steps.map((step) => {
              const tips = "tips" in step ? (step as { tips?: string[] }).tips : undefined;
              const pitfalls = "pitfalls" in step ? (step as { pitfalls?: string[] }).pitfalls : undefined;
              const estimatedMinutes = "estimatedMinutes" in step ? (step as { estimatedMinutes?: number }).estimatedMinutes : undefined;
              return (
                <li key={step.order}>
                  {/* ステップヘッダー */}
                  <div className="flex gap-4 mb-3">
                    <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "var(--navy-deep)" }}>
                      {step.order}
                    </div>
                    <div className="pt-1 flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="font-bold text-gray-900">{step.title}</p>
                        {typeof estimatedMinutes === "number" && estimatedMinutes > 0 && (
                          <span className="text-xs text-gray-500 shrink-0">目安 {estimatedMinutes}分</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                    </div>
                  </div>
                  {/* ビジュアルイラスト */}
                  <StepIllustration
                    stepTitle={step.title}
                    stepDescription={step.description}
                    stepOrder={step.order}
                    totalSteps={steps.length}
                    illustrationType={"illustrationType" in step ? (step as { illustrationType?: string }).illustrationType : undefined}
                    dimensions={dimensions}
                  />
                  {/* コツ */}
                  {tips && tips.length > 0 && (
                    <div
                      className="mt-3 p-3 rounded-lg text-sm"
                      style={{ background: "rgba(250,204,21,0.10)", border: "1px solid rgba(202,138,4,0.25)" }}
                    >
                      <p className="text-xs font-bold mb-1" style={{ color: "#92400E" }}>コツ</p>
                      <ul className="space-y-1">
                        {tips.map((t, i) => (
                          <li key={i} className="text-gray-700 leading-relaxed">{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* つまずきポイント */}
                  {pitfalls && pitfalls.length > 0 && (
                    <div
                      className="mt-2 p-3 rounded-lg text-sm"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)" }}
                    >
                      <p className="text-xs font-bold mb-1" style={{ color: "#991B1B" }}>つまずきポイント</p>
                      <ul className="space-y-1">
                        {pitfalls.map((p, i) => (
                          <li key={i} className="text-gray-700 leading-relaxed">{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {/* 注意点 */}
        {warnings.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-3">注意点</h2>
            <ul
              className="space-y-2 p-4 rounded-xl"
              style={{ background: "var(--amber-pale)", border: "1px solid rgba(217,123,42,0.25)" }}
            >
              {warnings.map((w) => (
                <li key={w} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-orange-500 shrink-0">⚠️</span>
                  {w}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* カスタム設計 — 寸法プレビュー */}
        <section className="mt-10 no-print">
          <h2 className="text-xl font-bold text-gray-900 mb-1">カスタム設計</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
            寸法を変えるとカット図がざっくりスケールします。正確な計算はアプリで。
          </p>
          {cutItems.length > 0 ? (
            <CustomDesignPreview
              slug={slug}
              baseDimensions={dimensions}
              cutItems={cutItems}
              retailers={retailers}
            />
          ) : (
            <AppOnlyGate
              title="自分のサイズで設計図を生成"
              description="幅・奥行・高さを入力するだけでカインズ・コメリ別の材料リストと費用を自動計算します。"
              ctaLabel="アプリで試す（無料）"
            >
              <div className="p-5" style={{ background: "var(--surface)" }}>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  ベーシック寸法 {dimensions.width}×{dimensions.depth}×{dimensions.height} mm
                </p>
              </div>
            </AppOnlyGate>
          )}
        </section>

        {/* 作例 */}
        <section className="mt-10 no-print">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">
              作例
              {exampleCount > 0 && (
                <span
                  className="ml-2 text-sm font-medium"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {exampleCount}件
                </span>
              )}
            </h2>
            {exampleCount > 0 && (
              <Link
                href="/example"
                className="text-sm font-semibold"
                style={{ color: "var(--amber)" }}
              >
                すべて見る →
              </Link>
            )}
          </div>

          {previewExamples.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {previewExamples.map((ex) => (
                  <ExampleCard key={ex.id} example={ex} />
                ))}
              </div>
              <div className="mt-6">
                <AppStoreCTA
                  variant="inline"
                  title="あなたの作例を投稿"
                  description="アプリから写真・実費・コメントを投稿するとここに掲載されます。"
                />
              </div>
            </>
          ) : (
            <AppStoreCTA
              variant="inline"
              title="作例を投稿するにはアプリから"
              description="写真・実費・コメントをアプリで投稿するとここに掲載されます。"
            />
          )}
        </section>

        {/* 評価・コメント (Read 専用、投稿はアプリから) */}
        {uc && <RatingsCommentsSection rating={rating} comments={comments} />}

        {/* App CTA */}
        <div className="mt-12 no-print">
          <AppStoreCTA
            title="サイズを変えてカスタム設計"
            description="アプリでは幅・奥行・高さを入力するだけで設計図と材料リストを自動生成。"
          />
        </div>

        {/* 内部リンク — カテゴリ・対応店舗への動線 */}
        <RelatedNav
          title="このカテゴリ・店舗で他の設計図を探す"
          items={[
            {
              href: `/category/${uc?.categorySlug ?? bp.categorySlug}`,
              label: `📐 ${uc?.category ?? bp.category}を全部見る`,
            },
            ...retailers.map((r) => ({
              href: `/store/${retailerSlugs[r]}`,
              label: `🏬 ${r}で買える設計図`,
            })),
          ]}
        />

        {/* 関連設計図 */}
        {relatedUseCases.length > 0 && (
          <section className="mt-12 no-print">
            <h2 className="text-xl font-bold text-gray-900 mb-4">関連設計図</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedUseCases.map((uc) => (
                <BlueprintCard key={uc.id} useCase={uc} exampleCount={exampleCounts[uc.id] ?? 0} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
