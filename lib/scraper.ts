/**
 * EC site product scraper
 *
 * Fetches first-hit product (name, price, URL) from each retailer's search page.
 * Results are cached at the call-site via unstable_cache (24h TTL).
 *
 * Retailer notes:
 *  - Cainz:  Next.js SPA; parse RSC stream for `searchResult.products[]`.
 *  - DCM:    Shift-JIS (Windows-31J) HTML with `GA4_itemName_*` / `GA4_price_*` hidden inputs.
 *  - Komeri / Kohnan: AspDotNetStorefront. Results list is client-rendered by default,
 *    but `?search=x` triggers server-side rendering of the goods list with product URLs,
 *    names, and prices embedded in `data-*` attributes.
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

/**
 * Strip Japanese measurement-suffix words from a keyword before sending to a
 * retailer's full-text search. Product names use "6Ｆ" not "6フィート", so
 * leaving "フィート" in the query yields zero retailer hits. Local scoring
 * still sees the original keyword via `normalizeForMatch`.
 */
function searchQuery(keyword: string): string {
  return keyword
    .replace(/フィート|フート|インチ|ミリメートル|センチメートル|約/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

/**
 * Normalize for loose keyword matching:
 *  - NFKC: full-width → half-width (`１×４` → `1x4`, `Ｆ` → `F`) — critical because
 *    Japanese product catalogues mix width styles.
 *  - Measurement suffixes collapse to short canonical forms.
 */
function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[×✕]/g, "x")
    .replace(/フィート|フート|feet/g, "f")
    .replace(/インチ|inch/g, "in")
    .replace(/ミリメートル|ミリ/g, "mm")
    .replace(/センチメートル|センチ/g, "cm");
}

function tokenize(s: string): string[] {
  return normalizeForMatch(s)
    .replace(/[、,。.\-_/()（）【】\s　]+/g, " ")
    .split(" ")
    .filter((t) => t.length >= 1);
}

/**
 * Score a candidate product name against a keyword. Higher is better.
 *  - Require at least half the keyword tokens to hit — strict "all tokens" is too
 *    harsh when retailers drop metadata like "SPF" from product names.
 *  - Dimension tokens (`1x4`, `900mm`, `6f`) weigh extra — they're the strongest
 *    sizing signal and should outrank filler-word matches.
 *  - Longer candidates get a small penalty so a "bundle of 50" loses to a single
 *    board with the same match count.
 */
function scoreMatch(candidate: string, keyword: string): number {
  const cand = tokenize(candidate).join(" ");
  const kwTokens = tokenize(keyword);
  if (kwTokens.length === 0) return 0;

  let matched = 0;
  let score = 0;
  for (const t of kwTokens) {
    if (!cand.includes(t)) continue;
    matched++;
    if (/^\d+x\d+$/.test(t)) score += 3;
    else if (/^\d+(mm|cm|m|f|in)$/.test(t)) score += 2;
    else score += 1;
  }
  if (matched < Math.ceil(kwTokens.length / 2)) return 0;
  score += (matched / kwTokens.length) * 2;

  const candLen = tokenize(candidate).length;
  const lengthPenalty = Math.max(0, candLen - kwTokens.length * 3) * 0.1;
  return score - lengthPenalty;
}

/** Pick the highest-scoring candidate; tie-break via `tieBreak` (e.g. DCM index). */
function bestMatch<T>(
  items: T[],
  getName: (it: T) => string | undefined,
  keyword: string,
  tieBreak: (a: T, b: T) => number = () => 0
): T | undefined {
  let best: { item: T; score: number } | undefined;
  for (const it of items) {
    const name = getName(it);
    if (!name) continue;
    const s = scoreMatch(name, keyword);
    if (s <= 0) continue;
    if (!best || s > best.score || (s === best.score && tieBreak(it, best.item) < 0)) {
      best = { item: it, score: s };
    }
  }
  return best?.item;
}

// ─── Cainz ────────────────────────────────────────────────────────────────────
// Fetch the search page with `RSC: 1` so the response is the React Server
// Components stream. Product data lives in a `searchResult.products[]` array
// embedded as JSON within the stream.
export async function scrapeCainz(keyword: string): Promise<ProductResult> {
  const searchURL = `https://www.cainz.com/search?q=${encodeQuery(searchQuery(keyword))}`;
  try {
    const body = await fetchText(searchURL, { RSC: "1" });
    const marker = '"searchResult":{"products":[';
    const idx = body.indexOf(marker);
    if (idx < 0) return { name: keyword, price: null, url: searchURL, retailer: "カインズ" };

    const products = extractProductArray(body.slice(idx + marker.length));
    const hit = bestMatch(products, (p) => p.name, keyword);
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

// ─── Komeri / コーナン category classification ────────────────────────────────
// Both sites are Vue SPAs whose product lists are client-rendered, so plain HTML
// fetches return no product data. The SSR payload does, however, honor a
// `category=...` filter — narrowing the landing page to the correct aisle
// (e.g. DIY木材 instead of "all 860 results including 452 nails").
//
// We classify the keyword heuristically and append the matching category code.
// Categories are intentionally broad so the filter rarely produces zero hits.
type PartCategory = "lumber" | "screw" | "bolt" | "bracket" | "plywood" | null;

function classifyKeyword(keyword: string): PartCategory {
  const k = keyword.toLowerCase();
  if (/(合板|ベニヤ|コンパネ|\bmdf\b|\bosb\b|plywood)/i.test(keyword)) return "plywood";
  if (/(\d+\s*[x×]\s*\d+|spf|ツーバイ|杉|檜|桧|松|パイン|角材|垂木|集成材|木材|無垢|lumber|board|timber)/i.test(k)) return "lumber";
  if (/(l金具|l字金具|補強金具|補強金物|ステー|ブラケット|プレート金具|コーナー金具|金具|金物|bracket|plate)/i.test(k)) return "bracket";
  if (/(ボルト|bolt|ナット|nut|ワッシャ|washer|寸切)/i.test(k)) return "bolt";
  if (/(コーススレッド|ビス|ネジ|ねじ|釘|くぎ|スクリュー|screw|nail|タッピング)/i.test(k)) return "screw";
  return null;
}

/** Kohnan category codes from https://www.kohnan-eshop.com facet markup. */
const KOHNAN_CATEGORY: Record<NonNullable<PartCategory>, string> = {
  lumber:  "h10", // DIY木材
  plywood: "h11", // 棚板・集成材
  screw:   "h25", // ネジ・釘
  bolt:    "h25", // ネジ・釘 (bolts live here too)
  bracket: "h26", // 補強金物
};

/** Komeri category codes from its header search dropdown. */
const KOMERI_CATEGORY: Record<NonNullable<PartCategory>, string> = {
  lumber:  "2332", // 製材
  plywood: "2331", // 合板
  screw:   "2203", // 釘・ビス
  bolt:    "2204", // ネジボルト
  bracket: "2207", // 補強金具
};

// ─── Komeri ───────────────────────────────────────────────────────────────────
// With `search=x` the search results are server-rendered. Each product exposes
// `<div class="favIcon" data-goodsno="{id}" data-price=" {yen}">` plus an anchor
// `<a href="/shop/g/g{id}/" title="{name}">`.
export async function scrapeKomeri(keyword: string): Promise<ProductResult> {
  const cat = classifyKeyword(keyword);
  const categoryParam = cat ? `&category=${KOMERI_CATEGORY[cat]}` : "";
  const searchURL = `https://www.komeri.com/shop/goods/search.aspx?search=x&keyword=${encodeQuery(searchQuery(keyword))}${categoryParam}`;
  try {
    const html = await fetchText(searchURL);
    const $ = cheerio.load(html);

    type Item = { id: string; name: string; price: number | null };
    const items: Item[] = [];
    $("div.favIcon[data-goodsno]").each((_, el) => {
      const id = $(el).attr("data-goodsno")?.trim();
      if (!id) return;
      const priceStr = $(el).attr("data-price")?.trim() ?? "";
      const price = priceStr ? parseInt(priceStr.replace(/,/g, ""), 10) : NaN;
      const anchor = $(`a[href="/shop/g/g${id}/"]`).first();
      const name = anchor.attr("title")?.trim();
      if (!name) return;
      items.push({ id, name, price: Number.isFinite(price) ? price : null });
    });

    const hit = bestMatch(items, (it) => it.name, keyword);
    if (!hit) return { name: keyword, price: null, url: searchURL, retailer: "コメリ" };

    return {
      name: hit.name,
      price: hit.price,
      url: `https://www.komeri.com/shop/g/g${hit.id}/`,
      retailer: "コメリ",
    };
  } catch {
    return { name: keyword, price: null, url: searchURL, retailer: "コメリ" };
  }
}

// ─── コーナン ──────────────────────────────────────────────────────────────────
// Same AspDotNetStorefront platform. `search=x` triggers SSR. Products live in
// `<div class="block-thumbnail-t--item-body">` with a name anchor
// (`.js-enhanced-ecommerce-goods-name`) and a sibling price div
// (`.block-thumbnail-t--price` → `￥{yen}` text).
export async function scrapeKohnan(keyword: string): Promise<ProductResult> {
  const cat = classifyKeyword(keyword);
  const categoryParam = cat ? `&category=${KOHNAN_CATEGORY[cat]}` : "";
  const searchURL = `https://www.kohnan-eshop.com/shop/goods/search.aspx?search=x&keyword=${encodeQuery(searchQuery(keyword))}${categoryParam}`;
  try {
    const html = await fetchText(searchURL);
    const $ = cheerio.load(html);

    type Item = { id: string; name: string; price: number | null };
    const items: Item[] = [];
    $("div.block-thumbnail-t--item-body").each((_, el) => {
      const anchor = $(el).find("a.js-enhanced-ecommerce-goods-name").first();
      const href = anchor.attr("href") ?? "";
      const id = href.match(/\/shop\/g\/g(\w+)\//)?.[1];
      const name = anchor.attr("title")?.trim();
      if (!id || !name) return;
      const priceText = $(el).find(".block-thumbnail-t--price").first().text();
      const digits = priceText.replace(/[^\d]/g, "");
      const price = digits ? parseInt(digits, 10) : NaN;
      items.push({ id, name, price: Number.isFinite(price) ? price : null });
    });

    const hit = bestMatch(items, (it) => it.name, keyword);
    if (!hit) return { name: keyword, price: null, url: searchURL, retailer: "コーナン" };

    return {
      name: hit.name,
      price: hit.price,
      url: `https://www.kohnan-eshop.com/shop/g/g${hit.id}/`,
      retailer: "コーナン",
    };
  } catch {
    return { name: keyword, price: null, url: searchURL, retailer: "コーナン" };
  }
}

// ─── DCM ──────────────────────────────────────────────────────────────────────
// Shift-JIS HTML. Each product is a `<div class="item-box">` whose hidden inputs
// expose GA4_itemName_{id}, GA4_price_{id}, GA4_itemId_{id}, GA4_index_{id}.
export async function scrapeDCM(keyword: string): Promise<ProductResult> {
  const searchURL = `https://www.dcm-ekurashi.com/search/?q=${encodeQuerySJIS(searchQuery(keyword))}`;
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
    // Prefer the best scoring match; if two candidates tie, take the one DCM
    // ranks higher (lower `index`).
    const hit = bestMatch(items, (it) => it.name, keyword, (a, b) => a.index - b.index);
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
