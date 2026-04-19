/**
 * GET /api/product-search?retailer=cainz&keyword=1x4+SPF
 *
 * Returns first matching product: { name, price, url, retailer }
 * Cached per (retailer, keyword) for 24 hours.
 */

import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { scrapeProduct, type RetailerKey } from "@/lib/scraper";

const VALID_RETAILERS: RetailerKey[] = ["cainz", "komeri", "kohnan", "dcm"];

const getCachedProduct = unstable_cache(
  async (retailer: RetailerKey, keyword: string) => {
    return scrapeProduct(retailer, keyword);
  },
  ["product-search"],
  { revalidate: 86400 } // 24h
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const retailer = searchParams.get("retailer") as RetailerKey | null;
  const keyword = searchParams.get("keyword");

  if (!retailer || !VALID_RETAILERS.includes(retailer)) {
    return NextResponse.json(
      { error: "retailer must be one of: " + VALID_RETAILERS.join(", ") },
      { status: 400 }
    );
  }
  if (!keyword || keyword.trim().length === 0) {
    return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  }

  const result = await getCachedProduct(retailer, keyword.trim());
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}
