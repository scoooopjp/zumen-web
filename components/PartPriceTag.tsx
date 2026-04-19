"use client";

/**
 * Fetches live price for a single part+retailer and renders a pill badge.
 * Falls back gracefully to a link-only button if price is unavailable.
 *
 * keyword is extracted from `searchURL` (komeri/kohnan/dcm use ?q= or ?KEYWORDS= or ?searchWord=)
 * and used to call /api/product-search for this retailer.
 */

import { useEffect, useState } from "react";

interface Props {
  href: string;          // static fallback search URL (also the link target before we get a live URL)
  searchURL?: string;    // URL with keyword param to extract the search term from
  keyword?: string;      // explicit keyword override (takes priority over searchURL extraction)
  retailer: "cainz" | "komeri" | "kohnan" | "dcm";
  label: string;
  style: React.CSSProperties;
}

interface PriceData {
  price: number | null;
  url: string;
}

// Simple in-memory cache for the session
const priceCache = new Map<string, PriceData>();

function extractKeyword(url: string): string {
  try {
    const u = new URL(url);
    const kw =
      u.searchParams.get("q") ||
      u.searchParams.get("KEYWORDS") ||
      u.searchParams.get("searchWord");
    if (kw) return decodeURIComponent(kw.replace(/\+/g, " "));
  } catch {
    // ignore
  }
  return "";
}

export default function PartPriceTag({ href, searchURL, keyword: keywordProp, retailer, label, style }: Props) {
  const [data, setData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(false);

  const keyword = keywordProp || (searchURL ? extractKeyword(searchURL) : "") || extractKeyword(href);

  useEffect(() => {
    if (!keyword) return;
    const cacheKey = `${retailer}:${keyword}`;
    if (priceCache.has(cacheKey)) {
      setData(priceCache.get(cacheKey)!);
      return;
    }
    setLoading(true);
    fetch(`/api/product-search?retailer=${retailer}&keyword=${encodeURIComponent(keyword)}`)
      .then((r) => r.json())
      .then((result: PriceData) => {
        priceCache.set(cacheKey, result);
        setData(result);
      })
      .catch(() => setData({ price: null, url: href }))
      .finally(() => setLoading(false));
  }, [retailer, keyword, href]);

  const finalHref = data?.url || href;
  const price = data?.price;

  return (
    <a
      href={finalHref}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full"
      style={style}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.82 13h7.86l1.79-7H5.21l-.94-4H1v2h2l3.6 7.59L5.25 13c-.16.28-.25.61-.25.95C5 15.1 5.9 16 7 16h13v-2H7.42z" />
      </svg>
      {label}
      {loading && <span className="opacity-50 text-[10px]">…</span>}
      {!loading && price != null && (
        <span className="ml-0.5 font-normal opacity-80">¥{price.toLocaleString()}</span>
      )}
    </a>
  );
}
