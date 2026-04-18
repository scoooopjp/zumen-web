import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import BlueprintCard from "@/components/BlueprintCard";
import AppStoreCTA from "@/components/AppStoreCTA";
import { useCases } from "@/lib/data";
import type { Retailer } from "@/lib/data";

interface Props {
  params: Promise<{ retailer: string }>;
}

const storeMap: Record<string, { name: Retailer; desc: string }> = {
  cainz: { name: "カインズ", desc: "全国に約230店舗。SPF材・ビス・金物が揃うDIY向けホームセンター。" },
  komeri: { name: "コメリ", desc: "全国に約1,200店舗。農業・ガーデニング資材も豊富。" },
};

export async function generateStaticParams() {
  return Object.keys(storeMap).map((retailer) => ({ retailer }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { retailer } = await params;
  const store = storeMap[retailer];
  if (!store) return {};
  return {
    title: `${store.name}で買えるDIY設計図`,
    description: `${store.name}で材料が揃うDIY設計図一覧。棚・プランター台・コンポストなど。`,
    alternates: { canonical: `/store/${retailer}` },
  };
}

export default async function StorePage({ params }: Props) {
  const { retailer } = await params;
  const store = storeMap[retailer];
  if (!store) notFound();

  const items = useCases.filter((uc) => uc.supportedRetailers.includes(store.name));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* パンくず */}
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1.5">
        <Link href="/" className="hover:text-gray-600">TOP</Link>
        <span>/</span>
        <span className="text-gray-600">{store.name}</span>
      </nav>

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
    </div>
  );
}
