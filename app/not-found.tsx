import Link from "next/link";
import LottieIcon from "@/components/LottieIcon";

export default function NotFound() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-32 text-center">
      <div className="flex justify-center mb-4">
        <LottieIcon name="notFound" size={200} ariaLabel="ページが見つかりません" />
      </div>
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="text-2xl font-bold text-gray-900 mt-4">ページが見つかりません</h1>
      <p className="text-gray-500 mt-2">お探しのページは移動または削除された可能性があります。</p>
      <Link href="/" className="btn-primary mt-8">
        トップへ戻る
      </Link>
    </div>
  );
}
