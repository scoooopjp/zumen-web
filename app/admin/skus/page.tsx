/**
 * Issue 9-2: ホームセンター商品（SKU）管理画面
 * 取得済み商品一覧と正規化ステータスを表示
 */

type NormStatus = "ok" | "missing_length" | "missing_profile" | "unknown_category";

interface SkuRow {
  id: string;
  retailer: string;
  name: string;
  category: string;
  profile: string | null;
  lengthMm: number | null;
  unitPrice: number | null;
  normStatus: NormStatus;
}

// モックデータ（Firestore 接続後は fetchSkus() に差し替え）
const mockSkus: SkuRow[] = [
  {
    id: "cainz-001",
    retailer: "カインズ",
    name: "SPF材 2×4 6F",
    category: "lumber",
    profile: "2x4",
    lengthMm: 1829,
    unitPrice: 548,
    normStatus: "ok",
  },
  {
    id: "cainz-002",
    retailer: "カインズ",
    name: "SPF材 1×4 6F",
    category: "lumber",
    profile: "1x4",
    lengthMm: 1829,
    unitPrice: 398,
    normStatus: "ok",
  },
  {
    id: "cainz-003",
    retailer: "カインズ",
    name: "コーススレッド 41mm 200本",
    category: "fastener",
    profile: null,
    lengthMm: null,
    unitPrice: 398,
    normStatus: "ok",
  },
  {
    id: "komeri-001",
    retailer: "コメリ",
    name: "ツーバイフォー材 1820mm",
    category: "lumber",
    profile: "2x4",
    lengthMm: 1820,
    unitPrice: 528,
    normStatus: "ok",
  },
  {
    id: "komeri-002",
    retailer: "コメリ",
    name: "木材 無垢板 910×600",
    category: "lumber",
    profile: null,
    lengthMm: 910,
    unitPrice: 1280,
    normStatus: "missing_profile",
  },
  {
    id: "dcm-001",
    retailer: "DCM",
    name: "2×4材 ホワイトウッド",
    category: "lumber",
    profile: "2x4",
    lengthMm: null,
    unitPrice: 498,
    normStatus: "missing_length",
  },
  {
    id: "cornor-001",
    retailer: "コーナン",
    name: "アルミ平板 2mm×50×1000",
    category: "unknown",
    profile: null,
    lengthMm: 1000,
    unitPrice: 880,
    normStatus: "unknown_category",
  },
];

const STATUS_LABEL: Record<NormStatus, { label: string; className: string }> = {
  ok: { label: "正常", className: "bg-green-100 text-green-700" },
  missing_length: { label: "長さ不明", className: "bg-yellow-100 text-yellow-700" },
  missing_profile: { label: "プロファイル不明", className: "bg-orange-100 text-orange-700" },
  unknown_category: { label: "カテゴリ不明", className: "bg-red-100 text-red-700" },
};

const RETAILERS = ["すべて", "カインズ", "コメリ", "DCM", "コーナン", "ナフコ"];

export default function AdminSkusPage() {
  const total = mockSkus.length;
  const okCount = mockSkus.filter((s) => s.normStatus === "ok").length;
  const issueCount = total - okCount;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">商品（SKU）管理</h1>
        <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
          + インポート
        </button>
      </div>

      {/* サマリカード */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "総SKU数", value: total, color: "text-gray-900" },
          { label: "正規化OK", value: okCount, color: "text-green-600" },
          { label: "要修正", value: issueCount, color: "text-red-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* フィルタバー */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {RETAILERS.map((r) => (
          <button
            key={r}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
          >
            {r}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          <button className="text-xs px-3 py-1.5 rounded-full border border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100">
            要修正のみ
          </button>
        </div>
      </div>

      {/* SKU テーブル */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">店舗</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">商品名</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">カテゴリ</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">プロファイル</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">長さ (mm)</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">単価</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">正規化</th>
            </tr>
          </thead>
          <tbody>
            {mockSkus.map((sku) => {
              const status = STATUS_LABEL[sku.normStatus];
              return (
                <tr key={sku.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{sku.retailer}</td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs">
                    <span className="line-clamp-2">{sku.name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{sku.category}</td>
                  <td className="px-4 py-3 text-gray-500">{sku.profile ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {sku.lengthMm != null ? sku.lengthMm.toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {sku.unitPrice != null ? `¥${sku.unitPrice.toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        ※ Firestore 接続後、スクレイピング済みデータがここに表示されます
      </p>
    </div>
  );
}
