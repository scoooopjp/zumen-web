import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlueprintCard from "@/components/BlueprintCard";
import AppStoreCTA from "@/components/AppStoreCTA";
import Breadcrumbs from "@/components/Breadcrumbs";
import RelatedNav from "@/components/RelatedNav";
import type { Retailer } from "@/lib/data";
import { fetchUseCases } from "@/lib/firestore";

interface Props {
  params: Promise<{ retailer: string }>;
}

const storeMap: Record<string, { name: Retailer; desc: string }> = {
  cainz:  { name: "カインズ",  desc: "全国に約230店舗。SPF材・ビス・金物が揃うDIY向けホームセンター。" },
  komeri: { name: "コメリ",   desc: "全国に約1,200店舗。農業・ガーデニング資材も豊富。" },
  kohnan: { name: "コーナン", desc: "関西・中国・九州エリアを中心に約350店舗。工具・木材が充実。" },
  dcm:    { name: "DCM",      desc: "全国に約670店舗のホームセンターチェーン。豊富な品揃えと価格の安さが魅力。" },
};

export async function generateStaticParams() {
  return Object.keys(storeMap).map((retailer) => ({ retailer }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { retailer } = await params;
  const store = storeMap[retailer];
  if (!store) return {};
  const ogUrl = `/og?title=${encodeURIComponent(`${store.name}で買えるDIY設計図`)}&category=${encodeURIComponent("ホームセンター")}&icon=${encodeURIComponent("🏬")}`;
  return {
    title: `${store.name}で買えるDIY設計図`,
    description: `${store.name}で材料が揃うDIY設計図一覧。棚・プランター台・コンポストなど。`,
    alternates: { canonical: `/store/${retailer}` },
    openGraph: {
      title: `${store.name}で買えるDIY設計図 | ZUMEN`,
      description: store.desc,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

export default async function StorePage({ params }: Props) {
  const { retailer } = await params;
  const store = storeMap[retailer];
  if (!store) notFound();

  const allUseCases = await fetchUseCases();
  const items = allUseCases.filter((uc) => uc.supportedRetailers.includes(store.name));

  const BASE = "https://zumen.scoooop.com";
  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${store.name}で買えるDIY設計図`,
    description: store.desc,
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
        items={[{ name: "TOP", href: "/" }, { name: store.name }]}
      />

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {store.name}で買えるDIY設計図
      </h1>
      <p className="text-gray-500 mb-8">{store.desc}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {items.map((uc) => (
          <BlueprintCard key={uc.id} useCase={uc} />
        ))}
      </div>

      <AppStoreCTA
        variant="banner"
        title={`${store.name}の材料リストをアプリで確認`}
        description="商品リンク付きの買い物リストをその場で生成。店舗での買い物がスムーズに。"
      />

      <RelatedNav
        title="他のホームセンターも見る"
        items={Object.entries(storeMap)
          .filter(([slug]) => slug !== retailer)
          .map(([slug, s]) => ({ href: `/store/${slug}`, label: s.name }))}
      />
    </div>
  );
}
