import type { Metadata } from "next";
import Link from "next/link";
import AppStoreCTA from "@/components/AppStoreCTA";
import { mockExamples, formatTime } from "@/lib/examples";

export const metadata: Metadata = {
  title: "作例ギャラリー | ZUMEN",
  description:
    "ZUMENユーザーが実際に作ったDIY作品のギャラリー。実費・制作時間・使用ホームセンターなどリアルな情報を公開。",
  alternates: { canonical: "/example" },
  robots: { index: false }, // UGC は審査後に個別で index 化
};

export default function ExampleListPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* パンくず */}
      <nav className="text-sm mb-6 flex items-center gap-1.5" style={{ color: "var(--text-tertiary)" }}>
        <Link href="/" className="hover:opacity-70">TOP</Link>
        <span>/</span>
        <span style={{ color: "var(--text-secondary)" }}>作例ギャラリー</span>
      </nav>

      {/* ヘッダー */}
      <div className="mb-8">
        <p className="section-label mb-2">みんなの作品</p>
        <h1 className="text-3xl font-bold mb-2" style={{ color: "var(--navy-deep)" }}>
          作例ギャラリー
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          ZUMENを使って実際に作った方の投稿です。実費・材料・制作時間など参考にどうぞ。
        </p>
      </div>

      {/* 投稿 CTA */}
      <div className="mb-10">
        <AppStoreCTA
          variant="inline"
          title="作品を投稿するにはアプリから"
          description="写真・実費・コメントをアプリで投稿するとここに掲載されます。"
        />
      </div>

      {/* グリッド */}
      {mockExamples.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-tertiary)" }}>
          <p className="text-5xl mb-4">📷</p>
          <p>まだ作例がありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {mockExamples.map((ex) => (
            <Link
              key={ex.id}
              href={`/example/${ex.id}`}
              className="zumen-card block overflow-hidden group"
            >
              {/* 画像エリア */}
              <div
                className="relative flex items-center justify-center overflow-hidden"
                style={{
                  aspectRatio: "3/2",
                  background: "linear-gradient(135deg, #F5F0E8 0%, #EDE8DC 100%)",
                }}
              >
                {ex.imageURL ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={ex.imageURL}
                    alt={`${ex.authorName}さんの${ex.useCaseName}`}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-5xl select-none">📷</span>
                )}
                {/* 設計図バッジ */}
                <span
                  className="absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full z-10"
                  style={{
                    background: "rgba(255,255,255,0.80)",
                    color: "var(--text-secondary)",
                    backdropFilter: "blur(4px)",
                  }}
                >
                  {ex.useCaseName}
                </span>
              </div>

              {/* コンテンツ */}
              <div className="p-4">
                {/* 投稿者 */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0"
                    style={{ background: "var(--canvas)" }}
                  >
                    👤
                  </div>
                  <span className="font-medium text-sm" style={{ color: "var(--navy-deep)" }}>
                    {ex.authorName}
                  </span>
                  <span className="text-xs ml-auto" style={{ color: "var(--text-tertiary)" }}>
                    {ex.createdAt}
                  </span>
                </div>

                {/* スタッツ */}
                <div
                  className="grid grid-cols-3 gap-2 text-center rounded-xl py-3 mb-3"
                  style={{ background: "var(--canvas)" }}
                >
                  <div>
                    <p className="text-[10px] mb-0.5" style={{ color: "var(--text-tertiary)" }}>実費</p>
                    <p className="text-sm font-bold" style={{ color: "var(--navy-deep)" }}>
                      ¥{ex.actualCost.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] mb-0.5" style={{ color: "var(--text-tertiary)" }}>時間</p>
                    <p className="text-sm font-bold" style={{ color: "var(--navy-deep)" }}>
                      {formatTime(ex.actualTimeMinutes)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] mb-0.5" style={{ color: "var(--text-tertiary)" }}>店舗</p>
                    <p className="text-sm font-bold" style={{ color: "var(--navy-deep)" }}>
                      {ex.retailer}
                    </p>
                  </div>
                </div>

                {/* コメント */}
                <p
                  className="text-sm leading-relaxed line-clamp-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {ex.comment}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* 下部 CTA */}
      <div className="mt-16">
        <AppStoreCTA
          variant="banner"
          title="自分も作ってみる"
          description="設計図を選んでサイズを入力。カインズ・コメリ別の材料リストが自動生成されます。"
        />
      </div>
    </div>
  );
}
