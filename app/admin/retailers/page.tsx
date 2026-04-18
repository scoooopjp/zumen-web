/**
 * Issue 9-5: ホームセンター候補評価ダッシュボード
 * スクレイピング結果から各ホームセンターの対応状況・品質を評価
 */

interface RetailerEval {
  name: string;
  status: "active" | "candidate" | "blocked";
  skuCount: number;
  lumberCount: number;
  normalizationRate: number; // 0-100%
  avgPrice2x4: number | null; // 2x4 6F 平均価格
  lastScraped: string | null;
  issues: string[];
  coverage: {
    "2x4": boolean;
    "1x4": boolean;
    "1x6": boolean;
    "2x6": boolean;
  };
}

const retailers: RetailerEval[] = [
  {
    name: "カインズ",
    status: "active",
    skuCount: 142,
    lumberCount: 38,
    normalizationRate: 94,
    avgPrice2x4: 548,
    lastScraped: "2026-04-10",
    issues: [],
    coverage: { "2x4": true, "1x4": true, "1x6": true, "2x6": true },
  },
  {
    name: "コメリ",
    status: "active",
    skuCount: 98,
    lumberCount: 31,
    normalizationRate: 87,
    avgPrice2x4: 528,
    lastScraped: "2026-04-10",
    issues: ["長さ表記ゆれ (1820/1830mm 混在)"],
    coverage: { "2x4": true, "1x4": true, "1x6": false, "2x6": false },
  },
  {
    name: "DCM",
    status: "candidate",
    skuCount: 0,
    lumberCount: 0,
    normalizationRate: 0,
    avgPrice2x4: null,
    lastScraped: null,
    issues: ["スクレイピング未実施", "EC サイト構造確認要"],
    coverage: { "2x4": false, "1x4": false, "1x6": false, "2x6": false },
  },
  {
    name: "コーナン",
    status: "candidate",
    skuCount: 0,
    lumberCount: 0,
    normalizationRate: 0,
    avgPrice2x4: null,
    lastScraped: null,
    issues: ["スクレイピング未実施"],
    coverage: { "2x4": false, "1x4": false, "1x6": false, "2x6": false },
  },
  {
    name: "ナフコ",
    status: "candidate",
    skuCount: 0,
    lumberCount: 0,
    normalizationRate: 0,
    avgPrice2x4: null,
    lastScraped: null,
    issues: ["スクレイピング未実施", "西日本エリア限定"],
    coverage: { "2x4": false, "1x4": false, "1x6": false, "2x6": false },
  },
];

const STATUS_CONFIG: Record<RetailerEval["status"], { label: string; className: string }> = {
  active: { label: "対応済", className: "bg-green-100 text-green-700" },
  candidate: { label: "候補", className: "bg-yellow-100 text-yellow-700" },
  blocked: { label: "取得不可", className: "bg-red-100 text-red-700" },
};

const PROFILES = ["2x4", "1x4", "1x6", "2x6"] as const;

export default function AdminRetailersPage() {
  const activeCount = retailers.filter((r) => r.status === "active").length;
  const totalSkus = retailers.reduce((s, r) => s + r.skuCount, 0);
  const avgNorm =
    retailers.filter((r) => r.skuCount > 0).reduce((s, r) => s + r.normalizationRate, 0) /
    Math.max(retailers.filter((r) => r.skuCount > 0).length, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ホームセンター評価</h1>
          <p className="text-sm text-gray-500 mt-1">候補店舗のスクレイピング対応状況と品質指標</p>
        </div>
      </div>

      {/* サマリ */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "対応済み店舗", value: activeCount, color: "text-green-600" },
          { label: "候補店舗", value: retailers.length - activeCount, color: "text-yellow-600" },
          { label: "総SKU数", value: totalSkus.toLocaleString(), color: "text-gray-900" },
          { label: "平均正規化率", value: `${avgNorm.toFixed(0)}%`, color: "text-indigo-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 店舗カード一覧 */}
      <div className="space-y-4">
        {retailers.map((r) => {
          const statusCfg = STATUS_CONFIG[r.status];
          return (
            <div key={r.name} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* ヘッダー行 */}
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-bold text-gray-900">{r.name}</h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}
                    >
                      {statusCfg.label}
                    </span>
                    {r.lastScraped && (
                      <span className="text-xs text-gray-400">最終取得: {r.lastScraped}</span>
                    )}
                  </div>

                  {/* 指標 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">SKU数</p>
                      <p className="font-semibold text-gray-900">
                        {r.skuCount > 0 ? r.skuCount : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">木材SKU</p>
                      <p className="font-semibold text-gray-900">
                        {r.lumberCount > 0 ? r.lumberCount : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">正規化率</p>
                      <p
                        className={`font-semibold ${
                          r.normalizationRate >= 90
                            ? "text-green-600"
                            : r.normalizationRate >= 70
                            ? "text-yellow-600"
                            : "text-gray-400"
                        }`}
                      >
                        {r.skuCount > 0 ? `${r.normalizationRate}%` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">2×4 6F 平均</p>
                      <p className="font-semibold text-gray-900">
                        {r.avgPrice2x4 != null ? `¥${r.avgPrice2x4.toLocaleString()}` : "—"}
                      </p>
                    </div>
                  </div>

                  {/* プロファイルカバレッジ */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500 mr-1">対応材:</span>
                    {PROFILES.map((prof) => (
                      <span
                        key={prof}
                        className={`text-xs px-2 py-0.5 rounded font-mono ${
                          r.coverage[prof]
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {prof}
                      </span>
                    ))}
                  </div>

                  {/* Issues */}
                  {r.issues.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {r.issues.map((issue) => (
                        <li key={issue} className="flex items-start gap-1.5 text-xs text-amber-700">
                          <span className="shrink-0">⚠</span>
                          <span>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* アクション */}
                <div className="flex flex-col gap-2 shrink-0">
                  {r.status === "candidate" && (
                    <button className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                      PoC 開始
                    </button>
                  )}
                  {r.status === "active" && (
                    <button className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50">
                      再取得
                    </button>
                  )}
                </div>
              </div>

              {/* 正規化率バー */}
              {r.skuCount > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>正規化率</span>
                    <span>{r.normalizationRate}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        r.normalizationRate >= 90
                          ? "bg-green-500"
                          : r.normalizationRate >= 70
                          ? "bg-yellow-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${r.normalizationRate}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
