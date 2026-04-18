import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import AppStoreCTA from "@/components/AppStoreCTA";
import { getExampleById, mockExamples, formatTime } from "@/lib/examples";

interface Props {
  params: Promise<{ id: string }>;
}

// UGC は品質が安定するまで noindex
export const dynamic = "force-static";

export async function generateStaticParams() {
  return mockExamples.map((e) => ({ id: e.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const ex = getExampleById(id);
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
  const ex = getExampleById(id);
  if (!ex) notFound();

  const dimensionsLabel =
    ex.actualWidth && ex.actualDepth && ex.actualHeight
      ? `W${ex.actualWidth} × D${ex.actualDepth} × H${ex.actualHeight} mm`
      : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* パンくず */}
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1.5 flex-wrap">
        <Link href="/" className="hover:text-gray-600">TOP</Link>
        <span>/</span>
        <Link href={`/blueprint/${ex.useCaseSlug}`} className="hover:text-gray-600">
          {ex.useCaseName}
        </Link>
        <span>/</span>
        <span className="text-gray-600">作例</span>
      </nav>

      {/* 画像 */}
      <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
        {ex.imageURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ex.imageURL} alt={`${ex.authorName}さんの${ex.useCaseName}`} className="w-full h-full object-cover rounded-2xl" />
        ) : (
          <span className="text-5xl">📷</span>
        )}
      </div>

      {/* 投稿者・日付 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
            <span className="text-sm">👤</span>
          </div>
          <span className="font-medium text-gray-900">{ex.authorName}</span>
        </div>
        <span className="text-sm text-gray-400">{ex.createdAt}</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">{ex.useCaseName}</h1>
      <Link href={`/blueprint/${ex.useCaseSlug}`} className="text-sm text-indigo-600 hover:underline">
        設計図を見る →
      </Link>

      {/* スタッツ */}
      <div className="grid grid-cols-3 gap-3 mt-6 bg-gray-50 rounded-2xl p-4 text-center">
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
        <div className="mt-4 bg-gray-50 rounded-xl px-4 py-3">
          <p className="text-xs text-gray-400">実寸</p>
          <p className="font-medium text-gray-700 mt-0.5">{dimensionsLabel}</p>
        </div>
      )}

      {/* コメント */}
      <div className="mt-6">
        <h2 className="font-bold text-gray-900 mb-2">コメント</h2>
        <p className="text-gray-600 leading-relaxed">{ex.comment}</p>
      </div>

      {/* App CTA */}
      <div className="mt-10">
        <AppStoreCTA
          title="自分も作ってみるならアプリへ"
          description="カスタムサイズの設計図・ホームセンター別の材料リストを無料で生成。"
        />
      </div>
    </div>
  );
}
