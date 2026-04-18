import Link from "next/link";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl tracking-tight text-gray-900">
          ZUMEN
        </Link>
        <nav className="flex items-center gap-6 text-sm text-gray-600">
          <Link href="/category" className="hover:text-gray-900 transition-colors">
            設計図を探す
          </Link>
          <Link
            href="https://apps.apple.com/app/zumen"
            className="bg-gray-900 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-gray-700 transition-colors"
          >
            App をダウンロード
          </Link>
        </nav>
      </div>
    </header>
  );
}
