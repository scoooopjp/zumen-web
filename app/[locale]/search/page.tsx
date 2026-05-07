import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import SearchResults from "@/components/SearchResults";
import { getBlueprintByTemplateID } from "@/lib/data";
import { fetchUseCases, fetchExampleCountsByUseCase } from "@/lib/firestore";
import type { UseCase } from "@/lib/data";
import { localizedAlternates } from "@/lib/i18nMeta";

// `?q=...` 違いで CDN を素通りしてた dynamic レンダリングを廃止し、ISR + Client filter に再構成。
// /search?q=* は noindex を維持するため、proxy.ts で X-Robots-Tag を付与している。
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Search");
  const locale = await getLocale();
  const title = t("metaTitle");
  const description = t("metaDescription");
  const ogUrl = `/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(t("ogCategory"))}&icon=${encodeURIComponent(t("ogIcon"))}`;
  return {
    title,
    description,
    alternates: localizedAlternates(locale, "/search"),
    // /search 自体は index させ、結果ページ (/search?q=*) は proxy.ts の X-Robots-Tag で noindex。
    robots: { index: true, follow: true },
    openGraph: {
      title: `${title} | ZUMEN`,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

/**
 * Client filter 用 haystack を事前正規化して返す。lib/data 全体を Client バンドルに
 * 入れないため、検索対象になる文字列だけをサーバーで結合・正規化して渡す。
 */
function buildHaystack(uc: UseCase): string {
  const blueprint = getBlueprintByTemplateID(uc.templateID);
  const text = [
    uc.name,
    uc.description,
    uc.category,
    uc.difficulty,
    uc.indoorOutdoor,
    ...uc.supportedRetailers,
    ...(blueprint?.tools ?? []),
    ...(blueprint?.parts.flatMap((part) => [part.name, part.spec, part.note ?? ""]) ?? []),
    ...(blueprint?.cutItems.map((item) => item.partName) ?? []),
    ...(blueprint?.warnings ?? []),
  ]
    .join(" ")
    .trim();
  return text.toLowerCase().normalize("NFKC").replace(/[×✕]/g, "x");
}

export default async function SearchPage() {
  const locale = await getLocale();
  const [all, exampleCounts] = await Promise.all([
    fetchUseCases(locale),
    fetchExampleCountsByUseCase(),
  ]);
  const haystacks: Record<string, string> = {};
  for (const uc of all) haystacks[uc.id] = buildHaystack(uc);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SearchResults useCases={all} exampleCounts={exampleCounts} haystacks={haystacks} />
    </div>
  );
}
