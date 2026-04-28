import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import BlueprintCard from "@/components/BlueprintCard";
import AppStoreCTA from "@/components/AppStoreCTA";
import Breadcrumbs from "@/components/Breadcrumbs";
import RelatedNav from "@/components/RelatedNav";
import type { Retailer } from "@/lib/data";
import { fetchUseCases, fetchExampleCountsByUseCase } from "@/lib/firestore";

interface Props {
  params: Promise<{ retailer: string }>;
}

const storeMap: Record<string, { name: Retailer; descKey: "descCainz" | "descKomeri" | "descKohnan" | "descDcm" }> = {
  cainz:  { name: "カインズ",  descKey: "descCainz" },
  komeri: { name: "コメリ",    descKey: "descKomeri" },
  kohnan: { name: "コーナン",  descKey: "descKohnan" },
  dcm:    { name: "DCM",       descKey: "descDcm" },
};

export async function generateStaticParams() {
  return Object.keys(storeMap).map((retailer) => ({ retailer }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { retailer } = await params;
  const store = storeMap[retailer];
  if (!store) return {};
  const t = await getTranslations("Store");
  const tFooter = await getTranslations("Footer");
  const retailerLabel = tFooter(`retailers.${retailer}` as never) as string;
  const desc = t(store.descKey);
  const ogUrl = `/og?title=${encodeURIComponent(t("h1Tpl", { name: retailerLabel }))}&category=${encodeURIComponent(t("breadcrumbCurrent"))}&icon=${encodeURIComponent("🏬")}`;
  return {
    title: t("metaTitleTpl", { name: retailerLabel }),
    description: t("metaDescriptionTpl", { name: retailerLabel }),
    alternates: { canonical: `/store/${retailer}` },
    openGraph: {
      title: t("ogTitleTpl", { name: retailerLabel }),
      description: desc,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

export default async function StorePage({ params }: Props) {
  const { retailer } = await params;
  const store = storeMap[retailer];
  if (!store) notFound();

  const t = await getTranslations("Store");
  const tCommon = await getTranslations("Common");
  const tFooter = await getTranslations("Footer");
  const retailerLabel = tFooter(`retailers.${retailer}` as never) as string;
  const desc = t(store.descKey);

  const [allUseCases, exampleCounts] = await Promise.all([
    fetchUseCases(),
    fetchExampleCountsByUseCase(),
  ]);
  const items = allUseCases.filter((uc) => uc.supportedRetailers.includes(store.name));

  const BASE = "https://zumen.scoooop.com";
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: t("h1Tpl", { name: retailerLabel }),
    description: desc,
    url: `${BASE}/store/${retailer}`,
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
        items={[{ name: tCommon("breadcrumbHome"), href: "/" }, { name: retailerLabel }]}
      />

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {t("h1Tpl", { name: retailerLabel })}
      </h1>
      <p className="text-gray-500 mb-8">{desc}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {items.map((uc) => (
          <BlueprintCard key={uc.id} useCase={uc} exampleCount={exampleCounts[uc.id] ?? 0} />
        ))}
      </div>

      <AppStoreCTA
        variant="banner"
        title={t("appCtaTitleTpl", { name: retailerLabel })}
        description={t("appCtaDescription")}
      />

      <RelatedNav
        title={t("relatedNavTitle")}
        items={Object.entries(storeMap)
          .filter(([slug]) => slug !== retailer)
          .map(([slug]) => ({
            href: `/store/${slug}`,
            label: tFooter(`retailers.${slug}` as never) as string,
          }))}
      />
    </div>
  );
}
