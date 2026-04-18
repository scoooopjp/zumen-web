/**
 * Issue 9-1: 設計図管理画面
 * Firebase 設定後に Firestore への CRUD を追加する
 */
import Link from "next/link";
import { useCases } from "@/lib/data";

export default function AdminBlueprintsPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">設計図管理</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + 新規追加
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">設計図名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">カテゴリ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">難易度</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">対応店舗</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">URL</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {useCases.map((uc) => (
              <tr key={uc.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{uc.name}</td>
                <td className="px-4 py-3 text-gray-500">{uc.category}</td>
                <td className="px-4 py-3 text-gray-500">{uc.difficulty}</td>
                <td className="px-4 py-3 text-gray-500">{uc.supportedRetailers.join("・")}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/blueprint/${uc.slug}`}
                    className="text-indigo-600 hover:underline"
                    target="_blank"
                  >
                    /blueprint/{uc.slug}
                  </Link>
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 border border-gray-200 rounded">
                    編集
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        ※ Firestore 接続後、ここから直接編集・追加できるようになります
      </p>
    </div>
  );
}
