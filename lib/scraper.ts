/**
 * EC site product scraper
 *
 * Fetches first-hit product info (name, price, URL) from each retailer's search page.
 * Results are cached at the call-site via Next.js unstable_cache (24h TTL).
 *
 * NOTE: Selectors are best-effort based on common patterns.
 *       Verify/adjust when actual HTML structure is confirmed.
 */

import * as cheerio from "cheerio";

export interface ProductResult {
  name: string;
  price: number | null; // JPY, tax-included; null if unavailable
  url: string;
  retailer: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchHTML(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "ja,en;q=0.9",
    },
    // next cache handled by unstable_cache at API layer
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.text();
}

/** Extract first price (JPY) found in text — handles ¥1,234 and 1,234円 */
function parsePrice(text: string): number | null {
  const m = text.match(/[¥￥]([0-9,]+)|([0-9,]+)\s*円/);
  if (!m) return null;
  const raw = (m[1] ?? m[2]).replace(/,/g, "");
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

// ─── Cainz ────────────────────────────────────────────────────────────────────
// Search: https://www.cainz.com/shop/g/g{SKU} redirects to product page
// For generic keyword search: https://www.cainz.com/search?q=...
export async function scrapeCainz(keyword: string): Promise<ProductResult> {
  const searchURL = `https://www.cainz.com/search?q=${encodeURIComponent(keyword)}`;
  try {
    const html = await fetchHTML(searchURL);
    const $ = cheerio.load(html);
    // Cainz search result cards — selectors to verify against live site
    const card = $("[class*='product-item'], [class*='item-box'], li.item").first();
    const name =
      card.find("[class*='product-name'], [class*='item-name'], .name").first().text().trim() ||
      $("title").text().split("|")[0].trim();
    const priceText =
      card.find("[class*='price'], [class*='Price']").first().text() || "";
    const price = parsePrice(priceText);
    const link = card.find("a").first().attr("href");
    const url = link
      ? link.startsWith("http")
        ? link
        : `https://www.cainz.com${link}`
      : searchURL;
    return { name: name || keyword, price, url, retailer: "カインズ" };
  } catch {
    return { name: keyword, price: null, url: searchURL, retailer: "カインズ" };
  }
}

// ─── Komeri ───────────────────────────────────────────────────────────────────
export async function scrapeKomeri(keyword: string): Promise<ProductResult> {
  const searchURL = `https://www.komeri.com/disp/CKmSfKeyWordPage.jsp?KEYWORDS=${encodeURIComponent(keyword)}`;
  try {
    const html = await fetchHTML(searchURL);
    const $ = cheerio.load(html);
    const card = $("div.item_block, li.item, div.itemListArea > div").first();
    const name =
      card.find(".item_name, .itemName, [class*='name']").first().text().trim() || keyword;
    const priceText = card.find(".item_price, .price, [class*='price']").first().text();
    const price = parsePrice(priceText);
    const link = card.find("a").first().attr("href");
    const url = link
      ? link.startsWith("http")
        ? link
        : `https://www.komeri.com${link}`
      : searchURL;
    return { name, price, url, retailer: "コメリ" };
  } catch {
    return { name: keyword, price: null, url: searchURL, retailer: "コメリ" };
  }
}

// ─── コーナン ──────────────────────────────────────────────────────────────────
export async function scrapeKohnan(keyword: string): Promise<ProductResult> {
  const searchURL = `https://www.kohnan-eshop.com/shop/search?searchWord=${encodeURIComponent(keyword)}`;
  try {
    const html = await fetchHTML(searchURL);
    const $ = cheerio.load(html);
    const card = $("div.item_box, li.item, div.product-list-item, div[class*='item']").first();
    const name =
      card.find("[class*='name'], [class*='title']").first().text().trim() || keyword;
    const priceText = card.find("[class*='price']").first().text();
    const price = parsePrice(priceText);
    const link = card.find("a").first().attr("href");
    const url = link
      ? link.startsWith("http")
        ? link
        : `https://www.kohnan-eshop.com${link}`
      : searchURL;
    return { name, price, url, retailer: "コーナン" };
  } catch {
    return { name: keyword, price: null, url: searchURL, retailer: "コーナン" };
  }
}

// ─── DCM ──────────────────────────────────────────────────────────────────────
export async function scrapeDCM(keyword: string): Promise<ProductResult> {
  const searchURL = `https://www.dcm-online.jp/search?q=${encodeURIComponent(keyword)}`;
  try {
    const html = await fetchHTML(searchURL);
    const $ = cheerio.load(html);
    // DCM online uses a SPA; if HTML is empty, fall back to static URL
    const card = $("div.item-card, li.item, [class*='product']").first();
    const name =
      card.find("[class*='name'], [class*='title']").first().text().trim() || keyword;
    const priceText = card.find("[class*='price']").first().text();
    const price = parsePrice(priceText);
    const link = card.find("a").first().attr("href");
    const url = link
      ? link.startsWith("http")
        ? link
        : `https://www.dcm-online.jp${link}`
      : searchURL;
    return { name, price, url, retailer: "DCM" };
  } catch {
    return { name: keyword, price: null, url: searchURL, retailer: "DCM" };
  }
}

export type RetailerKey = "cainz" | "komeri" | "kohnan" | "dcm";

export async function scrapeProduct(
  retailer: RetailerKey,
  keyword: string
): Promise<ProductResult> {
  switch (retailer) {
    case "cainz":  return scrapeCainz(keyword);
    case "komeri": return scrapeKomeri(keyword);
    case "kohnan": return scrapeKohnan(keyword);
    case "dcm":    return scrapeDCM(keyword);
  }
}
