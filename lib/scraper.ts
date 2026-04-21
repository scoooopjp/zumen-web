/**
 * EC site product scraper
 *
 * Fetches first-hit product (name, price, URL) from each retailer's search page.
 * Results are cached at the call-site via unstable_cache (24h TTL).
 *
 * Retailer notes:
 *  - Cainz:  Next.js SPA; parse RSC stream for `searchResult.products[]`.
 *  - DCM:    Shift-JIS (Windows-31J) HTML with `GA4_itemName_*` / `GA4_price_*` hidden inputs.
 *  - Komeri: AspDotNetStorefront SPA; product list is client-rendered — we can only
 *            surface a validated search URL (price null).
 *  - Kohnan: same platform as Komeri — search URL only.
 */

import * as cheerio from "cheerio";
import iconv from "iconv-lite";

export interface ProductResult {
  name: string;
  price: number | null; // JPY tax-included; null when unknown
  url: string;
  retailer: string;
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const TIMEOUT_MS = 8000;

async function fetchBytes(url: string, headers: Record<string, string> = {}): Promise<ArrayBuffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ja,en;q=0.9", ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.arrayBuffer();
}

async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const buf = await fetchBytes(url, { Accept: "text/html,application/xhtml+xml", ...headers });
  return new TextDecoder("utf-8").decode(buf);
}

function encodeQuery(keyword: string): string {
  return encodeURIComponent(keyword);
}

/** Percent-encode `keyword` as SHIFT_JIS bytes (required by DCM). */
function encodeQuerySJIS(keyword: string): string {
  const bytes = iconv.encode(keyword, "shift_jis");
  let out = "";
  for (const b of bytes) {
    if (
      (b >= 0x30 && b <= 0x39) || // 0-9
      (b >= 0x41 && b <= 0x5a) || // A-Z
      (b >= 0x61 && b <= 0x7a) || // a-z
      b === 0x2d || b === 0x2e || b === 0x5f || b === 0x7e // -._~
    ) {
      out += String.fromCharCode(b);
    } else {
      out += "%" + b.toString(16).toUpperCase().padStart(2, "0");
    }
  }
  return out;
}

/** Lowercase + strip non-alphanumeric/CJK for loose keyword matching. */
function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[×x]/g, "x")
    .replace(/[、,。.\-_/()（）【】\s　]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 1);
}

/** True if every token in `keyword` appears in `candidate`. */
function matchesKeyword(candidate: string, keyword: string): boolean {
  const cand = tokenize(candidate).join(" ");
  return tokenize(keyword).every((t) => cand.includes(t));
}

// ─── Cainz ────────────────────────────────────────────────────────────────────
// Fetch the search page with `RSC: 1` so the response is the React Server
// Components stream. Product data lives in a `searchResult.products[]` array
// embedded as JSON within the stream.
export async function scrapeCainz(keyword: string): Promise<ProductResult> {
  const searchURL = `https://www.cainz.com/search?q=${encodeQuery(keyword)}`;
  try {
    const body = await fetchText(searchURL, { RSC: "1" });
    const marker = '"searchResult":{"products":[';
    const idx = body.indexOf(marker);
    if (idx < 0) return { name: keyword, price: null, url: searchURL, retailer: "カインズ" };

    const products = extractProductArray(body.slice(idx + marker.length));
    const hit = products.find((p) => p.name && matchesKeyword(p.name, keyword));
    if (!hit?.name) return { name: keyword, price: null, url: searchURL, retailer: "カインズ" };

    return {
      name: hit.name,
      price: typeof hit.price === "number" ? hit.price : null,
      url: hit.productId
        ? `https://www.cainz.com/g/${hit.productId}.html`
        : searchURL,
      retailer: "カインズ",
    };
  } catch {
    return { name: keyword, price: null, url: searchURL, retailer: "カインズ" };
  }
}

/** Extract a list of top-level JSON product objects from a string fragment.
 *  Stops at the end of the containing array (i.e. a `]` at depth 0). */
function extractProductArray(
  fragment: string
): Array<{ productId?: string; name?: string; price?: number }> {
  const results: Array<{ productId?: string; name?: string; price?: number }> = [];
  let depth = 0;
  let inStr = false;
  let esc = false;
  let objStart = -1;
  for (let i = 0; i < fragment.length; i++) {
    const ch = fragment[i];
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{") {
      if (depth === 0) objStart = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && objStart >= 0) {
        const src = fragment.slice(objStart, i + 1);
        const productId = src.match(/"productId":"([^"]+)"/)?.[1];
        const name = src.match(/"name":"([^"\\]*(?:\\.[^"\\]*)*)"/)?.[1];
        const price = src.match(/"price":(\d+)/)?.[1];
        results.push({
          productId,
          name: name ? JSON.parse(`"${name}"`) : undefined,
          price: price ? parseInt(price, 10) : undefined,
        });
        objStart = -1;
      }
    } else if (ch === "]" && depth === 0) {
      break;
    }
  }
  return results;
}

// ─── Komeri ───────────────────────────────────────────────────────────────────
// Search page is client-rendered. We surface the search URL and let the user
// click through. Still validate that the page loads (HTTP 200).
export async function scrapeKomeri(keyword: string): Promise<ProductResult> {
  const searchURL = `https://www.komeri.com/shop/goods/search.aspx?keyword=${encodeQuery(keyword)}`;
  try {
    await fetchText(searchURL);
    return { name: keyword, price: null, url: searchURL, retailer: "コメリ" };
  } catch {
    return { name: keyword, price: null, url: searchURL, retailer: "コメリ" };
  }
}

// ─── コーナン ──────────────────────────────────────────────────────────────────
// Same AspDotNetStorefront SPA pattern as Komeri.
export async function scrapeKohnan(keyword: string): Promise<ProductResult> {
  const searchURL = `https://www.kohnan-eshop.com/shop/goods/search.aspx?keyword=${encodeQuery(keyword)}`;
  try {
    await fetchText(searchURL);
    return { name: keyword, price: null, url: searchURL, retailer: "コーナン" };
  } catch {
    return { name: keyword, price: null, url: searchURL, retailer: "コーナン" };
  }
}

// ─── DCM ──────────────────────────────────────────────────────────────────────
// Shift-JIS HTML. Each product is a `<div class="item-box">` whose hidden inputs
// expose GA4_itemName_{id}, GA4_price_{id}, GA4_itemId_{id}, GA4_index_{id}.
export async function scrapeDCM(keyword: string): Promise<ProductResult> {
  const searchURL = `https://www.dcm-ekurashi.com/search/?q=${encodeQuerySJIS(keyword)}`;
  try {
    const buf = await fetchBytes(searchURL, { Accept: "text/html" });
    const html = iconv.decode(Buffer.from(buf), "shift_jis");
    const $ = cheerio.load(html);

    // Collect all items, sorted by their declared index (ascending = best match).
    type Item = { id: string; name: string; price: number | null; index: number };
    const items: Item[] = [];
    $("input[id^='GA4_itemName_']").each((_, el) => {
      const name = $(el).attr("value")?.trim();
      const id = ($(el).attr("id") ?? "").replace("GA4_itemName_", "");
      if (!name || !id) return;
      const priceStr = $(`input#GA4_price_${id}`).attr("value") ?? "";
      const idxStr = $(`input#GA4_index_${id}`).attr("value") ?? "999";
      const price = priceStr ? parseInt(priceStr.replace(/,/g, ""), 10) : NaN;
      items.push({
        id,
        name,
        price: Number.isFinite(price) ? price : null,
        index: parseInt(idxStr, 10) || 999,
      });
    });
    items.sort((a, b) => a.index - b.index);

    // Only return a priced hit when the keyword actually matches the product
    // name — otherwise fall through to the plain search URL.
    const hit = items.find((it) => matchesKeyword(it.name, keyword));
    if (!hit) return { name: keyword, price: null, url: searchURL, retailer: "DCM" };

    return {
      name: hit.name,
      price: hit.price,
      url: `https://www.dcm-ekurashi.com/goods/${hit.id}`,
      retailer: "DCM",
    };
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
