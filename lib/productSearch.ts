export type ProductSearchRetailer = "cainz" | "komeri" | "kohnan" | "dcm";

export interface ProductSearchResult {
  name: string;
  price: number | null;
  url: string;
  retailer: string;
}

export interface ProductSearchLookup {
  retailer: ProductSearchRetailer;
  keyword: string;
}

export function normalizeProductKeyword(keyword: string): string {
  return keyword.replace(/\s+/g, " ").trim();
}

export function extractKeywordFromURL(url: string): string {
  try {
    const u = new URL(url);
    const kw =
      u.searchParams.get("q") ||
      u.searchParams.get("KEYWORDS") ||
      u.searchParams.get("searchWord");
    if (kw) return decodeURIComponent(kw.replace(/\+/g, " "));
  } catch {
    // ignore malformed URLs
  }
  return "";
}

export function makeProductLookupKey(retailer: ProductSearchRetailer, keyword: string): string {
  return `${retailer}:${normalizeProductKeyword(keyword)}`;
}
