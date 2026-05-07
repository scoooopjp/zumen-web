"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import BlueprintCard from "@/components/BlueprintCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import RecentlyViewed from "@/components/RecentlyViewed";
import SearchInput from "@/components/SearchInput";
import type { UseCase } from "@/lib/data";

interface Props {
  useCases: UseCase[];
  exampleCounts: Record<string, number>;
  /**
   * useCaseID → 検索 haystack。サーバー側でブループリント詳細 (parts / cutItems / warnings 等)
   * を含めて事前正規化したテキストを渡す。lib/data の重い構造体を Client にバンドルしないために必須。
   */
  haystacks: Record<string, string>;
}

function tokenize(q: string): string[] {
  return normalizeSearchText(q)
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().normalize("NFKC").replace(/[×✕]/g, "x");
}

/**
 * 検索結果と空状態 UI をクライアントで描画する。
 * これにより `/search` ページ自体は ISR で CDN にキャッシュでき、`?q=...` 違いの
 * 大量アクセス (クローラー含む) で Vercel function invocation が増えなくなる。
 * 旧: SSR 毎回 fetchUseCases / fetchExampleCountsByUseCase 実行 → 新: 静的レスポンスを配信。
 */
export default function SearchResults({ useCases, exampleCounts, haystacks }: Props) {
  const t = useTranslations("Search");
  const tCommon = useTranslations("Common");
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();

  const tokens = useMemo(() => tokenize(query), [query]);
  const results = useMemo(() => {
    if (tokens.length === 0) return [];
    return useCases.filter((uc) => {
      const hay = haystacks[uc.id];
      if (!hay) return false;
      return tokens.every((tok) => hay.includes(tok));
    });
  }, [tokens, useCases, haystacks]);

  const popularKeywords = [
    t("popularKeyword1"),
    t("popularKeyword2"),
    t("popularKeyword3"),
    t("popularKeyword4"),
    t("popularKeyword5"),
    t("popularKeyword6"),
  ];

  return (
    <>
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
        {query ? t("leadResultTpl", { n: results.length }) : t("leadEmpty")}
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
            <BlueprintCard
              key={uc.id}
              useCase={uc}
              exampleCount={exampleCounts[uc.id] ?? 0}
            />
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
          <RecentlyViewed useCases={useCases} exampleCounts={exampleCounts} />
        </>
      )}
    </>
  );
}
