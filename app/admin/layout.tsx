import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
          <span className="font-bold text-gray-900">ZUMEN Admin</span>
          <nav className="flex gap-4 text-sm text-gray-600">
            <a href="/admin/blueprints" className="hover:text-gray-900">設計図</a>
            <a href="/admin/examples" className="hover:text-gray-900">作例審査</a>
            <a href="/admin/skus" className="hover:text-gray-900">商品SKU</a>
            <a href="/admin/rules" className="hover:text-gray-900">代替ルール</a>
            <a href="/admin/retailers" className="hover:text-gray-900">店舗評価</a>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
