import type { Metadata } from "next";
import Link from "next/link";
import AppOnlyGate from "@/components/AppOnlyGate";
import Breadcrumbs from "@/components/Breadcrumbs";
import ExampleCard from "@/components/ExampleCard";
import LottieIcon from "@/components/LottieIcon";
import { fetchExamples } from "@/lib/examples";

// 5分ごとに再検証（新しい投稿を反映）
export const revalidate = 300;

export const metadata: Metadata = {
  title: "作例ギャラリー | ZUMEN",
  description:
    "ZUMENユーザーが実際に作ったDIY作品のギャラリー。実費・制作時間・使用ホームセンターなどリアルな情報を公開。",
  alternates: { canonical: "/example" },
  robots: { index: false }, // UGC は審査後に個別で index 化
};

export default async function ExampleListPage() {
  const examples = await fetchExamples();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[{ name: "TOP", href: "/" }, { name: "作例ギャラリー" }]}
      />

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

      {/* 投稿 — App 限定ゲート */}
      <div className="mb-10">
        <AppOnlyGate
          title="作品を投稿する"
          description="写真・実費・ホームセンター・コメントをアプリで投稿するとここに掲載されます。"
          ctaLabel="アプリで投稿する"
        >
          {/* 投稿フォームのプレビュー */}
          <div className="p-5 space-y-3" style={{ background: "var(--surface)" }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm"
                style={{ background: "var(--canvas)" }}
              >
                👤
              </div>
              <div className="flex-1 rounded-lg px-3 py-2 text-sm" style={{ background: "var(--canvas)", color: "var(--text-tertiary)" }}>
                ひとこと（例: カットサービス使ったら簡単でした）
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["実費", "制作時間", "ホームセンター"].map((label) => (
                <div key={label} className="rounded-lg px-3 py-2 text-xs text-center" style={{ background: "var(--canvas)", color: "var(--text-tertiary)" }}>
                  {label}
                </div>
              ))}
            </div>
            <div
              className="w-full py-2.5 rounded-xl text-center font-bold text-sm text-white"
              style={{ background: "var(--navy-deep)" }}
            >
              投稿する
            </div>
          </div>
        </AppOnlyGate>
      </div>

      {/* グリッド */}
      {examples.length === 0 ? (
        <div className="text-center py-20" style={{ color: "var(--text-tertiary)" }}>
          <div className="flex justify-center mb-4">
            <LottieIcon name="photoEmpty" size={180} ariaLabel="作例はまだありません" />
          </div>
          <p>まだ作例がありません</p>
          <p className="text-sm mt-2">アプリから最初の作品を投稿してみましょう</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {examples.map((ex) => (
            <ExampleCard key={ex.id} example={ex} />
          ))}
        </div>
      )}

      {/* 下部 CTA */}
      <div className="mt-16">
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            background: "linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-mid) 100%)",
          }}
        >
          <p className="font-bold text-white text-lg mb-1">自分も作ってみる</p>
          <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.65)" }}>
            設計図を選んでサイズを入力。カインズ・コメリ別の材料リストが自動生成されます。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/category" className="btn-amber text-sm">
              設計図を見る
            </Link>
            <a
              href="https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625"
              className="text-sm px-5 py-2.5 rounded-xl font-semibold text-white"
              style={{ border: "1px solid rgba(255,255,255,0.3)" }}
            >
              アプリで作例を投稿
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
