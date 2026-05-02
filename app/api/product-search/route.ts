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
import { getCachedOrScrape } from "@/lib/productSearchServer";
import { normalizeProductKeyword, type ProductSearchRetailer } from "@/lib/productSearch";
import { isRateLimited } from "@/lib/rateLimit";

const VALID_RETAILERS: ProductSearchRetailer[] = ["cainz", "komeri", "kohnan", "dcm"];
const KEYWORD_MAX_LENGTH = 80;
const KEYWORD_MAX_TOKENS = 8;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 60;

function isValidKeyword(keyword: string): boolean {
  if (keyword.length === 0 || keyword.length > KEYWORD_MAX_LENGTH) return false;
  if (/https?:\/\//i.test(keyword)) return false;
  if (keyword.split(/\s+/).filter(Boolean).length > KEYWORD_MAX_TOKENS) return false;
  return /^[\p{L}\p{N}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\s×✕xX+\-.,/%()#&]+$/u.test(keyword);
}

function getClientKey(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  // IP が取れない場合は共通バケットに落として fail-closed にする (旧実装は null で
  // リミットを完全バイパスしていた)。
  return "__unknown__";
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const retailer = searchParams.get("retailer") as ProductSearchRetailer | null;
  const keyword = normalizeProductKeyword(searchParams.get("keyword") ?? "");

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

  if (await isRateLimited(`single:${getClientKey(req)}`, RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX_REQUESTS)) {
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
