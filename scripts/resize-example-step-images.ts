/**
 * resize-example-step-images.ts
 * 既存 examples/{id}/steps/{stepID}.jpg を 960px JPEG にリサイズして
 * examples/{id}/steps/{stepID}_thumb.jpg へアップロードし、
 * Firestore の examples/{id}.steps[*].thumbnailURL を更新する。
 *
 * iOS の StorageService.uploadJPEG(maxDimension:960, quality:0.76) と同条件。
 *
 * Run:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json npx tsx scripts/resize-example-step-images.ts
 *
 * Options:
 *   --dry-run       書き込まない (進捗だけログ)
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

interface FSStep {
  id?: string;
  order?: number;
  text?: string;
  imageURL?: string | null;
  thumbnailURL?: string | null;
  illustrationType?: string | null;
  videoPath?: string | null;
}

interface ExampleJob {
  exampleId: string;
  steps: FSStep[];
}

/** image step か video step かに応じて元画像のパスを返す。動画なら _poster.jpg。 */
function sourcePathFor(exampleId: string, step: FSStep): string {
  if (!step.id) throw new Error("step.id is missing");
  if (step.videoPath) {
    return `examples/${exampleId}/steps/${step.id}_poster.jpg`;
  }
  return `examples/${exampleId}/steps/${step.id}.jpg`;
}

async function processStep(
  exampleId: string,
  step: FSStep,
): Promise<"ok" | "skip-missing" | "skip-no-image"> {
  if (!step.imageURL) return "skip-no-image";
  if (step.thumbnailURL) return "ok"; // 既に処理済みは ok 扱い
  const srcPath = sourcePathFor(exampleId, step);
  const thumbPath = `examples/${exampleId}/steps/${step.id}_thumb.jpg`;

  const srcFile = bucket.file(srcPath);
  const [exists] = await srcFile.exists();
  if (!exists) return "skip-missing";

  const [original] = await srcFile.download();
  const thumb = await sharp(original)
    .resize({ width: 960, height: 960, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 76, mozjpeg: true })
    .toBuffer();

  if (DRY) return "ok";

  await bucket.file(thumbPath).save(thumb, {
    contentType: "image/jpeg",
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  step.thumbnailURL = publicStorageURL(thumbPath);
  return "ok";
}

async function main() {
  console.log(`mode: ${DRY ? "DRY RUN" : "WRITE"} concurrency=${CONCURRENCY}`);
  const snap = await db.collection("examples").get();
  const jobs: ExampleJob[] = [];
  let totalImageSteps = 0;
  let totalAlreadyThumbed = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const steps = (data.steps ?? []) as FSStep[];
    if (!Array.isArray(steps) || steps.length === 0) continue;
    const imageSteps = steps.filter((s) => s.imageURL);
    if (imageSteps.length === 0) continue;
    totalImageSteps += imageSteps.length;
    totalAlreadyThumbed += imageSteps.filter((s) => s.thumbnailURL).length;
    const needsWork = imageSteps.some((s) => !s.thumbnailURL);
    if (!needsWork) continue;
    jobs.push({ exampleId: d.id, steps });
  }
  console.log(
    `examples with image steps: ${jobs.length} (target docs)\n` +
      `  total image steps: ${totalImageSteps}\n` +
      `  already thumbed:   ${totalAlreadyThumbed}\n` +
      `  remaining:         ${totalImageSteps - totalAlreadyThumbed}`,
  );

  let docOk = 0;
  let stepOk = 0;
  let missing = 0;
  let err = 0;
  let done = 0;

  const queue = jobs.slice();
  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const job = queue.shift();
      if (!job) return;
      try {
        let mutated = false;
        for (const step of job.steps) {
          const r = await processStep(job.exampleId, step);
          if (r === "ok" && step.thumbnailURL && step.imageURL) {
            stepOk++;
            mutated = true;
          } else if (r === "skip-missing") {
            missing++;
          }
        }
        if (mutated && !DRY) {
          await db
            .collection("examples")
            .doc(job.exampleId)
            .update({ steps: job.steps });
          docOk++;
        } else if (mutated && DRY) {
          docOk++;
        }
      } catch (e) {
        err++;
        console.error(
          `  [${job.exampleId}] error:`,
          e instanceof Error ? e.message : e,
        );
      }
      done++;
      if (done % 25 === 0) {
        console.log(
          `  progress ${done}/${jobs.length} docs  steps=${stepOk} missing=${missing} err=${err}`,
        );
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  console.log(`\n=== complete ===`);
  console.log(`  docs updated  = ${docOk}`);
  console.log(`  steps thumbed = ${stepOk}`);
  console.log(`  missing src   = ${missing}`);
  console.log(`  errors        = ${err}`);
  process.exit(err > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
