import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-24">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div>
            <p className="font-bold text-lg text-gray-900">ZUMEN</p>
            <p className="text-sm text-gray-500 mt-1">つくりたいを、つくれるに。</p>
          </div>
          <div className="flex gap-12 text-sm text-gray-600">
            <div className="flex flex-col gap-2">
              <p className="font-medium text-gray-900">設計図</p>
              <Link href="/category/tana" className="hover:text-gray-900">棚</Link>
              <Link href="/category/planter-dai" className="hover:text-gray-900">プランター台</Link>
              <Link href="/category/compost" className="hover:text-gray-900">コンポスト</Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-gray-900">ホームセンター</p>
              <Link href="/store/cainz" className="hover:text-gray-900">カインズ</Link>
              <Link href="/store/komeri" className="hover:text-gray-900">コメリ</Link>
              <Link href="/store/kohnan" className="hover:text-gray-900">コーナン</Link>
              <Link href="/store/dcm" className="hover:text-gray-900">DCM</Link>
            </div>
          </div>
        </div>
        <div className="flex gap-4 mt-8">
          <p className="text-xs text-gray-400">© 2025 ZUMEN. All rights reserved.</p>
          <a href="https://www.scoooop.com/privacy-policy/" className="text-xs text-gray-400 hover:text-gray-600" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>
          <Link href="/support" className="text-xs text-gray-400 hover:text-gray-600">サポート</Link>
        </div>
      </div>
    </footer>
  );
}
