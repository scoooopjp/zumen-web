/**
 * Issue 9-4: 作例審査画面
 */
import { mockExamples } from "@/lib/examples";

export default function AdminExamplesPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">作例審査</h1>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
            審査待ち {mockExamples.length}件
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {mockExamples.map((ex) => (
          <div key={ex.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">{ex.authorName}</span>
                  <span className="text-xs text-gray-400">{ex.createdAt}</span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {ex.useCaseName} / {ex.retailer} / ¥{ex.actualCost.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 line-clamp-2">{ex.comment}</p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700">
                  公開
                </button>
                <button className="border border-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50">
                  非公開
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        ※ Firestore 接続後、リアルタイムで投稿が表示されます
      </p>
    </div>
  );
}
