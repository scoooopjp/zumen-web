/**
 * resize-example-images.ts
 * 既存 examples/{id}/hero.jpg を 960px JPEG にリサイズして
 * examples/{id}/hero_thumb.jpg へアップロードし、
 * Firestore の examples/{id}.thumbnailURL を更新する。
 *
 * iOS の StorageService.uploadJPEG(maxDimension:960, quality:0.76) と同条件。
 *
 * Run:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npx tsx scripts/resize-example-images.ts
 *
 * Options:
 *   --dry-run     書き込まない (進捗だけログ)
 *   --concurrency=N  並列度 (default 8)
 */
import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as path from "path";
import sharp from "sharp";

const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const concurrencyArg = process.argv.find((a) => a.startsWith("--concurrency="));
const CONCURRENCY = concurrencyArg ? Math.max(1, Number(concurrencyArg.split("=")[1])) : 8;

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS is not set");
  process.exit(1);
}
initializeApp({
  credential: cert(require(path.resolve(keyPath)) as ServiceAccount),
  storageBucket: "zumen-d0625.firebasestorage.app",
});
const db = getFirestore();
const bucket = getStorage().bucket();
const STORAGE_BUCKET = "zumen-d0625.firebasestorage.app";

function publicStorageURL(p: string): string {
  return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodeURIComponent(p)}?alt=media`;
}

interface Job {
  exampleId: string;
  heroURL: string;
}

async function processOne(job: Job): Promise<"ok" | "skip-missing" | "error"> {
  const heroPath = `examples/${job.exampleId}/hero.jpg`;
  const thumbPath = `examples/${job.exampleId}/hero_thumb.jpg`;

  // hero.jpg を直接 bucket から読む (downloadURL 経由は token 不一致でハマるため)
  const heroFile = bucket.file(heroPath);
  const [exists] = await heroFile.exists();
  if (!exists) return "skip-missing";

  const [original] = await heroFile.download();
  const thumb = await sharp(original)
    .resize({ width: 960, height: 960, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 76, mozjpeg: true })
    .toBuffer();

  if (DRY) return "ok";

  await bucket.file(thumbPath).save(thumb, {
    contentType: "image/jpeg",
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  await db.collection("examples").doc(job.exampleId).update({
    thumbnailURL: publicStorageURL(thumbPath),
  });
  return "ok";
}

async function main() {
  console.log(`mode: ${DRY ? "DRY RUN" : "WRITE"} concurrency=${CONCURRENCY}`);
  const snap = await db.collection("examples").get();
  const jobs: Job[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (data.thumbnailURL) continue; // 既に処理済み
    if (!data.imageURL) continue; // imageURL が無いものはスキップ
    jobs.push({ exampleId: d.id, heroURL: data.imageURL as string });
  }
  console.log(`target: ${jobs.length} / total ${snap.size}`);

  let ok = 0;
  let missing = 0;
  let err = 0;
  let done = 0;

  // 並列ワーカー
  const queue = jobs.slice();
  async function worker(workerId: number): Promise<void> {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) return;
      try {
        const r = await processOne(job);
        if (r === "ok") ok++;
        else if (r === "skip-missing") missing++;
      } catch (e) {
        err++;
        console.error(`  [${job.exampleId}] error:`, e instanceof Error ? e.message : e);
      }
      done++;
      if (done % 50 === 0) {
        console.log(`  progress ${done}/${jobs.length}  ok=${ok} missing=${missing} err=${err}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));

  console.log(`\n=== complete ===`);
  console.log(`  ok      = ${ok}`);
  console.log(`  missing = ${missing} (hero.jpg が Storage に存在しない)`);
  console.log(`  errors  = ${err}`);
  process.exit(err > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
