import type { Metadata } from "next";
import Link from "next/link";
import BlueprintCard from "@/components/BlueprintCard";
import { categories } from "@/lib/data";
import { fetchUseCases } from "@/lib/firestore";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "DIY設計図一覧",
  description:
    "棚・プランター台・コンポストなどのDIY設計図を一覧で探せます。ホームセンター別の材料リスト付き。",
  alternates: { canonical: "/category" },
};

export default async function CategoryListPage() {
  const useCasesData = await fetchUseCases();
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* パンくず */}
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1.5">
        <Link href="/" className="hover:text-gray-600">TOP</Link>
        <span>/</span>
        <span className="text-gray-600">設計図一覧</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">DIY設計図一覧</h1>
      <p className="text-gray-500 mb-8">
        カテゴリ別に設計図を探せます。ホームセンター別の材料リスト付き。
      </p>

      {categories.map((cat) => {
        const items = useCasesData.filter((uc) => uc.categorySlug === cat.slug);
        return (
          <section key={cat.slug} className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{cat.name}</h2>
              <Link
                href={`/category/${cat.slug}`}
                className="text-sm text-indigo-600 hover:underline"
              >
                すべて見る →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {items.map((uc) => (
                <BlueprintCard key={uc.id} useCase={uc} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
