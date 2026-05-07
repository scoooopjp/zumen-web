"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import ExampleCard from "@/components/ExampleCard";
import { loadMoreExamples } from "@/app/[locale]/example/actions";
import type { ExampleCursor } from "@/lib/firestore";
import type { Example } from "@/lib/examples";

interface Props {
  initialExamples: Example[];
  initialCursor: ExampleCursor | null;
}

/**
 * `/example` 一覧の最初の 1 ページはサーバーで描画し、以降は server action 経由でロードする。
 * 旧実装は default 60 件をいきなり読んでいた。limit + cursor に切り出すことで初回 reads を半分以下に抑えつつ、
 * ユーザーが下までスクロールした分しか追加 reads が発生しない。
 */
export default function ExampleListInfinite({ initialExamples, initialCursor }: Props) {
  const locale = useLocale();
  const t = useTranslations("ExampleList");
  const [examples, setExamples] = useState<Example[]>(initialExamples);
  const [cursor, setCursor] = useState<ExampleCursor | null>(initialCursor);
  const [isPending, startTransition] = useTransition();

  const onLoadMore = () => {
    if (!cursor) return;
    const cursorAtClick = cursor;
    startTransition(async () => {
      const page = await loadMoreExamples({ locale, cursor: cursorAtClick });
      setExamples((prev) => {
        // 重複排除 (二度押し対策)
        const seen = new Set(prev.map((e) => e.id));
        const next = page.examples.filter((e) => !seen.has(e.id));
        return [...prev, ...next];
      });
      setCursor(page.nextCursor);
    });
  };

  if (examples.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {examples.map((ex) => (
          <ExampleCard key={ex.id} example={ex} />
        ))}
      </div>

      {cursor && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isPending}
            className="text-sm px-6 py-2.5 rounded-xl font-semibold transition-opacity disabled:opacity-50"
            style={{
              background: "var(--surface)",
              color: "var(--navy-deep)",
              border: "1px solid var(--border)",
            }}
          >
            {isPending ? t("loadMoreLoading") : t("loadMore")}
          </button>
        </div>
      )}
    </>
  );
}
