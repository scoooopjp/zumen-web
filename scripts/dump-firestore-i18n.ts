/**
 * dump-firestore-i18n.ts
 * useCases / blueprints を JSON にダンプして scripts/i18n-source/ に書き出す。
 * Claude API キーが無い状況で人手 (= AI) 翻訳に渡すための前段。
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *   npx ts-node --project tsconfig.seed.json scripts/dump-firestore-i18n.ts
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

function initFirebase() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) { console.error("GOOGLE_APPLICATION_CREDENTIALS が未設定です"); process.exit(1); }
  initializeApp({ credential: cert(require(path.resolve(keyPath)) as ServiceAccount) });
  return getFirestore();
}

async function main() {
  const db = initFirebase();
  const outDir = path.join(__dirname, "i18n-source");
  fs.mkdirSync(outDir, { recursive: true });

  // useCases
  const ucSnap = await db.collection("useCases").get();
  const ucList = ucSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  fs.writeFileSync(path.join(outDir, "useCases.json"), JSON.stringify(ucList, null, 2));
  console.log(`useCases: ${ucList.length} docs → useCases.json`);

  // blueprints (翻訳対象フィールドのみ)
  const bpSnap = await db.collection("blueprints").get();
  const bpList = bpSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name,
      summary: data.summary,
      warnings: data.warnings ?? [],
      tools: (data.tools ?? []).map((t: any) => ({ id: t.id, name: t.name, note: t.note ?? null })),
      parts: (data.parts ?? []).map((p: any) => ({
        id: p.id, name: p.name, spec: p.spec, note: p.note ?? null,
      })),
      cutItems: (data.cutItems ?? []).map((c: any) => ({ id: c.id, partName: c.partName })),
      steps: (data.steps ?? []).map((s: any) => ({
        id: s.id, order: s.order,
        title: s.title, description: s.description,
        tips: s.tips ?? [], pitfalls: s.pitfalls ?? [],
      })),
      // 既存の *En を確認用に並記
      hasNameEn: typeof data.nameEn === "string" && data.nameEn.length > 0,
    };
  });
  fs.writeFileSync(path.join(outDir, "blueprints.json"), JSON.stringify(bpList, null, 2));
  console.log(`blueprints: ${bpList.length} docs → blueprints.json`);

  // 統計サマリ
  let totalSteps = 0, totalParts = 0, totalCuts = 0, totalTools = 0, totalWarnings = 0;
  for (const bp of bpList) {
    totalSteps += bp.steps.length;
    totalParts += bp.parts.length;
    totalCuts += bp.cutItems.length;
    totalTools += bp.tools.length;
    totalWarnings += bp.warnings.length;
  }
  console.log(`  totals: steps=${totalSteps} parts=${totalParts} cutItems=${totalCuts} tools=${totalTools} warnings=${totalWarnings}`);
  console.log(`output dir: ${outDir}`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
