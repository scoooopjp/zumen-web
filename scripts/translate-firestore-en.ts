/**
 * translate-firestore-en.ts
 * useCases / blueprints / examples の日本語フィールドを Claude API で英訳し、
 * `*En` フィールドとして Firestore に書き戻す (#45)。
 *
 * - 元の日本語フィールドは触らない (additive only)
 * - UGC (Example.comment / ExampleStep.text) は翻訳しない
 * - example.useCaseNameEn は denormalize 用に useCase.nameEn から伝播
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
 *   export ANTHROPIC_API_KEY="sk-ant-..."
 *
 *   # dry-run: API 呼び出し + JSON 出力のみ、Firestore に書かない
 *   npx ts-node --project tsconfig.seed.json scripts/translate-firestore-en.ts --dry-run --useCases tana-1
 *
 *   # 単一 useCase + その blueprint を翻訳して書き込む
 *   npx ts-node --project tsconfig.seed.json scripts/translate-firestore-en.ts --useCases tana-1 --blueprints tana-1
 *
 *   # 全 useCase + 全 blueprint を翻訳 (本番)
 *   npx ts-node --project tsconfig.seed.json scripts/translate-firestore-en.ts --all
 *
 *   # 既に *En を持つドキュメントもスキップせず再翻訳する
 *   npx ts-node --project tsconfig.seed.json scripts/translate-firestore-en.ts --all --force
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

// ── Firebase init ───────────────────────────────────────────────
function initFirebase() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    console.error("GOOGLE_APPLICATION_CREDENTIALS が未設定です");
    process.exit(1);
  }
  initializeApp({ credential: cert(require(path.resolve(keyPath)) as ServiceAccount) });
  return getFirestore();
}

// ── Claude API ──────────────────────────────────────────────────
const MODEL = "claude-haiku-4-5-20251001"; // 翻訳タスクは Haiku で十分

interface ClaudeUsage { input_tokens: number; output_tokens: number; }
let totalInputTokens = 0;
let totalOutputTokens = 0;

async function callClaude<T>(prompt: string, tool: object, toolName: string): Promise<T> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が未設定です");

  const body = {
    model: MODEL,
    max_tokens: 8000,
    tools: [tool],
    tool_choice: { type: "tool", name: toolName },
    messages: [{ role: "user", content: prompt }],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API ${res.status}: ${errText}`);
  }

  const payload = (await res.json()) as {
    content: Array<{ type: string; name?: string; input?: T }>;
    stop_reason?: string;
    usage?: ClaudeUsage;
  };

  if (payload.usage) {
    totalInputTokens += payload.usage.input_tokens;
    totalOutputTokens += payload.usage.output_tokens;
  }

  const toolBlock = payload.content.find((c) => c.type === "tool_use" && c.name === toolName);
  if (!toolBlock?.input) {
    throw new Error(`Claude did not return ${toolName} tool_use. stop_reason=${payload.stop_reason}`);
  }
  return toolBlock.input;
}

// ── UseCase 翻訳 ────────────────────────────────────────────────

interface FSUseCase {
  id: string;
  name: string;
  description?: string;
  imageAlt?: string;
  category: string;
  difficulty: string;
  indoorOutdoor: string;
  nameEn?: string;
  descriptionEn?: string;
  imageAltEn?: string;
}

interface UseCaseTranslation {
  nameEn: string;
  descriptionEn: string;
  imageAltEn: string;
}

const USECASE_TOOL = {
  name: "submit_usecase_translation",
  description: "Submit the English translation of a UseCase document.",
  input_schema: {
    type: "object",
    required: ["nameEn", "descriptionEn", "imageAltEn"],
    properties: {
      nameEn: {
        type: "string",
        minLength: 2,
        maxLength: 80,
        description: "DIY プロダクト名の英訳。短く、Title Case 推奨。例: 'Easy Wall Shelf'",
      },
      descriptionEn: {
        type: "string",
        minLength: 10,
        maxLength: 200,
        description: "メタディスクリプション/説明文の英訳。",
      },
      imageAltEn: {
        type: "string",
        minLength: 5,
        maxLength: 120,
        description: "画像 alt の英訳。スクリーンリーダ向け、簡潔に。",
      },
    },
  },
} as const;

function buildUseCasePrompt(uc: FSUseCase): string {
  return `You are translating a Japanese DIY product card into natural, idiomatic English.
The text is shown to users browsing a DIY blueprint catalog.

Source (Japanese):
- name: ${uc.name}
- category: ${uc.category}
- description: ${uc.description ?? `${uc.name}のDIY設計図`}
- imageAlt: ${uc.imageAlt ?? `${uc.name}のDIY設計図`}

Constraints:
- Use Title Case for the name (e.g. "Easy Wall Shelf").
- Keep the name SHORT (under ~5 words).
- Translate Japanese DIY terminology to common English equivalents
  (例: 棚 → shelf, ウッドデッキ → deck, 本棚 → bookshelf, etc.)
- Description should be a single sentence describing what the DIY project is.
- imageAlt should be brief and describe the visual content (often "DIY blueprint for X").
- Do NOT include the Japanese text in the output.
- Do NOT translate brand names like ZUMEN, Cainz, Komeri, Kohnan, DCM.

Call the submit_usecase_translation tool with your translation.`;
}

async function translateUseCase(uc: FSUseCase): Promise<UseCaseTranslation> {
  return await callClaude<UseCaseTranslation>(
    buildUseCasePrompt(uc),
    USECASE_TOOL,
    "submit_usecase_translation",
  );
}

// ── Blueprint 翻訳 ──────────────────────────────────────────────

interface FSStep {
  order: number;
  title: string;
  description: string;
  tips?: string[];
  pitfalls?: string[];
}
interface FSPart { name: string; spec: string; note?: string; }
interface FSCutItem { partName: string; }
interface FSTool { name: string; note?: string; }
interface FSBlueprint {
  useCaseID?: string;
  name: string;
  warnings: string[];
  tools: FSTool[];
  parts: FSPart[];
  cutItems: FSCutItem[];
  steps: FSStep[];
  nameEn?: string;
  warningsEn?: string[];
}

interface BlueprintTranslation {
  nameEn: string;
  warningsEn: string[];
  tools: Array<{ nameEn: string; noteEn: string | null }>;
  parts: Array<{ nameEn: string; specEn: string; noteEn: string | null }>;
  cutItems: Array<{ partNameEn: string }>;
  steps: Array<{
    titleEn: string;
    descriptionEn: string;
    tipsEn: string[];
    pitfallsEn: string[];
  }>;
}

function buildBlueprintTool(bp: FSBlueprint): object {
  return {
    name: "submit_blueprint_translation",
    description: "Submit the English translation of a Blueprint document. All arrays must align in length and order with the source arrays.",
    input_schema: {
      type: "object",
      required: ["nameEn", "warningsEn", "tools", "parts", "cutItems", "steps"],
      properties: {
        nameEn: { type: "string", minLength: 2, maxLength: 80 },
        warningsEn: {
          type: "array",
          minItems: bp.warnings.length,
          maxItems: bp.warnings.length,
          items: { type: "string", minLength: 5, maxLength: 240 },
        },
        tools: {
          type: "array",
          minItems: bp.tools.length,
          maxItems: bp.tools.length,
          items: {
            type: "object",
            required: ["nameEn", "noteEn"],
            properties: {
              nameEn: { type: "string", minLength: 1, maxLength: 80 },
              noteEn: { type: ["string", "null"], maxLength: 200 },
            },
          },
        },
        parts: {
          type: "array",
          minItems: bp.parts.length,
          maxItems: bp.parts.length,
          items: {
            type: "object",
            required: ["nameEn", "specEn", "noteEn"],
            properties: {
              nameEn: { type: "string", minLength: 1, maxLength: 80 },
              specEn: { type: "string", minLength: 1, maxLength: 80 },
              noteEn: { type: ["string", "null"], maxLength: 200 },
            },
          },
        },
        cutItems: {
          type: "array",
          minItems: bp.cutItems.length,
          maxItems: bp.cutItems.length,
          items: {
            type: "object",
            required: ["partNameEn"],
            properties: {
              partNameEn: { type: "string", minLength: 1, maxLength: 80 },
            },
          },
        },
        steps: {
          type: "array",
          minItems: bp.steps.length,
          maxItems: bp.steps.length,
          items: {
            type: "object",
            required: ["titleEn", "descriptionEn", "tipsEn", "pitfallsEn"],
            properties: {
              titleEn: { type: "string", minLength: 2, maxLength: 80 },
              descriptionEn: { type: "string", minLength: 10, maxLength: 600 },
              tipsEn: { type: "array", items: { type: "string", minLength: 5, maxLength: 200 } },
              pitfallsEn: { type: "array", items: { type: "string", minLength: 5, maxLength: 240 } },
            },
          },
        },
      },
    },
  };
}

function buildBlueprintPrompt(bp: FSBlueprint): string {
  const toolsList = bp.tools.map((t, i) =>
    `  ${i}: ${t.name}${t.note ? ` — ${t.note}` : ""}`).join("\n");
  const partsList = bp.parts.map((p, i) =>
    `  ${i}: ${p.name} | spec: ${p.spec}${p.note ? ` | note: ${p.note}` : ""}`).join("\n");
  const cutsList = bp.cutItems.map((c, i) => `  ${i}: ${c.partName}`).join("\n");
  const stepsList = bp.steps.map((s) => {
    const tips = (s.tips ?? []).map((t) => `      - ${t}`).join("\n");
    const pits = (s.pitfalls ?? []).map((t) => `      - ${t}`).join("\n");
    return `  step ${s.order}:\n    title: ${s.title}\n    description: ${s.description}\n    tips:\n${tips || "      (none)"}\n    pitfalls:\n${pits || "      (none)"}`;
  }).join("\n");

  return `You are translating a Japanese DIY blueprint document into clear, technical English.
The reader is a beginner DIYer building a piece of furniture or fixture.

Source (Japanese):
name: ${bp.name}

warnings (${bp.warnings.length} items, output array MUST be the same length and order):
${bp.warnings.map((w, i) => `  ${i}: ${w}`).join("\n")}

tools (${bp.tools.length} items, same length & order):
${toolsList || "  (none)"}

parts (${bp.parts.length} items, same length & order):
${partsList || "  (none)"}

cutItems (${bp.cutItems.length} items, same length & order):
${cutsList || "  (none)"}

steps (${bp.steps.length} items, same length & order):
${stepsList || "  (none)"}

Constraints:
1. Every output array MUST have EXACTLY the same length as the input array, in the same order.
2. Use natural English carpentry / DIY terminology:
   - 棚 → shelf, 本棚 → bookshelf, 棚板 → shelf board
   - SPF材 → SPF lumber, 1×4 → 1x4, 2×4 → 2x4
   - ビス → screw, コーススレッド → coarse-thread screw, 木ねじ → wood screw
   - サンドペーパー / 紙やすり → sandpaper, やすりがけ → sanding
   - 下穴 → pilot hole, 皿取り → countersink
   - 水平器 → level, 直角 → right angle, さしがね → carpenter's square
   - 防腐塗料 → wood preservative, ワトコオイル → Watco Oil
3. spec strings ("19×89×900 mm" etc.) — keep the numeric measurements unchanged. Translate only descriptive parts (e.g. "SPF材 1×4 19×89×910mm" → "SPF lumber 1x4 19×89×910mm").
4. cutItem.partName: just translate the part name (e.g. "棚板" → "Shelf Board").
5. tips and pitfalls arrays may have different lengths per step — match each step's input array length exactly. If a step has no tips or pitfalls, return an empty array [].
6. note fields can be null if the source has no note. Return null (not empty string) when there's no note.
7. Keep the same level of technical detail — do not summarize or expand.
8. Do not include the original Japanese text.

Call submit_blueprint_translation with your output.`;
}

async function translateBlueprint(bp: FSBlueprint): Promise<BlueprintTranslation> {
  return await callClaude<BlueprintTranslation>(
    buildBlueprintPrompt(bp),
    buildBlueprintTool(bp),
    "submit_blueprint_translation",
  );
}

// ── 検証 ────────────────────────────────────────────────────────

function validateBlueprintTranslation(bp: FSBlueprint, t: BlueprintTranslation): string[] {
  const errs: string[] = [];
  if (t.warningsEn.length !== bp.warnings.length) errs.push(`warnings 配列長 ${t.warningsEn.length} != ${bp.warnings.length}`);
  if (t.tools.length !== bp.tools.length) errs.push(`tools 配列長 ${t.tools.length} != ${bp.tools.length}`);
  if (t.parts.length !== bp.parts.length) errs.push(`parts 配列長 ${t.parts.length} != ${bp.parts.length}`);
  if (t.cutItems.length !== bp.cutItems.length) errs.push(`cutItems 配列長 ${t.cutItems.length} != ${bp.cutItems.length}`);
  if (t.steps.length !== bp.steps.length) errs.push(`steps 配列長 ${t.steps.length} != ${bp.steps.length}`);

  for (let i = 0; i < Math.min(t.steps.length, bp.steps.length); i++) {
    const inLen = (bp.steps[i].tips ?? []).length;
    const outLen = (t.steps[i].tipsEn ?? []).length;
    if (inLen !== outLen) errs.push(`step ${i + 1}: tipsEn 配列長 ${outLen} != ${inLen}`);

    const inPits = (bp.steps[i].pitfalls ?? []).length;
    const outPits = (t.steps[i].pitfallsEn ?? []).length;
    if (inPits !== outPits) errs.push(`step ${i + 1}: pitfallsEn 配列長 ${outPits} != ${inPits}`);
  }
  return errs;
}

// ── Firestore 書き込み ──────────────────────────────────────────

async function writeUseCaseTranslation(
  db: FirebaseFirestore.Firestore,
  id: string,
  t: UseCaseTranslation,
) {
  await db.collection("useCases").doc(id).set(
    {
      nameEn: t.nameEn,
      descriptionEn: t.descriptionEn,
      imageAltEn: t.imageAltEn,
    },
    { merge: true },
  );
}

async function writeBlueprintTranslation(
  db: FirebaseFirestore.Firestore,
  id: string,
  bp: FSBlueprint,
  t: BlueprintTranslation,
) {
  // 元の配列 + 翻訳された *En フィールドを各要素にマージ
  const tools = bp.tools.map((tool, i) => ({
    ...tool,
    nameEn: t.tools[i]?.nameEn ?? null,
    noteEn: t.tools[i]?.noteEn ?? null,
  }));
  const parts = bp.parts.map((part, i) => ({
    ...part,
    nameEn: t.parts[i]?.nameEn ?? null,
    specEn: t.parts[i]?.specEn ?? null,
    noteEn: t.parts[i]?.noteEn ?? null,
  }));
  const cutItems = bp.cutItems.map((c, i) => ({
    ...c,
    partNameEn: t.cutItems[i]?.partNameEn ?? null,
  }));
  const steps = bp.steps.map((s, i) => ({
    ...s,
    titleEn: t.steps[i]?.titleEn ?? null,
    descriptionEn: t.steps[i]?.descriptionEn ?? null,
    tipsEn: t.steps[i]?.tipsEn ?? [],
    pitfallsEn: t.steps[i]?.pitfallsEn ?? [],
  }));

  await db.collection("blueprints").doc(id).set(
    {
      nameEn: t.nameEn,
      warningsEn: t.warningsEn,
      tools,
      parts,
      cutItems,
      steps,
    },
    { merge: true },
  );
}

/** useCase.nameEn を全 examples の useCaseNameEn に伝播 (denormalize 同期) */
async function propagateExampleUseCaseNames(
  db: FirebaseFirestore.Firestore,
  dryRun: boolean,
) {
  console.log("\n▶ propagating useCase.nameEn → examples.useCaseNameEn …");
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
  for (const d of exSnap.docs) {
    const data = d.data();
    const useCaseID = data.useCaseID as string | undefined;
    if (!useCaseID) { skipped++; continue; }
    const nameEn = map[useCaseID];
    if (!nameEn) { skipped++; continue; }
    if (data.useCaseNameEn === nameEn) { skipped++; continue; }
    if (!dryRun) {
      await d.ref.set({ useCaseNameEn: nameEn }, { merge: true });
    }
    updated++;
  }
  console.log(`  ${dryRun ? "[dry-run] " : ""}updated ${updated} examples, skipped ${skipped}`);
}

// ── main ───────────────────────────────────────────────────────

interface CliArgs {
  dryRun: boolean;
  force: boolean;
  all: boolean;
  useCaseIds: string[] | "all" | null;
  blueprintIds: string[] | "all" | null;
  propagateExamples: boolean;
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2);
  const args: CliArgs = {
    dryRun: argv.includes("--dry-run"),
    force: argv.includes("--force"),
    all: argv.includes("--all"),
    useCaseIds: null,
    blueprintIds: null,
    propagateExamples: argv.includes("--propagate-examples"),
  };

  const ucIdx = argv.indexOf("--useCases");
  if (ucIdx >= 0) {
    const ids: string[] = [];
    for (let i = ucIdx + 1; i < argv.length && !argv[i].startsWith("--"); i++) ids.push(argv[i]);
    args.useCaseIds = ids.length > 0 ? ids : "all";
  }
  const bpIdx = argv.indexOf("--blueprints");
  if (bpIdx >= 0) {
    const ids: string[] = [];
    for (let i = bpIdx + 1; i < argv.length && !argv[i].startsWith("--"); i++) ids.push(argv[i]);
    args.blueprintIds = ids.length > 0 ? ids : "all";
  }
  if (args.all) {
    args.useCaseIds = args.useCaseIds ?? "all";
    args.blueprintIds = args.blueprintIds ?? "all";
    args.propagateExamples = true;
  }
  return args;
}

async function listUseCaseIds(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const snap = await db.collection("useCases").get();
  return snap.docs.map((d) => d.id);
}
async function listBlueprintIds(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const snap = await db.collection("blueprints").get();
  return snap.docs.map((d) => d.id);
}

async function processUseCase(
  db: FirebaseFirestore.Firestore,
  id: string,
  args: CliArgs,
  outDir: string,
) {
  const snap = await db.collection("useCases").doc(id).get();
  if (!snap.exists) { console.error(`  useCase 未存在: ${id}`); return; }
  const uc = { id: snap.id, ...snap.data() } as FSUseCase;
  if (!args.force && typeof uc.nameEn === "string" && uc.nameEn.length > 0) {
    console.log(`  [skip] ${id} (already has nameEn). use --force to retranslate.`);
    return;
  }
  console.log(`\n▶ useCase ${id} — ${uc.name}`);
  const t = await translateUseCase(uc);
  console.log(`  → "${t.nameEn}"`);

  fs.writeFileSync(
    path.join(outDir, `useCase_${id}.json`),
    JSON.stringify({ id, source: { name: uc.name, description: uc.description, imageAlt: uc.imageAlt }, translation: t }, null, 2),
  );

  if (!args.dryRun) {
    await writeUseCaseTranslation(db, id, t);
    console.log(`  ✓ wrote *En to useCases/${id}`);
  } else {
    console.log(`  [dry-run] skipped Firestore write`);
  }
}

async function processBlueprint(
  db: FirebaseFirestore.Firestore,
  id: string,
  args: CliArgs,
  outDir: string,
) {
  const snap = await db.collection("blueprints").doc(id).get();
  if (!snap.exists) { console.error(`  blueprint 未存在: ${id}`); return; }
  const bp = snap.data() as FSBlueprint;
  if (!args.force && typeof bp.nameEn === "string" && bp.nameEn.length > 0) {
    console.log(`  [skip] ${id} (already has nameEn). use --force to retranslate.`);
    return;
  }
  console.log(`\n▶ blueprint ${id} — ${bp.name} (steps=${bp.steps.length}, parts=${bp.parts.length})`);
  const t = await translateBlueprint(bp);

  const errs = validateBlueprintTranslation(bp, t);
  if (errs.length > 0) {
    console.error(`  ⚠ 検証エラー:`);
    for (const e of errs) console.error(`    - ${e}`);
  }

  fs.writeFileSync(
    path.join(outDir, `blueprint_${id}.json`),
    JSON.stringify({ id, validationErrors: errs, translation: t }, null, 2),
  );

  if (errs.length > 0 && !args.force) {
    console.error(`  ✗ 検証エラーのため Firestore 書き込みをスキップ。--force で書き込み可能。`);
    return;
  }

  if (!args.dryRun) {
    await writeBlueprintTranslation(db, id, bp, t);
    console.log(`  ✓ wrote *En to blueprints/${id}`);
  } else {
    console.log(`  [dry-run] skipped Firestore write`);
  }
}

async function main() {
  const args = parseArgs();

  if (
    args.useCaseIds === null &&
    args.blueprintIds === null &&
    !args.propagateExamples
  ) {
    console.error("usage: translate-firestore-en.ts [--useCases [ids...]] [--blueprints [ids...]] [--propagate-examples] [--all] [--dry-run] [--force]");
    process.exit(1);
  }

  const db = initFirebase();
  const outDir = path.join(__dirname, "translated");
  fs.mkdirSync(outDir, { recursive: true });

  const start = Date.now();

  if (args.useCaseIds !== null) {
    const ids = args.useCaseIds === "all" ? await listUseCaseIds(db) : args.useCaseIds;
    console.log(`useCases to translate: ${ids.length}`);
    for (const id of ids) {
      try {
        await processUseCase(db, id, args, outDir);
      } catch (e) {
        console.error(`  ✗ useCase ${id}: ${(e as Error).message}`);
      }
    }
  }

  if (args.blueprintIds !== null) {
    const ids = args.blueprintIds === "all" ? await listBlueprintIds(db) : args.blueprintIds;
    console.log(`\nblueprints to translate: ${ids.length}`);
    for (const id of ids) {
      try {
        await processBlueprint(db, id, args, outDir);
      } catch (e) {
        console.error(`  ✗ blueprint ${id}: ${(e as Error).message}`);
      }
    }
  }

  if (args.propagateExamples) {
    try {
      await propagateExampleUseCaseNames(db, args.dryRun);
    } catch (e) {
      console.error(`  ✗ propagate failed: ${(e as Error).message}`);
    }
  }

  const elapsed = Math.round((Date.now() - start) / 1000);
  console.log(`\ndone in ${elapsed}s. tokens: in=${totalInputTokens} out=${totalOutputTokens}`);
  console.log(`output dir: ${outDir}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
