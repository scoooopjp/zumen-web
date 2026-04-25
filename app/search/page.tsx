import type { Metadata } from "next";
import Link from "next/link";
import BlueprintCard from "@/components/BlueprintCard";
import Breadcrumbs from "@/components/Breadcrumbs";
import RecentlyViewed from "@/components/RecentlyViewed";
import SearchInput from "@/components/SearchInput";
import { fetchUseCases } from "@/lib/firestore";
import type { UseCase } from "@/lib/data";

interface Props {
  searchParams: Promise<{ q?: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  const hasQuery = typeof q === "string" && q.trim().length > 0;
  return {
    title: hasQuery ? `「${q}」の検索結果` : "設計図を検索",
    description: hasQuery
      ? `「${q}」を含む DIY 設計図の検索結果。`
      : "棚・ベンチ・ウッドデッキなどの DIY 設計図をキーワードで検索できます。",
    alternates: { canonical: "/search" },
    robots: { index: !hasQuery, follow: true },
  };
}

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .normalize("NFKC")
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function matches(uc: UseCase, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const haystack = [
    uc.name,
    uc.description,
    uc.category,
    uc.difficulty,
    uc.indoorOutdoor,
    ...uc.supportedRetailers,
  ]
    .join(" ")
    .toLowerCase()
    .normalize("NFKC");
  return tokens.every((t) => haystack.includes(t));
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const tokens = tokenize(query);

  const all = await fetchUseCases();
  const results = tokens.length === 0 ? [] : all.filter((uc) => matches(uc, tokens));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[
          { name: "TOP", href: "/" },
          { name: query ? `「${query}」の検索結果` : "検索" },
        ]}
      />

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        {query ? `「${query}」の検索結果` : "設計図を検索"}
      </h1>
      <p className="text-gray-500 mb-6">
        {query
          ? `${results.length} 件ヒットしました`
          : "設計図名・カテゴリ・対応ホームセンターから検索できます。"}
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
            一致する設計図が見つかりませんでした
          </p>
          <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
            別のキーワードで試すか、カテゴリから探してみてください。
          </p>
          <Link
            href="/category"
            className="btn-primary text-sm inline-flex items-center gap-1.5"
          >
            設計図一覧を見る
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {results.map((uc) => (
            <BlueprintCard key={uc.id} useCase={uc} />
          ))}
        </div>
      )}

      {!query && (
        <>
          <div className="mt-2">
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--navy-deep)" }}>
              人気のキーワード
            </p>
            <div className="flex flex-wrap gap-2">
              {["棚", "ベンチ", "ウッドデッキ", "シューズラック", "コンポスト", "プランター台"].map((kw) => (
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
          <RecentlyViewed useCases={all} />
        </>
      )}
    </div>
  );
}
