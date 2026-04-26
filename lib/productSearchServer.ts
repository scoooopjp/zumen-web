import { getAdminDb } from "@/lib/firebase-admin";
import { scrapeProduct, type ProductResult, type RetailerKey } from "@/lib/scraper";
import { normalizeProductKeyword } from "@/lib/productSearch";

const FRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7日

const inFlightRequests = new Map<string, Promise<ProductResult>>();

function docIdFor(retailer: RetailerKey, keyword: string): string {
  const safe = encodeURIComponent(normalizeProductKeyword(keyword)).replace(/%/g, "_");
  return `${retailer}__${safe}`;
}

function shouldPersistResult(result: ProductResult, keyword: string): boolean {
  if (!result.name || result.url.length === 0) return false;
  if (result.price !== null) return true;
  return normalizeProductKeyword(result.name).toLowerCase() !== keyword.toLowerCase();
}

export async function getCachedOrScrape(retailer: RetailerKey, keyword: string): Promise<ProductResult> {
  const normalizedKeyword = normalizeProductKeyword(keyword);
  const requestKey = `${retailer}:${normalizedKeyword}`;
  const pending = inFlightRequests.get(requestKey);
  if (pending) return pending;

  const task = (async (): Promise<ProductResult> => {
    const db = getAdminDb();
    const docRef = db?.collection("productPrices").doc(docIdFor(retailer, normalizedKeyword));

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

    const result = await scrapeProduct(retailer, normalizedKeyword);

    if (docRef && shouldPersistResult(result, normalizedKeyword)) {
      try {
        await docRef.set({
          retailer: result.retailer,
          keyword: normalizedKeyword,
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
