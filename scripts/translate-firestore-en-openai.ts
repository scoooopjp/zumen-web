/**
 * translate-firestore-en-openai.ts
 * translate-firestore-en.ts の OpenAI 版。
 *
 * - OpenAI Chat Completions + response_format: json_schema (strict) を使用
 * - prompt / Firestore 書き込みロジックは Anthropic 版と同一
 * - 既存の *En を持つ doc は --force が無ければスキップ
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
 *   export OPENAI_API_KEY="sk-..."
 *
 *   # dry-run
 *   npx ts-node --project tsconfig.seed.json scripts/translate-firestore-en-openai.ts --dry-run --useCases tana-1
 *
 *   # 単一 blueprint
 *   npx ts-node --project tsconfig.seed.json scripts/translate-firestore-en-openai.ts --blueprints tana-1
 *
 *   # 全部 (本番)
 *   npx ts-node --project tsconfig.seed.json scripts/translate-firestore-en-openai.ts --all
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

// ── OpenAI API ──────────────────────────────────────────────────
const MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini"; // 翻訳タスクは mini で十分

interface OpenAIUsage { prompt_tokens: number; completion_tokens: number; }
let totalInputTokens = 0;
let totalOutputTokens = 0;

async function callOpenAI<T>(prompt: string, schema: object, schemaName: string): Promise<T> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY が未設定です");

  const body = {
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema,
      },
    },
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${errText}`);
  }

  const payload = (await res.json()) as {
    choices: Array<{ message: { content?: string; refusal?: string }; finish_reason?: string }>;
    usage?: OpenAIUsage;
  };

  if (payload.usage) {
    totalInputTokens += payload.usage.prompt_tokens;
    totalOutputTokens += payload.usage.completion_tokens;
  }

  const choice = payload.choices?.[0];
  if (!choice) throw new Error("OpenAI: empty choices");
  if (choice.message.refusal) throw new Error(`OpenAI refused: ${choice.message.refusal}`);
  const content = choice.message.content;
  if (!content) throw new Error(`OpenAI: empty content. finish_reason=${choice.finish_reason}`);

  try {
    return JSON.parse(content) as T;
  } catch (e) {
    throw new Error(`OpenAI: failed to parse JSON: ${(e as Error).message}\nraw: ${content.slice(0, 500)}`);
  }
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

// strict mode は minLength / maxLength を未サポートのため落としている。
// 代わりに prompt + main loop の検証で長さを担保する。
const USECASE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["nameEn", "descriptionEn", "imageAltEn"],
  properties: {
    nameEn: { type: "string", description: "DIY プロダクト名の英訳。Title Case、~5語以内。" },
    descriptionEn: { type: "string", description: "メタ説明文の英訳 (1文)。" },
    imageAltEn: { type: "string", description: "画像 alt の英訳。簡潔に。" },
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

Return JSON with keys: nameEn, descriptionEn, imageAltEn.`;
}

async function translateUseCase(uc: FSUseCase): Promise<UseCaseTranslation> {
  return await callOpenAI<UseCaseTranslation>(
    buildUseCasePrompt(uc),
    USECASE_SCHEMA,
    "usecase_translation",
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

// strict mode では minItems/maxItems もサポート外なので array 長は prompt + 後段検証で担保。
const BLUEPRINT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["nameEn", "warningsEn", "tools", "parts", "cutItems", "steps"],
  properties: {
    nameEn: { type: "string" },
    warningsEn: { type: "array", items: { type: "string" } },
    tools: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nameEn", "noteEn"],
        properties: {
          nameEn: { type: "string" },
          noteEn: { type: ["string", "null"] },
        },
      },
    },
    parts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["nameEn", "specEn", "noteEn"],
        properties: {
          nameEn: { type: "string" },
          specEn: { type: "string" },
          noteEn: { type: ["string", "null"] },
        },
      },
    },
    cutItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["partNameEn"],
        properties: {
          partNameEn: { type: "string" },
        },
      },
    },
    steps: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["titleEn", "descriptionEn", "tipsEn", "pitfallsEn"],
        properties: {
          titleEn: { type: "string" },
          descriptionEn: { type: "string" },
          tipsEn: { type: "array", items: { type: "string" } },
          pitfallsEn: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

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

Return JSON conforming to the schema.`;
}

async function translateBlueprint(bp: FSBlueprint): Promise<BlueprintTranslation> {
  return await callOpenAI<BlueprintTranslation>(
    buildBlueprintPrompt(bp),
    BLUEPRINT_SCHEMA,
    "blueprint_translation",
  );
}

// ── 検証 ────────────────────────────────────────────────────────

function validateBlueprintTranslation(bp: FSBlueprint, t: BlueprintTranslation): string[] {
  const errs: string[] = [];
  // 位置インデックスが揃っている必要があるものは厳格チェック (zip して書き込むため)
  if (t.tools.length !== bp.tools.length) errs.push(`tools 配列長 ${t.tools.length} != ${bp.tools.length}`);
  if (t.parts.length !== bp.parts.length) errs.push(`parts 配列長 ${t.parts.length} != ${bp.parts.length}`);
  if (t.cutItems.length !== bp.cutItems.length) errs.push(`cutItems 配列長 ${t.cutItems.length} != ${bp.cutItems.length}`);
  if (t.steps.length !== bp.steps.length) errs.push(`steps 配列長 ${t.steps.length} != ${bp.steps.length}`);

  // tips / pitfalls / warnings は独立要素のリストなので、EN < JA (情報欠損) のみエラー扱い。
  // EN > JA (モデルが分割/拡張) は許容 — pickI18nArray は配列丸ごと差し替えるだけなので表示上は冗長になるだけ。
  if (t.warningsEn.length < bp.warnings.length) {
    errs.push(`warnings 配列が不足: ${t.warningsEn.length} < ${bp.warnings.length}`);
  }

  for (let i = 0; i < Math.min(t.steps.length, bp.steps.length); i++) {
    const inLen = (bp.steps[i].tips ?? []).length;
    const outLen = (t.steps[i].tipsEn ?? []).length;
    if (outLen < inLen) errs.push(`step ${i + 1}: tipsEn が不足 ${outLen} < ${inLen}`);

    const inPits = (bp.steps[i].pitfalls ?? []).length;
    const outPits = (t.steps[i].pitfallsEn ?? []).length;
    if (outPits < inPits) errs.push(`step ${i + 1}: pitfallsEn が不足 ${outPits} < ${inPits}`);
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
  /** translated/blueprint_${id}.json が存在すれば OpenAI を呼ばずに再検証 + Firestore 書き込みのみ行う */
  fromCache: boolean;
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
    fromCache: argv.includes("--from-cache"),
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

  // --from-cache: 既に保存済みの翻訳 JSON があれば OpenAI を呼ばずに再検証だけする
  const cachePath = path.join(outDir, `blueprint_${id}.json`);
  let t: BlueprintTranslation;
  if (args.fromCache && fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8")) as { translation: BlueprintTranslation };
    t = cached.translation;
    console.log(`\n▶ blueprint ${id} — ${bp.name} (steps=${bp.steps.length}, parts=${bp.parts.length}) [from-cache]`);
  } else {
    console.log(`\n▶ blueprint ${id} — ${bp.name} (steps=${bp.steps.length}, parts=${bp.parts.length})`);
    t = await translateBlueprint(bp);
  }

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
    console.error("usage: translate-firestore-en-openai.ts [--useCases [ids...]] [--blueprints [ids...]] [--propagate-examples] [--all] [--dry-run] [--force]");
    process.exit(1);
  }

  const db = initFirebase();
  const outDir = path.join(__dirname, "translated");
  fs.mkdirSync(outDir, { recursive: true });

  const start = Date.now();
  console.log(`model: ${MODEL}`);

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
