/**
 * GET /api/product-search?retailer=cainz&keyword=1x4+SPF
 *
 * Firestore `productPrices/{retailer}__{keyword}` をキャッシュ兼 SoT として利用し、
 * Web / iOS 両方が同じデータを参照できるようにする。
 *   - hit + fresh (< 7日) → Firestore からそのまま返す
 *   - miss or stale         → scrapeProduct で取得し Firestore に書き戻す
 *   - Admin SDK 未設定      → スクレイピングだけで応答（従来動作にフォールバック）
 */

import { NextRequest, NextResponse } from "next/server";
import { scrapeProduct, type RetailerKey, type ProductResult } from "@/lib/scraper";
import { getAdminDb } from "@/lib/firebase-admin";

const VALID_RETAILERS: RetailerKey[] = ["cainz", "komeri", "kohnan", "dcm"];
const FRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7日
const KEYWORD_MAX_LENGTH = 80;
const KEYWORD_MAX_TOKENS = 8;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;

const rateLimitHits = new Map<string, number[]>();
const inFlightRequests = new Map<string, Promise<ProductResult>>();

function normalizeKeyword(keyword: string): string {
  return keyword.replace(/\s+/g, " ").trim();
}

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

function shouldPersistResult(result: ProductResult, keyword: string): boolean {
  if (!result.name || result.url.length === 0) return false;
  if (result.price !== null) return true;
  return normalizeKeyword(result.name).toLowerCase() !== keyword.toLowerCase();
}

function docIdFor(retailer: RetailerKey, keyword: string): string {
  // Firestore document ID はスラッシュ不可。keyword は日本語/記号を含むため percent-encode して
  // "%" を "_" に置換（ID安全な英数字・アンダースコア主体に）。
  const safe = encodeURIComponent(keyword.trim()).replace(/%/g, "_");
  return `${retailer}__${safe}`;
}

async function getCachedOrScrape(retailer: RetailerKey, keyword: string): Promise<ProductResult> {
  const requestKey = `${retailer}:${keyword}`;
  const pending = inFlightRequests.get(requestKey);
  if (pending) return pending;

  const task = (async (): Promise<ProductResult> => {
  const db = getAdminDb();
  const docRef = db?.collection("productPrices").doc(docIdFor(retailer, keyword));

  if (docRef) {
    try {
      const snap = await docRef.get();
      if (snap.exists) {
        const data = snap.data()!;
        const fetchedAt = data.fetchedAt?.toDate?.() ?? new Date(0);
        const fresh = Date.now() - fetchedAt.getTime() < FRESH_TTL_MS;
        if (fresh) {
          return {
            name: (data.name as string) ?? "",
            price: (data.price as number | null) ?? null,
            url: (data.url as string) ?? "",
            retailer: (data.retailer as string) ?? retailer,
          };
        }
      }
    } catch (e) {
      console.warn("[product-search] Firestore read failed, falling back to scrape:", e);
    }
  }

  const result = await scrapeProduct(retailer, keyword);

  if (docRef && shouldPersistResult(result, keyword)) {
    try {
      await docRef.set({
        retailer: result.retailer,
        keyword,
        name: result.name,
        price: result.price ?? null,
        url: result.url,
        fetchedAt: new Date(),
      });
    } catch (e) {
      console.warn("[product-search] Firestore write failed:", e);
    }
  }

  return result;
  })();

  inFlightRequests.set(requestKey, task);
  try {
    return await task;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const retailer = searchParams.get("retailer") as RetailerKey | null;
  const keyword = normalizeKeyword(searchParams.get("keyword") ?? "");

  if (!retailer || !VALID_RETAILERS.includes(retailer)) {
    return NextResponse.json(
      { error: "retailer must be one of: " + VALID_RETAILERS.join(", ") },
      { status: 400 }
    );
  }
  if (!isValidKeyword(keyword)) {
    return NextResponse.json(
      { error: `keyword must be 1-${KEYWORD_MAX_LENGTH} chars and use a supported format` },
      { status: 400 }
    );
  }

  const clientKey = getClientKey(req);
  if (clientKey && isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: "rate limit exceeded" },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      }
    );
  }

  const result = await getCachedOrScrape(retailer, keyword);
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}
