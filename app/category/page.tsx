import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import BlueprintCard from "@/components/BlueprintCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import { categories } from "@/lib/data";
import { fetchUseCases, fetchExampleCountsByUseCase } from "@/lib/firestore";

// カテゴリ一覧は ほぼ静的 (UseCase マスタ + exampleCounts のみ)。1時間 ISR で十分。
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("CategoryList");
  const ogUrl = `/og?title=${encodeURIComponent(t("metaTitle"))}&category=${encodeURIComponent(t("ogCategory"))}&icon=${encodeURIComponent(t("ogIcon"))}`;
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: "/category" },
    openGraph: {
      title: t("ogTitle"),
      description: t("metaDescription"),
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

export default async function CategoryListPage() {
  const t = await getTranslations("CategoryList");
  const tCommon = await getTranslations("Common");
  const tFooter = await getTranslations("Footer");
  const locale = await getLocale();
  const [useCasesData, exampleCounts] = await Promise.all([
    fetchUseCases(locale),
    fetchExampleCountsByUseCase(),
  ]);

  const BASE = "https://zumen.scoooop.com";
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("metaTitle"),
    description: t("metaDescription"),
    url: `${BASE}/category`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: categories.length,
      itemListElement: categories.map((cat, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE}/category/${cat.slug}`,
        name: cat.name,
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
        items={[{ name: tCommon("breadcrumbHome"), href: "/" }, { name: t("breadcrumbCurrent") }]}
      />

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("h1")}</h1>
      <p className="text-gray-500 mb-8">{t("lead")}</p>

      {categories.map((cat) => {
        const items = useCasesData.filter((uc) => uc.categorySlug === cat.slug);
        return (
          <section key={cat.slug} className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{tFooter(`categories.${cat.slug}` as never)}</h2>
              <Link
                href={`/category/${cat.slug}`}
                className="text-sm text-indigo-600 hover:underline"
              >
                {tCommon("viewAll")}
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
