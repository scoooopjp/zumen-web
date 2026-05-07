"use server";

import { fetchExamplePage, type ExampleCursor, type ExamplePage } from "@/lib/firestore";

/**
 * /example の「もっと見る」用 server action。1 ページあたり 24 件 + cursor。
 * クライアントから直接 import して呼び出す。
 */
export async function loadMoreExamples(opts: {
  locale: string;
  cursor: ExampleCursor;
}): Promise<ExamplePage> {
  return await fetchExamplePage({
    locale: opts.locale,
    cursor: opts.cursor,
    limit: 24,
  });
}
