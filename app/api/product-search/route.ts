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

function docIdFor(retailer: RetailerKey, keyword: string): string {
  // Firestore document ID はスラッシュ不可。keyword は日本語/記号を含むため percent-encode して
  // "%" を "_" に置換（ID安全な英数字・アンダースコア主体に）。
  const safe = encodeURIComponent(keyword.trim()).replace(/%/g, "_");
  return `${retailer}__${safe}`;
}

async function getCachedOrScrape(retailer: RetailerKey, keyword: string): Promise<ProductResult> {
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

  if (docRef && result && result.name) {
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
}

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

  const result = await getCachedOrScrape(retailer, keyword.trim());
  return NextResponse.json(result, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}
