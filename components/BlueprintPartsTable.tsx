"use client";

import { useEffect, useMemo, useState } from "react";
import PartPriceTag from "@/components/PartPriceTag";
import type { Part } from "@/lib/data";
import {
  extractKeywordFromURL,
  makeProductLookupKey,
  normalizeProductKeyword,
  type ProductSearchLookup,
  type ProductSearchResult,
  type ProductSearchRetailer,
} from "@/lib/productSearch";

interface Props {
  parts: Part[];
}

interface PriceBadgeConfig {
  retailer: ProductSearchRetailer;
  label: string;
  href: string;
  keyword: string;
  style: React.CSSProperties;
}

const priceCache = new Map<string, ProductSearchResult>();

function makeBadgeConfigs(part: Part): PriceBadgeConfig[] {
  const configs: Array<PriceBadgeConfig | null> = [
    part.cainzURL
      ? {
          retailer: "cainz" as const,
          label: "カインズ",
          href: part.cainzURL,
          keyword: normalizeProductKeyword(extractKeywordFromURL(part.cainzURL)),
          style: { background: "#1565C020", color: "#1565C0", border: "1px solid #1565C040" },
        }
      : null,
    part.komeriURL
      ? {
          retailer: "komeri" as const,
          label: "コメリ",
          href: part.komeriURL,
          keyword: normalizeProductKeyword(extractKeywordFromURL(part.komeriURL)),
          style: { background: "#C0000020", color: "#C00000", border: "1px solid #C0000040" },
        }
      : null,
    part.kohnanURL
      ? {
          retailer: "kohnan" as const,
          label: "コーナン",
          href: part.kohnanURL,
          keyword: normalizeProductKeyword(extractKeywordFromURL(part.kohnanURL)),
          style: { background: "#E6500020", color: "#E65000", border: "1px solid #E6500040" },
        }
      : null,
    part.dcmURL
      ? {
          retailer: "dcm" as const,
          label: "DCM",
          href: part.dcmURL,
          keyword: normalizeProductKeyword(extractKeywordFromURL(part.dcmURL)),
          style: { background: "#2E7D3220", color: "#2E7D32", border: "1px solid #2E7D3240" },
        }
      : null,
  ];

  return configs.filter((item): item is PriceBadgeConfig => item !== null);
}

export default function BlueprintPartsTable({ parts }: Props) {
  const [results, setResults] = useState<Record<string, ProductSearchResult>>({});

  const partBadges = useMemo(
    () => parts.map((part) => ({ part, badges: makeBadgeConfigs(part) })),
    [parts]
  );

  const lookups = useMemo(() => {
    const unique = new Map<string, ProductSearchLookup>();
    for (const { badges } of partBadges) {
      for (const badge of badges) {
        if (!badge.keyword) continue;
        const key = makeProductLookupKey(badge.retailer, badge.keyword);
        if (!unique.has(key)) {
          unique.set(key, { retailer: badge.retailer, keyword: badge.keyword });
        }
      }
    }
    return Array.from(unique.values());
  }, [partBadges]);

  const cachedResults = useMemo(
    () =>
      Object.fromEntries(
        lookups.flatMap((lookup) => {
          const key = makeProductLookupKey(lookup.retailer, lookup.keyword);
          const value = priceCache.get(key);
          return value ? [[key, value] as const] : [];
        })
      ) as Record<string, ProductSearchResult>,
    [lookups]
  );

  const resolvedResults = useMemo(
    () => ({ ...cachedResults, ...results }),
    [cachedResults, results]
  );

  useEffect(() => {
    const misses = lookups.filter(
      (lookup) => !priceCache.has(makeProductLookupKey(lookup.retailer, lookup.keyword))
    );
    if (misses.length === 0) return;

    fetch("/api/product-search/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: misses }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ results: Record<string, ProductSearchResult> }>;
      })
      .then(({ results: batchResults }) => {
        for (const [key, value] of Object.entries(batchResults)) {
          priceCache.set(key, value);
        }
        setResults((prev) => ({ ...prev, ...batchResults }));
      })
      .catch(() => {
        // fallback to static links only
      });
  }, [lookups]);

  return (
    <div className="rounded-xl divide-y overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      {partBadges.map(({ part, badges }, idx) => (
        <div key={`${part.name}-${idx}`} className="px-4 py-3 text-sm" style={{ background: "var(--surface)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium text-gray-900">{part.name}</p>
              <p className="text-gray-400 text-xs font-mono">{part.spec}</p>
              {part.note && (
                <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{part.note}</p>
              )}
            </div>
            <p className="font-bold text-gray-700 shrink-0 mt-0.5">
              {part.quantity} {part.unit}
            </p>
          </div>
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2.5">
              {badges.map((badge) => {
                const lookupKey = badge.keyword
                  ? makeProductLookupKey(badge.retailer, badge.keyword)
                  : null;
                const result = lookupKey ? resolvedResults[lookupKey] : undefined;
                return (
                  <PartPriceTag
                    key={`${badge.retailer}-${badge.href}`}
                    href={result?.url || badge.href}
                    label={badge.label}
                    style={badge.style}
                    price={result?.price ?? null}
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
