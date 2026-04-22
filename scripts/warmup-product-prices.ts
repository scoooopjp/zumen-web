/**
 * warmup-product-prices.ts
 *
 * 全 223 blueprint の parts から検索キーワードを抽出し、4 店舗 × 全キーワードを
 * 事前にスクレイプして Firestore `productPrices` キャッシュへ流し込む。
 * lazy cache だと初回アクセスが遅いので、週1 で cron 実行する想定。
 *
 * - docId 規則は app/api/product-search/route.ts と同一
 * - fresh (< 7日) なエントリはスキップ
 * - リトライ無し・失敗はログして次へ (retailer 側のレート制限回避)
 *
 * Run:
 *   export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
 *   npx ts-node --project tsconfig.seed.json scripts/warmup-product-prices.ts
 *
 * Options:
 *   --dry-run           スクレイプせず、対象キーワード数だけ表示
 *   --force             fresh 判定を無視して全件再取得
 *   --retailer <name>   特定 retailer のみ (cainz|komeri|kohnan|dcm)
 *   --concurrency <n>   並列数 (default 3)
 */

import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";
import { scrapeProduct, type RetailerKey } from "../lib/scraper";

const svcPath = path.resolve(__dirname, "../serviceAccountKey.json");
if (!fs.existsSync(svcPath)) {
  console.error("serviceAccountKey.json not found:", svcPath);
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(svcPath) });
const db = admin.firestore();

const ALL_RETAILERS: RetailerKey[] = ["cainz", "komeri", "kohnan", "dcm"];
const FRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface Args {
  dryRun: boolean;
  force: boolean;
  retailer: RetailerKey | null;
  concurrency: number;
}

function parseArgs(): Args {
  const a = process.argv.slice(2);
  const arg = (flag: string) => {
    const i = a.indexOf(flag);
    return i >= 0 ? a[i + 1] : undefined;
  };
  const retailerArg = arg("--retailer");
  if (retailerArg && !ALL_RETAILERS.includes(retailerArg as RetailerKey)) {
    console.error(`invalid retailer: ${retailerArg}`);
    process.exit(1);
  }
  return {
    dryRun: a.includes("--dry-run"),
    force: a.includes("--force"),
    retailer: (retailerArg as RetailerKey | undefined) ?? null,
    concurrency: Number(arg("--concurrency") ?? "3"),
  };
}

/** iOS `keywordFromSpec` と同一ルール */
function keywordFromSpec(spec: string): string | null {
  if (spec.startsWith("19×89")) return "1x4 SPF";
  if (spec.startsWith("19×140")) return "1x6 SPF";
  if (spec.startsWith("19×184")) return "1x8 SPF";
  if (spec.startsWith("38×89")) return "2x4 SPF";
  return null;
}

/** app/api/product-search/route.ts の docIdFor と同一ロジック */
function docIdFor(retailer: RetailerKey, keyword: string): string {
  const safe = encodeURIComponent(keyword.trim()).replace(/%/g, "_");
  return `${retailer}__${safe}`;
}

async function collectKeywords(): Promise<string[]> {
  const snap = await db.collection("blueprints").get();
  const set = new Set<string>();
  for (const doc of snap.docs) {
    const data = doc.data();
    const parts = (data.parts ?? []) as Array<{ name: string; spec: string }>;
    for (const p of parts) {
      const kw = keywordFromSpec(p.spec ?? "") ?? p.name;
      if (kw && kw.trim()) set.add(kw.trim());
    }
  }
  return [...set].sort();
}

async function isFresh(retailer: RetailerKey, keyword: string): Promise<boolean> {
  const docRef = db.collection("productPrices").doc(docIdFor(retailer, keyword));
  const snap = await docRef.get();
  if (!snap.exists) return false;
  const data = snap.data()!;
  const fetchedAt = data.fetchedAt?.toDate?.() ?? new Date(0);
  return Date.now() - fetchedAt.getTime() < FRESH_TTL_MS;
}

async function warmOne(
  retailer: RetailerKey,
  keyword: string,
): Promise<"skipped" | "written" | "empty" | "error"> {
  try {
    const result = await scrapeProduct(retailer, keyword);
    if (!result || !result.name) return "empty";
    await db
      .collection("productPrices")
      .doc(docIdFor(retailer, keyword))
      .set({
        retailer: result.retailer,
        keyword,
        name: result.name,
        price: result.price ?? null,
        url: result.url,
        fetchedAt: new Date(),
      });
    return "written";
  } catch (e) {
    console.warn(`  ✗ ${retailer} "${keyword}": ${(e as Error).message}`);
    return "error";
  }
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, i: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const args = parseArgs();
  const retailers = args.retailer ? [args.retailer] : ALL_RETAILERS;

  console.log("== product-prices warmup ==");
  console.log(`retailers: ${retailers.join(", ")}`);
  console.log(`concurrency: ${args.concurrency}`);
  console.log(`dryRun: ${args.dryRun}, force: ${args.force}\n`);

  const keywords = await collectKeywords();
  console.log(`collected ${keywords.length} unique keywords from blueprints\n`);

  const jobs: Array<{ retailer: RetailerKey; keyword: string }> = [];
  for (const keyword of keywords) {
    for (const retailer of retailers) {
      jobs.push({ retailer, keyword });
    }
  }
  console.log(`${jobs.length} total (retailer × keyword) pairs\n`);

  if (args.dryRun) {
    keywords.forEach((k) => console.log(`  - ${k}`));
    return;
  }

  const counts = { written: 0, skipped: 0, empty: 0, error: 0 };
  let done = 0;

  await runPool(jobs, args.concurrency, async ({ retailer, keyword }) => {
    done += 1;
    const prefix = `[${String(done).padStart(4)}/${jobs.length}]`;
    if (!args.force && (await isFresh(retailer, keyword))) {
      counts.skipped += 1;
      console.log(`${prefix} SKIP ${retailer} "${keyword}" (fresh)`);
      return;
    }
    const outcome = await warmOne(retailer, keyword);
    counts[outcome] += 1;
    console.log(`${prefix} ${outcome.toUpperCase().padEnd(7)} ${retailer} "${keyword}"`);
  });

  console.log("\n== done ==");
  console.log(
    `written: ${counts.written}, skipped: ${counts.skipped}, empty: ${counts.empty}, error: ${counts.error}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
