"use client";

import { useTranslations } from "next-intl";
import BlueprintCard from "@/components/BlueprintCard";
import { useRecentlyViewed } from "@/lib/useRecentlyViewed";
import type { UseCase } from "@/lib/data";

interface Props {
  /** All known useCases. The component looks up viewed slugs against this list. */
  useCases: UseCase[];
  /** useCaseID → 作例件数。BlueprintCard のバッジ表示に使う。 */
  exampleCounts?: Record<string, number>;
  /** Optional title override. */
  title?: string;
  /** Slug to exclude (e.g. the current blueprint when used on the detail page). */
  excludeSlug?: string;
  /** If empty after filtering, render nothing. */
  hideWhenEmpty?: boolean;
}

export default function RecentlyViewed({
  useCases,
  exampleCounts,
  title,
  excludeSlug,
  hideWhenEmpty = true,
}: Props) {
  const t = useTranslations("RecentlyViewed");
  const resolvedTitle = title ?? t("title");
  const slugs = useRecentlyViewed();
  const items = slugs
    .filter((s) => s !== excludeSlug)
    .map((slug) => useCases.find((uc) => uc.slug === slug))
    .filter((uc): uc is UseCase => Boolean(uc))
    .slice(0, 6);

  if (items.length === 0 && hideWhenEmpty) return null;

  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{resolvedTitle}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((uc) => (
          <BlueprintCard key={uc.id} useCase={uc} exampleCount={exampleCounts?.[uc.id] ?? 0} />
        ))}
      </div>
    </section>
  );
}
