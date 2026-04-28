/**
 * apply-usecase-translations.ts
 * scripts/i18n-source/usecase-name-translations.json を読み、
 *   useCases/{id} に nameEn / descriptionEn / imageAltEn を merge 書き込みする。
 *   さらに examples.useCaseNameEn を useCase.nameEn から伝播する。
 *
 * Anthropic API は使わない (人手で訳した nameEn テーブルを流し込むだけ)。
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *   npx ts-node --project tsconfig.seed.json scripts/apply-usecase-translations.ts [--dry-run] [--no-propagate]
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

interface TranslationFile {
  _note?: string;
  translations: Record<string, string>;
}

interface CliArgs {
  dryRun: boolean;
  propagate: boolean;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run"),
    propagate: !argv.includes("--no-propagate"),
  };
}

function initFirebase() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) { console.error("GOOGLE_APPLICATION_CREDENTIALS が未設定です"); process.exit(1); }
  initializeApp({ credential: cert(require(path.resolve(keyPath)) as ServiceAccount) });
  return getFirestore();
}

function descriptionEnFor(nameEn: string): string {
  return `DIY blueprint for ${nameEn}.`;
}

function imageAltEnFor(nameEn: string): string {
  return `DIY blueprint for ${nameEn}`;
}

async function applyUseCaseTranslations(
  db: FirebaseFirestore.Firestore,
  table: Record<string, string>,
  dryRun: boolean,
) {
  const ids = Object.keys(table);
  console.log(`\n▶ applying ${ids.length} useCase translations${dryRun ? " [dry-run]" : ""} …`);

  let written = 0;
  let unchanged = 0;
  let missing = 0;

  for (const id of ids) {
    const nameEn = table[id];
    const ref = db.collection("useCases").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      console.warn(`  ! useCase ${id} が Firestore に存在しません — skip`);
      missing++;
      continue;
    }
    const data = snap.data() ?? {};
    const descEn = descriptionEnFor(nameEn);
    const altEn = imageAltEnFor(nameEn);

    if (
      data.nameEn === nameEn &&
      data.descriptionEn === descEn &&
      data.imageAltEn === altEn
    ) {
      unchanged++;
      continue;
    }

    if (!dryRun) {
      await ref.set(
        { nameEn, descriptionEn: descEn, imageAltEn: altEn },
        { merge: true },
      );
    }
    written++;
    if (written <= 5 || written % 50 === 0) {
      console.log(`  ${dryRun ? "[dry-run] " : ""}${id} → "${nameEn}"`);
    }
  }

  console.log(`  written=${written}, unchanged=${unchanged}, missing=${missing}`);
}

/** useCase.nameEn を examples.useCaseNameEn に伝播 */
async function propagateToExamples(
  db: FirebaseFirestore.Firestore,
  dryRun: boolean,
) {
  console.log(`\n▶ propagating useCase.nameEn → examples.useCaseNameEn${dryRun ? " [dry-run]" : ""} …`);

  const ucSnap = await db.collection("useCases").get();
  const map: Record<string, string> = {};
  for (const d of ucSnap.docs) {
    const data = d.data();
    if (typeof data.nameEn === "string" && data.nameEn.length > 0) {
      map[d.id] = data.nameEn;
    }
  }
  console.log(`  useCase.nameEn を持つ doc: ${Object.keys(map).length}`);
  if (Object.keys(map).length === 0) return;

  const exSnap = await db.collection("examples").get();
  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const d of exSnap.docs) {
    const data = d.data();
    const useCaseID = data.useCaseID as string | undefined;
    if (!useCaseID) { skipped++; continue; }
    const nameEn = map[useCaseID];
    if (!nameEn) { missing++; continue; }
    if (data.useCaseNameEn === nameEn) { skipped++; continue; }
    if (!dryRun) {
      await d.ref.set({ useCaseNameEn: nameEn }, { merge: true });
    }
    updated++;
  }
  console.log(`  ${dryRun ? "[dry-run] " : ""}examples updated=${updated}, skipped=${skipped}, missing=${missing}`);
}

async function main() {
  const args = parseArgs();
  const db = initFirebase();

  const tablePath = path.join(__dirname, "i18n-source", "usecase-name-translations.json");
  if (!fs.existsSync(tablePath)) {
    console.error(`翻訳ファイルが見つかりません: ${tablePath}`);
    process.exit(1);
  }
  const file = JSON.parse(fs.readFileSync(tablePath, "utf8")) as TranslationFile;
  const table = file.translations ?? {};
  if (Object.keys(table).length === 0) {
    console.error("translations が空です");
    process.exit(1);
  }

  await applyUseCaseTranslations(db, table, args.dryRun);
  if (args.propagate) {
    await propagateToExamples(db, args.dryRun);
  }

  console.log("\n✅ done");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
