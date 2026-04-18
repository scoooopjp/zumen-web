/**
 * Issue 9-3: 代替ルール管理画面
 * SKU の代替ルール (fallback rules) を一覧・編集
 * 例: 2x4 6F が在庫なし → 2x4 6F 別ブランドへフォールバック
 */

interface SubstituteRule {
  id: string;
  retailer: string;
  originalProfile: string;
  originalLengthMm: number;
  substituteProfile: string;
  substituteLengthMm: number;
  substituteRetailer: string | null; // null = 同じ店舗
  reason: string;
  active: boolean;
}

const mockRules: SubstituteRule[] = [
  {
    id: "rule-001",
    retailer: "カインズ",
    originalProfile: "2x4",
    originalLengthMm: 1829,
    substituteProfile: "2x4",
    substituteLengthMm: 1820,
    substituteRetailer: null,
    reason: "6F表記ゆれ (1829 vs 1820mm)",
    active: true,
  },
  {
    id: "rule-002",
    retailer: "コメリ",
    originalProfile: "1x6",
    originalLengthMm: 1820,
    substituteProfile: "1x6",
    substituteLengthMm: 1800,
    substituteRetailer: null,
    reason: "1800mm 代替品あり",
    active: true,
  },
  {
    id: "rule-003",
    retailer: "DCM",
    originalProfile: "2x6",
    originalLengthMm: 1820,
    substituteProfile: "2x6",
    substituteLengthMm: 1820,
    substituteRetailer: "コーナン",
    reason: "DCM 在庫不安定 → コーナンを優先",
    active: false,
  },
  {
    id: "rule-004",
    retailer: "カインズ",
    originalProfile: "1x8",
    originalLengthMm: 1820,
    substituteProfile: "1x4",
    substituteLengthMm: 1820,
    substituteRetailer: null,
    reason: "1x8 品薄時、1x4×2枚で代替",
    active: true,
  },
];

export default function AdminRulesPage() {
  const activeCount = mockRules.filter((r) => r.active).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">代替ルール管理</h1>
          <p className="text-sm text-gray-500 mt-1">
            SKU の代替・フォールバックルールを管理します
          </p>
        </div>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + ルール追加
        </button>
      </div>

      {/* サマリ */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "総ルール数", value: mockRules.length, color: "text-gray-900" },
          { label: "有効", value: activeCount, color: "text-green-600" },
          { label: "無効", value: mockRules.length - activeCount, color: "text-gray-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ルール一覧 */}
      <div className="space-y-3">
        {mockRules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-white rounded-xl border p-4 ${
              rule.active ? "border-gray-200" : "border-gray-100 opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {/* ルール説明 */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      rule.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {rule.active ? "有効" : "無効"}
                  </span>
                  <span className="text-sm font-medium text-gray-700">
                    {rule.retailer}
                  </span>
                </div>

                {/* 変換矢印 */}
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-center">
                    <p className="font-mono font-bold text-red-700">{rule.originalProfile}</p>
                    <p className="text-xs text-red-500">{rule.originalLengthMm.toLocaleString()}mm</p>
                  </div>
                  <span className="text-gray-400 text-lg">→</span>
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 text-center">
                    <p className="font-mono font-bold text-green-700">{rule.substituteProfile}</p>
                    <p className="text-xs text-green-500">
                      {rule.substituteLengthMm.toLocaleString()}mm
                      {rule.substituteRetailer ? ` (${rule.substituteRetailer})` : ""}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-2">{rule.reason}</p>
              </div>

              {/* アクション */}
              <div className="flex gap-2 shrink-0">
                <button className="text-gray-400 hover:text-gray-700 text-xs px-2 py-1 border border-gray-200 rounded">
                  編集
                </button>
                <button
                  className={`text-xs px-2 py-1 border rounded ${
                    rule.active
                      ? "border-red-200 text-red-500 hover:bg-red-50"
                      : "border-green-200 text-green-600 hover:bg-green-50"
                  }`}
                >
                  {rule.active ? "無効化" : "有効化"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        ※ Firestore 接続後、リアルタイムでルールを編集できます
      </p>
    </div>
  );
}
