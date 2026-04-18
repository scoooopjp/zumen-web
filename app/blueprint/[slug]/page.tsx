import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AppStoreCTA from "@/components/AppStoreCTA";
import BlueprintCard from "@/components/BlueprintCard";
import {
  getBlueprintBySlug,
  getUseCaseBySlug,
  useCases,
  formatBudget,
  formatTime,
  blueprintDetails,
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
        <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
          <span className="text-6xl">🪚</span>
        </div>

        {/* タイトル・バッジ */}
        <p className="text-sm text-gray-400 mb-1">{bp.category}</p>
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
          <div className="bg-gray-50 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {bp.parts.map((part) => (
              <div key={part.name} className="px-4 py-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium text-gray-900">{part.name}</p>
                  <p className="text-gray-400 text-xs">{part.spec}</p>
                </div>
                <p className="font-bold text-gray-700">
                  {part.quantity} {part.unit}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* 工程 */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">工程</h2>
          <ol className="space-y-4">
            {bp.steps.map((step) => (
              <li key={step.order} className="flex gap-4">
                <div className="shrink-0 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {step.order}
                </div>
                <div className="pt-1">
                  <p className="font-bold text-gray-900">{step.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 注意点 */}
        {bp.warnings.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold text-gray-900 mb-3">注意点</h2>
            <ul className="space-y-2">
              {bp.warnings.map((w) => (
                <li key={w} className="flex gap-2 text-sm text-gray-600">
                  <span className="text-orange-500 shrink-0">⚠️</span>
                  {w}
                </li>
              ))}
            </ul>
          </section>
        )}

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
