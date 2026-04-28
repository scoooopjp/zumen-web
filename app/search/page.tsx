import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import BlueprintCard from "@/components/BlueprintCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import RecentlyViewed from "@/components/RecentlyViewed";
import SearchInput from "@/components/SearchInput";
import { getBlueprintByTemplateID } from "@/lib/data";
import { fetchUseCases, fetchExampleCountsByUseCase } from "@/lib/firestore";
import type { UseCase } from "@/lib/data";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const hasQuery = typeof q === "string" && q.trim().length > 0;
  const t = await getTranslations("Search");
  const title = hasQuery ? t("metaTitleResultTpl", { q: q!.trim() }) : t("metaTitle");
  const description = hasQuery
    ? t("metaDescriptionResultTpl", { q: q!.trim() })
    : t("metaDescription");
  const ogUrl = `/og?title=${encodeURIComponent(title)}&category=${encodeURIComponent(t("ogCategory"))}&icon=${encodeURIComponent(t("ogIcon"))}`;
  return {
    title,
    description,
    alternates: { canonical: "/search" },
    robots: { index: !hasQuery, follow: true },
    openGraph: {
      title: `${title} | ZUMEN`,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [ogUrl] },
  };
}

function tokenize(q: string): string[] {
  return normalizeSearchText(q)
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[×✕]/g, "x");
}

function matches(uc: UseCase, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const blueprint = getBlueprintByTemplateID(uc.templateID);
  const haystack = [
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
  const normalizedHaystack = normalizeSearchText(haystack);
  return tokens.every((tok) => normalizedHaystack.includes(tok));
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const tokens = tokenize(query);
  const t = await getTranslations("Search");
  const tCommon = await getTranslations("Common");

  const locale = await getLocale();
  const [all, exampleCounts] = await Promise.all([
    fetchUseCases(locale),
    fetchExampleCountsByUseCase(),
  ]);
  const results = tokens.length === 0 ? [] : all.filter((uc) => matches(uc, tokens));

  const popularKeywords = [
    t("popularKeyword1"),
    t("popularKeyword2"),
    t("popularKeyword3"),
    t("popularKeyword4"),
    t("popularKeyword5"),
    t("popularKeyword6"),
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { name: tCommon("breadcrumbHome"), href: "/" },
          { name: query ? t("breadcrumbResultTpl", { q: query }) : t("breadcrumbCurrent") },
        ]}
      />

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {query ? t("h1ResultTpl", { q: query }) : t("h1")}
      </h1>
      <p className="text-gray-500 mb-6">
        {query
          ? t("leadResultTpl", { n: results.length })
          : t("leadEmpty")}
      </p>

      <div className="mb-8">
        <SearchInput />
      </div>

      {query && results.length === 0 && (
        <div
          className="rounded-2xl px-6 py-12 text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="font-bold mb-2" style={{ color: "var(--navy-deep)" }}>
            {t("noMatchTitle")}
          </p>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            {t("noMatchBody")}
          </p>
          <Link
            href="/category"
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            {t("browseAll")}
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((uc) => (
            <BlueprintCard key={uc.id} useCase={uc} exampleCount={exampleCounts[uc.id] ?? 0} />
          ))}
        </div>
      )}

      {!query && (
        <>
          <div className="mt-2">
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--navy-deep)" }}>
              {t("popularKeywordsTitle")}
            </p>
            <div className="flex flex-wrap gap-2">
              {popularKeywords.map((kw) => (
                <Link
                  key={kw}
                  href={`/search?q=${encodeURIComponent(kw)}`}
                  className="text-sm px-4 py-1.5 rounded-full transition-colors"
                  style={{
                    background: "var(--surface)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {kw}
                </Link>
              ))}
            </div>
          </div>
          <RecentlyViewed useCases={all} exampleCounts={exampleCounts} />
        </>
      )}
    </div>
  );
}
