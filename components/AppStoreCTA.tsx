interface AppStoreCTAProps {
  variant?: "primary" | "banner";
  title?: string;
  description?: string;
}

export default function AppStoreCTA({
  variant = "primary",
  title = "カスタム設計はアプリで",
  description = "自分のサイズに合わせた設計図・材料リストをその場で生成。",
}: AppStoreCTAProps) {
  if (variant === "banner") {
    return (
      <div className="bg-gray-900 text-white rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-xl font-bold">{title}</p>
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>
        <a
          href="https://apps.apple.com/app/zumen"
          className="shrink-0 bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors"
        >
          App Store でダウンロード
        </a>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 rounded-2xl p-6 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">✏️</span>
        </div>
        <div>
          <p className="font-bold text-gray-900">{title}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
      <a
        href="https://apps.apple.com/app/zumen"
        className="w-full bg-indigo-600 text-white text-center py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
      >
        無料ダウンロード (iPhone)
      </a>
    </div>
  );
}
