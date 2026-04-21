/**
 * seed-enriched-blueprints.ts
 * scripts/enriched/{useCaseID}.json の enriched steps を Firestore の
 * blueprints/{useCaseID} ドキュメントに反映する。
 *
 * ロールバック可能な設計:
 *  - 既存ドキュメントを scripts/backups/blueprints/{useCaseID}.{timestamp}.json に保存
 *  - 失敗時は `--restore <timestamp>` で元に戻せる
 *  - steps フィールドのみ更新し、parts/cutItems/dimensions/warnings/tools は変更しない
 *
 * Run (反映):
 *   export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
 *   npx ts-node --project tsconfig.seed.json scripts/seed-enriched-blueprints.ts
 *
 * Run (ドライラン):
 *   ... scripts/seed-enriched-blueprints.ts --dry-run
 *
 * Run (ロールバック):
 *   ... scripts/seed-enriched-blueprints.ts --restore 2026-04-21T12-00-00
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

interface EnrichedStep {
  order: number;
  title: string;
  description: string;
  illustrationType: string;
  tips: string[];
  pitfalls: string[];
  estimatedMinutes: number;
}

interface EnrichedFile {
  useCaseID: string;
  name: string;
  steps: EnrichedStep[];
  validationErrors: string[];
}

const ENRICHED_DIR = path.join(__dirname, "enriched");
const BACKUP_DIR = path.join(__dirname, "backups", "blueprints");

function initFirebase() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS が未設定です");
    process.exit(1);
  }
  initializeApp({ credential: cert(require(path.resolve(keyPath)) as ServiceAccount) });
  return getFirestore();
}

function tsSlug(): string {
  return new Date().toISOString().replace(/:/g, "-").replace(/\..+/, "");
}

function loadEnriched(): EnrichedFile[] {
  if (!fs.existsSync(ENRICHED_DIR)) {
    console.error(`enriched ディレクトリが見つかりません: ${ENRICHED_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(ENRICHED_DIR).filter((f) => f.endsWith(".json"));
  if (files.length === 0) {
    console.error(`enriched JSON が見つかりません`);
    process.exit(1);
  }
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(ENRICHED_DIR, f), "utf-8");
    return JSON.parse(raw) as EnrichedFile;
  });
}

async function applyEnriched(db: FirebaseFirestore.Firestore, dryRun: boolean) {
  const enriched = loadEnriched();
  console.log(`Loaded ${enriched.length} enriched files`);

  const backupTs = tsSlug();
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  let applied = 0;
  let skipped = 0;
  for (const e of enriched) {
    if (e.validationErrors && e.validationErrors.length > 0) {
      console.warn(`⚠ ${e.useCaseID}: validationErrors あり、スキップ`);
      for (const err of e.validationErrors) console.warn(`  - ${err}`);
      skipped++;
      continue;
    }

    const ref = db.collection("blueprints").doc(e.useCaseID);
    const snap = await ref.get();
    if (!snap.exists) {
      console.warn(`⚠ ${e.useCaseID}: blueprint が存在しない、スキップ`);
      skipped++;
      continue;
    }

    const current = snap.data()!;
    const backupPath = path.join(BACKUP_DIR, `${e.useCaseID}.${backupTs}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(current, null, 2));

    // Firestore 用 step 形式 (FSBlueprintStep と一致)
    const fsSteps = e.steps.map((s) => ({
      order: s.order,
      title: s.title,
      description: s.description,
      illustrationType: s.illustrationType,
      tips: s.tips,
      pitfalls: s.pitfalls,
      estimatedMinutes: s.estimatedMinutes,
    }));

    if (dryRun) {
      console.log(`[dry-run] ${e.useCaseID}: ${current.steps?.length ?? 0} steps → ${fsSteps.length} steps`);
      console.log(`           backup: ${backupPath}`);
    } else {
      await ref.update({ steps: fsSteps });
      console.log(`✓ ${e.useCaseID}: ${current.steps?.length ?? 0} → ${fsSteps.length} steps (backup: ${backupTs})`);
    }
    applied++;
  }

  console.log(`\ndone — applied: ${applied}, skipped: ${skipped}`);
  if (!dryRun) {
    console.log(`rollback: npx ts-node scripts/seed-enriched-blueprints.ts --restore ${backupTs}`);
  }
}

async function restore(db: FirebaseFirestore.Firestore, timestamp: string) {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`バックアップディレクトリなし: ${BACKUP_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith(`.${timestamp}.json`));
  if (files.length === 0) {
    console.error(`timestamp ${timestamp} のバックアップが見つかりません`);
    process.exit(1);
  }

  console.log(`Restoring ${files.length} documents from backup ${timestamp}`);
  for (const f of files) {
    const useCaseID = f.replace(`.${timestamp}.json`, "");
    const raw = fs.readFileSync(path.join(BACKUP_DIR, f), "utf-8");
    const data = JSON.parse(raw);
    await db.collection("blueprints").doc(useCaseID).set(data);
    console.log(`✓ ${useCaseID} 復元`);
  }
  console.log(`\ndone — restored ${files.length} documents`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const restoreIdx = args.indexOf("--restore");
  const db = initFirebase();

  if (restoreIdx >= 0) {
    const ts = args[restoreIdx + 1];
    if (!ts) {
      console.error("--restore の後に timestamp が必要です");
      process.exit(1);
    }
    await restore(db, ts);
  } else {
    await applyEnriched(db, dryRun);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
