import { NextRequest, NextResponse } from "next/server";
import { getCachedOrScrape } from "@/lib/productSearchServer";
import {
  makeProductLookupKey,
  normalizeProductKeyword,
  type ProductSearchLookup,
  type ProductSearchResult,
  type ProductSearchRetailer,
} from "@/lib/productSearch";

const VALID_RETAILERS: ProductSearchRetailer[] = ["cainz", "komeri", "kohnan", "dcm"];
const KEYWORD_MAX_LENGTH = 80;
const KEYWORD_MAX_TOKENS = 8;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const BATCH_MAX_ITEMS = 40;

const rateLimitHits = new Map<string, number[]>();

function isValidKeyword(keyword: string): boolean {
  if (keyword.length === 0 || keyword.length > KEYWORD_MAX_LENGTH) return false;
  if (/https?:\/\//i.test(keyword)) return false;
  if (keyword.split(/\s+/).filter(Boolean).length > KEYWORD_MAX_TOKENS) return false;
  return /^[\p{L}\p{N}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s×✕xX+\-.,/%()#&]+$/u.test(keyword);
}

function getClientKey(req: NextRequest): string | null {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

function isRateLimited(clientKey: string): boolean {
  const now = Date.now();
  const recent = (rateLimitHits.get(clientKey) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );
  recent.push(now);
  rateLimitHits.set(clientKey, recent);
  return recent.length > RATE_LIMIT_MAX_REQUESTS;
}

function normalizeLookup(item: ProductSearchLookup): ProductSearchLookup | null {
  if (!VALID_RETAILERS.includes(item.retailer)) return null;
  const keyword = normalizeProductKeyword(item.keyword);
  if (!isValidKeyword(keyword)) return null;
  return { retailer: item.retailer, keyword };
}

export async function POST(req: NextRequest) {
  const clientKey = getClientKey(req);
  if (clientKey && isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: "rate limit exceeded" },
      { status: 429, headers: { "Retry-After": "60" } }
    );
  }

  const body = await req.json().catch(() => null) as { items?: ProductSearchLookup[] } | null;
  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0 || items.length > BATCH_MAX_ITEMS) {
    return NextResponse.json(
      { error: `items must contain between 1 and ${BATCH_MAX_ITEMS} lookups` },
      { status: 400 }
    );
  }

  const unique = new Map<string, ProductSearchLookup>();
  for (const item of items) {
    const normalized = normalizeLookup(item);
    if (!normalized) {
      return NextResponse.json({ error: "invalid lookup in batch" }, { status: 400 });
    }
    unique.set(makeProductLookupKey(normalized.retailer, normalized.keyword), normalized);
  }

  const entries = await Promise.all(
    Array.from(unique.entries()).map(async ([key, lookup]) => {
      const result = await getCachedOrScrape(lookup.retailer, lookup.keyword);
      return [key, result] as const;
    })
  );

  return NextResponse.json(
    {
      results: Object.fromEntries(entries) as Record<string, ProductSearchResult>,
    },
    {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300" },
    }
  );
}
