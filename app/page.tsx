import type { Metadata } from "next";
import Link from "next/link";
import BlueprintCard from "@/components/BlueprintCard";
import AppStoreCTA from "@/components/AppStoreCTA";
import { useCases, categories } from "@/lib/data";

export const metadata: Metadata = {
  title: "ZUMEN - つくれるDIY設計図",
  description:
    "設計図から資材、工程、ホームセンター別の買い物リストまで。DIYを「良さそう」で終わらせず、「ちゃんと作れる」まで支えるサービス。",
};

export default function HomePage() {
  return (
    <>
      {/* ── Hero ───────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
          つくりたいを、
          <br />
          つくれるに。
        </h1>
        <p className="mt-6 text-lg md:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
          設計図から、資材、工程、ホームセンター別の買い物リストまで。
          <br className="hidden md:block" />
          DIYを「良さそう」で終わらせず、「ちゃんと作れる」まで支えるサービス。
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/category"
            className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold text-base hover:bg-indigo-700 transition-colors"
          >
            設計図を見る →
          </Link>
          <a
            href="https://apps.apple.com/app/zumen"
            className="border border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl font-bold text-base hover:bg-gray-50 transition-colors"
          >
            App Store でダウンロード
          </a>
        </div>
      </section>

      {/* ── カテゴリ ────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">カテゴリから探す</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/category/${cat.slug}`}
              className="group bg-gray-50 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-2xl p-6 transition-all"
            >
              <p className="text-3xl mb-3">
                {cat.slug === "tana" ? "🗄️" : cat.slug === "planter-dai" ? "🌿" : "♻️"}
              </p>
              <p className="font-bold text-gray-900 group-hover:text-indigo-600">{cat.name}</p>
              <p className="text-sm text-gray-500 mt-1">{cat.description}</p>
              <p className="text-xs text-gray-400 mt-2">設計図 {cat.count}件</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 設計図一覧 ─────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">設計図を探す</h2>
          <Link href="/category" className="text-sm text-indigo-600 hover:underline">
            すべて見る →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {useCases.map((uc) => (
            <BlueprintCard key={uc.id} useCase={uc} />
          ))}
        </div>
      </section>

      {/* ── 機能紹介 ────────────────────────────── */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            設計図から作るまでを、まるごとサポート
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: "📐", title: "設計図", desc: "実用的な設計図を厳選。" },
              { icon: "✏️", title: "カスタム設計", desc: "サイズを自由に調整。" },
              { icon: "🏪", title: "材料リスト", desc: "ホームセンター別に自動生成。" },
              { icon: "📸", title: "作例", desc: "実際に作った人の実費・写真。" },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <div className="text-4xl mb-3">{f.icon}</div>
                <p className="font-bold text-gray-900 mb-1">{f.title}</p>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 対応ホームセンター ───────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">対応ホームセンター</h2>
        <div className="flex justify-center gap-8">
          {[
            { slug: "cainz", name: "カインズ" },
            { slug: "komeri", name: "コメリ" },
          ].map((store) => (
            <Link
              key={store.slug}
              href={`/store/${store.slug}`}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                <span className="text-3xl">🏬</span>
              </div>
              <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-600">
                {store.name}
              </span>
            </Link>
          ))}
        </div>
        <p className="text-center text-sm text-gray-400 mt-4">順次拡大予定</p>
      </section>

      {/* ── App CTA ────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-20">
        <AppStoreCTA
          variant="banner"
          title="カスタム設計はアプリで"
          description="自分のサイズに合わせた設計図・ホームセンター別の材料リストをその場で生成。iPhone 無料。"
        />
      </section>
    </>
  );
}
