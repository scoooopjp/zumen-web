import type { Metadata } from "next";
import Link from "next/link";
import BlueprintCard from "@/components/BlueprintCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { categories } from "@/lib/data";
import { fetchUseCases, fetchExampleCountsByUseCase } from "@/lib/firestore";

export const dynamic = "force-dynamic";

const ogUrl = `/og?title=${encodeURIComponent("DIY設計図一覧")}&category=${encodeURIComponent("カテゴリ別")}&icon=${encodeURIComponent("📐")}`;

export const metadata: Metadata = {
  title: "DIY設計図一覧",
  description:
    "棚・プランター台・コンポストなどのDIY設計図を一覧で探せます。ホームセンター別の材料リスト付き。",
  alternates: { canonical: "/category" },
  openGraph: {
    title: "DIY設計図一覧 | ZUMEN",
    description:
      "棚・プランター台・コンポストなどのDIY設計図を一覧で探せます。ホームセンター別の材料リスト付き。",
    images: [{ url: ogUrl, width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: [ogUrl] },
};

export default async function CategoryListPage() {
  const [useCasesData, exampleCounts] = await Promise.all([
    fetchUseCases(),
    fetchExampleCountsByUseCase(),
  ]);

  const BASE = "https://zumen.scoooop.com";
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "DIY設計図一覧",
    description: "カテゴリ別に探せるDIY設計図の総合一覧。ホームセンター別の材料リスト付き。",
    url: `${BASE}/category`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: categories.length,
      itemListElement: categories.map((cat, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE}/category/${cat.slug}`,
        name: `${cat.name} DIY 設計図`,
      })),
    },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }}
      />
      <Breadcrumbs
        items={[{ name: "TOP", href: "/" }, { name: "設計図一覧" }]}
      />

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
                <BlueprintCard key={uc.id} useCase={uc} exampleCount={exampleCounts[uc.id] ?? 0} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
