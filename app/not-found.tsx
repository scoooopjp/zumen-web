import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-32 text-center">
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="text-2xl font-bold text-gray-900 mt-4">ページが見つかりません</h1>
      <p className="text-gray-500 mt-2">お探しのページは移動または削除された可能性があります。</p>
      <Link
        href="/"
        className="inline-block mt-8 bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
      >
        トップへ戻る
      </Link>
    </div>
  );
}
