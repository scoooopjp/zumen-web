import Link from "next/link";
import { useCases } from "@/lib/data";
import { mockExamples } from "@/lib/examples";

export default function AdminPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "設計図", value: useCases.length, href: "/admin/blueprints" },
          { label: "作例 (審査待ち)", value: mockExamples.length, href: "/admin/examples" },
          { label: "カテゴリ", value: 3, href: "/admin/blueprints" },
          { label: "対応ホームセンター", value: 2, href: "/admin/blueprints" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors"
          >
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Firebase 未接続</strong> — 環境変数を設定すると Firestore のリアルタイムデータが表示されます。
        <code className="block mt-1 text-xs bg-amber-100 px-2 py-1 rounded">
          .env.local に NEXT_PUBLIC_FIREBASE_* を設定してください
        </code>
      </div>
    </div>
  );
}
