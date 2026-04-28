import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import BlueprintFilters from "@/components/BlueprintFilters";
import AppStoreCTA from "@/components/AppStoreCTA";
import Breadcrumbs from "@/components/Breadcrumbs";
import LottieIcon from "@/components/LottieIcon";
import RelatedNav from "@/components/RelatedNav";
import { categories } from "@/lib/data";
import { fetchUseCases, fetchExampleCountsByUseCase } from "@/lib/firestore";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return {};
  const t = await getTranslations("CategoryDetail");
  const tFooter = await getTranslations("Footer");
  const categoryLabel = tFooter(`categories.${slug}` as never) as string;
  const ogUrl = `/og?title=${encodeURIComponent(t("metaTitleTpl", { category: categoryLabel }))}&category=${encodeURIComponent("📐")}&icon=${encodeURIComponent("📐")}`;
  return {
    title: t("metaTitleTpl", { category: categoryLabel }),
    description: t("metaDescriptionTpl", { category: categoryLabel }),
    alternates: { canonical: `/category/${slug}` },
    openGraph: {
      title: t("ogTitleTpl", { category: categoryLabel }),
      description: t("ogDescriptionTpl", { category: categoryLabel, description: cat.description }),
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  const t = await getTranslations("CategoryDetail");
  const tCommon = await getTranslations("Common");
  const tFooter = await getTranslations("Footer");
  const categoryLabel = tFooter(`categories.${slug}` as never) as string;

  const locale = await getLocale();
  const [allUseCases, exampleCounts] = await Promise.all([
    fetchUseCases(locale),
    fetchExampleCountsByUseCase(),
  ]);
  const items = allUseCases.filter((uc) => uc.categorySlug === slug);

  const BASE = "https://zumen.scoooop.com";
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("metaTitleTpl", { category: categoryLabel }),
    description: cat.description,
    url: `${BASE}/category/${slug}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: items.length,
      itemListElement: items.map((uc, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE}/blueprint/${uc.slug}`,
        name: uc.name,
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
        items={[
          { name: tCommon("breadcrumbHome"), href: "/" },
          { name: t("breadcrumbCategory"), href: "/category" },
          { name: categoryLabel },
        ]}
      />

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("h1Tpl", { category: categoryLabel })}</h1>
      <p className="text-gray-500 mb-8">{cat.description}</p>

      {items.length > 0 ? (
        <BlueprintFilters useCases={items} exampleCounts={exampleCounts} />
      ) : (
        <div className="text-center py-16 mb-12">
          <div className="flex justify-center mb-4">
            <LottieIcon name="searching" size={180} ariaLabel={t("preparingTitle")} />
          </div>
          <p className="text-gray-500">{t("preparingBody")}</p>
        </div>
      )}

      <AppStoreCTA
        variant="banner"
        title={t("appCtaTitleTpl", { category: categoryLabel })}
        description={t("appCtaDescription")}
      />

      <RelatedNav
        title={t("relatedNavTitle")}
        items={categories
          .filter((c) => c.slug !== slug)
          .slice(0, 12)
          .map((c) => ({
            href: `/category/${c.slug}`,
            label: tFooter(`categories.${c.slug}` as never) as string,
          }))}
      />
    </div>
  );
}
