import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import BlueprintCard from "@/components/BlueprintCard";
import AppStoreCTA from "@/components/AppStoreCTA";
import { categories } from "@/lib/data";
import { fetchUseCases } from "@/lib/firestore";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return {};
  return {
    title: `${cat.name} DIY 設計図一覧`,
    description: `${cat.name}のDIY設計図を一覧で探せます。ホームセンター別の材料リスト付き。`,
    alternates: { canonical: `/category/${slug}` },
  };
}

export default async function CategoryDetailPage({ params }: Props) {
  const { slug } = await params;
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  const allUseCases = await fetchUseCases();
  const items = allUseCases.filter((uc) => uc.categorySlug === slug);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* パンくず */}
      <nav className="text-sm text-gray-400 mb-6 flex items-center gap-1.5">
        <Link href="/" className="hover:text-gray-600">TOP</Link>
        <span>/</span>
        <Link href="/category" className="hover:text-gray-600">設計図一覧</Link>
        <span>/</span>
        <span className="text-gray-600">{cat.name}</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">{cat.name} DIY 設計図</h1>
      <p className="text-gray-500 mb-8">{cat.description}</p>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {items.map((uc) => (
            <BlueprintCard key={uc.id} useCase={uc} />
          ))}
        </div>
      ) : (
        <p className="text-gray-400 mb-12">設計図を準備中です。</p>
      )}

      <AppStoreCTA
        variant="banner"
        title={`${cat.name}をカスタムサイズで作る`}
        description="アプリでは幅・奥行・高さを入力するだけで設計図と材料リストを自動生成。"
      />
    </div>
  );
}
