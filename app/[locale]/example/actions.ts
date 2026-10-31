"use server";

import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { fetchExamplePage, type ExampleCursor, type ExamplePage } from "@/lib/firestore";

const EMPTY_PAGE: ExamplePage = { examples: [], nextCursor: null };

/**
 * Server Action は公開 POST エンドポイントとして任意の引数で呼べるため、
 * Firestore クエリに渡す前に locale / cursor の形を検証する。
 */
function isValidCursor(cursor: unknown): cursor is ExampleCursor {
  if (typeof cursor !== "object" || cursor === null) return false;
  const { popularityScore, createdAtISO } = cursor as Record<string, unknown>;
  return (
    typeof popularityScore === "number" &&
    Number.isFinite(popularityScore) &&
    typeof createdAtISO === "string" &&
    createdAtISO.length <= 40 &&
    !Number.isNaN(Date.parse(createdAtISO))
  );
}

/**
 * /example の「もっと見る」用 server action。1 ページあたり 24 件 + cursor。
 * クライアントから直接 import して呼び出す。
 */
export async function loadMoreExamples(opts: {
  locale: string;
  cursor: ExampleCursor;
}): Promise<ExamplePage> {
  if (!hasLocale(routing.locales, opts?.locale) || !isValidCursor(opts.cursor)) {
    return EMPTY_PAGE;
  }
  return await fetchExamplePage({
    locale: opts.locale,
    cursor: { popularityScore: opts.cursor.popularityScore, createdAtISO: opts.cursor.createdAtISO },
    limit: 24,
  });
}
