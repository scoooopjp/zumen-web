/**
 * enrich-blueprints.ts
 * 既存の blueprints/{useCaseID} の steps を Claude API で 18-24 step に拡張し、
 * 各 step に tips / pitfalls / estimatedMinutes を追加する。
 *
 * parts / cutItems / dimensions は deterministic なので変更しない。
 * 生成結果は scripts/enriched/{useCaseID}.json に書き出して人間レビューを経てから
 * seed-enriched-blueprints.ts で Firestore に反映する。
 *
 * Run (pilot — compost 5 件):
 *   export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
 *   export ANTHROPIC_API_KEY="sk-ant-..."
 *   npx ts-node --project tsconfig.seed.json scripts/enrich-blueprints.ts compost-1 compost-2 compost-3 compost-4 compost-5
 *
 * Run (single):
 *   npx ts-node --project tsconfig.seed.json scripts/enrich-blueprints.ts compost-1
 *
 * --dry-run: API 呼び出しを行わず、送信予定のプロンプトのみ出力
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

const ALLOWED_ILL_TYPES = [
  "measure", "markLine", "cut", "sand", "drill",
  "foundation", "levelCheck", "topBoard", "frame",
  "wallMount", "waterproof", "paint", "inspect", "screw", "complete",
] as const;

type IllType = (typeof ALLOWED_ILL_TYPES)[number];

interface FSStep {
  order: number;
  title: string;
  description: string;
  illustrationType?: string;
  tips?: string[];
  pitfalls?: string[];
  estimatedMinutes?: number;
}

interface FSPart { name: string; spec: string; quantity: number; unit: string; note?: string; }
interface FSCutItem { partName: string; thickness: number; width: number; length: number; quantity: number; }
interface FSBlueprint {
  useCaseID: string;
  templateID: string;
  name: string;
  category: string;
  indoorOutdoor: string;
  dimensions: { width: number; depth: number; height: number };
  warnings: string[];
  tools: Array<{ name: string; note?: string }>;
  steps: FSStep[];
  parts: FSPart[];
  cutItems: FSCutItem[];
}

interface EnrichedStep extends FSStep {
  order: number;
  title: string;
  description: string;
  illustrationType: IllType;
  tips: string[];
  pitfalls: string[];
  estimatedMinutes: number;
}

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

// ── Claude API 呼び出し ────────────────────────────────────────
// tool_use で構造化出力を受け取る（Messages API + forced tool choice）
const ENRICH_TOOL_SCHEMA = {
  name: "submit_enriched_steps",
  description: "Return the fully enriched step list for this blueprint.",
  input_schema: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        minItems: 16,
        maxItems: 26,
        items: {
          type: "object",
          required: ["order", "title", "description", "illustrationType", "tips", "pitfalls", "estimatedMinutes"],
          properties: {
            order: { type: "integer", minimum: 1 },
            title: { type: "string", minLength: 3, maxLength: 40 },
            description: {
              type: "string",
              minLength: 40,
              maxLength: 400,
              description: "手順の具体的な説明。部材名・寸法・工具・ビス規格などを含める。",
            },
            illustrationType: {
              type: "string",
              enum: [...ALLOWED_ILL_TYPES],
              description: "iOS/Web の既存 IllType enum と揃える。新規タイプ不可。",
            },
            tips: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: { type: "string", minLength: 10, maxLength: 120 },
              description: "コツ・時短テクニック・プロのひと手間。",
            },
            pitfalls: {
              type: "array",
              minItems: 1,
              maxItems: 3,
              items: { type: "string", minLength: 10, maxLength: 150 },
              description: "失敗例と回復方法。ビギナーが陥りがちなミスと、それを起こしてしまった場合の直し方。",
            },
            estimatedMinutes: {
              type: "integer",
              minimum: 3,
              maximum: 240,
              description: "この step を完了するのに必要な時間（分）。",
            },
          },
        },
      },
    },
    required: ["steps"],
  },
} as const;

function buildPrompt(bp: FSBlueprint): string {
  const partsMd = bp.parts.map((p) => `- ${p.name} (${p.spec}) × ${p.quantity}${p.unit}${p.note ? ` — ${p.note}` : ""}`).join("\n");
  const cutMd = bp.cutItems.map((c) => `- ${c.partName}: ${c.thickness}×${c.width}×${c.length}mm × ${c.quantity}`).join("\n");
  const currentSteps = bp.steps
    .map((s) => `${s.order}. **${s.title}** (illustrationType=${s.illustrationType ?? "?"})\n   ${s.description}`)
    .join("\n");

  return `あなたは日本の DIY 指導者です。以下の設計図に対して、**初心者でも一人で作れる** レベルまで工程を詳細化してください。

## 対象: ${bp.name}
- カテゴリ: ${bp.category}
- 屋内外: ${bp.indoorOutdoor}
- 寸法: W${bp.dimensions.width} × D${bp.dimensions.depth} × H${bp.dimensions.height} mm

## 部材 (変更不可)
${partsMd}

## カット図 (変更不可)
${cutMd}

## 既存の工程 (${bp.steps.length} step) — これを拡張してください
${currentSteps}

## タスク
上記 ${bp.steps.length} step を **18〜24 step に拡張** し、各 step に以下を追加してください:
- **tips** (1〜3 件): コツ・時短・プロのひと手間。例: 「クランプで仮固定すると一人作業でも直角が出せる」
- **pitfalls** (1〜3 件): 失敗例と回復方法。例: 「ビスを斜めに打ち込んでしまったら、一度抜いて木工パテで埋めてから打ち直す」
- **estimatedMinutes**: 完了目安時間（分）

## ルール
1. **部材寸法・個数は絶対に変えない**。既存の仕様 (${bp.dimensions.width}×${bp.dimensions.depth}×${bp.dimensions.height}mm、部材表) と矛盾しないこと。
2. **illustrationType は必ず以下の15種類から選ぶ** (新規不可):
   ${ALLOWED_ILL_TYPES.join(", ")}
3. 元の ${bp.steps.length} step の意図は残し、各 step を 2-3 のサブ step に分解する形で拡張する。
4. 採寸→カット→やすり→組立→仕上げ の順序は崩さない。
5. description は 40〜400 文字で、「何を」「どこに」「どの工具で」「どれぐらい」を含める。曖昧な表現 ("適切に"、"丁寧に") は使わない。
6. **tips/pitfalls は具体的に**。「注意する」ではなく「○○すると××できる」「○○してしまったら△△で直す」。
7. ${bp.indoorOutdoor === "屋外" ? "屋外設置なので、防腐・防水の工程は省略しないこと。" : "屋内設置なので、塗装は安全性（水性・低VOC）を重視すること。"}

submit_enriched_steps ツールを呼んで結果を返してください。`;
}

async function callClaude(prompt: string): Promise<EnrichedStep[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が未設定です");

  const body = {
    model: "claude-opus-4-7",
    max_tokens: 16000,
    tools: [ENRICH_TOOL_SCHEMA],
    tool_choice: { type: "tool", name: "submit_enriched_steps" },
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
    content: Array<{ type: string; name?: string; input?: { steps?: EnrichedStep[] } }>;
    stop_reason?: string;
    usage?: { input_tokens: number; output_tokens: number };
  };

  if (payload.usage) {
    console.log(`  tokens: in=${payload.usage.input_tokens} out=${payload.usage.output_tokens}`);
  }

  const toolBlock = payload.content.find((c) => c.type === "tool_use" && c.name === "submit_enriched_steps");
  if (!toolBlock?.input?.steps) {
    throw new Error(`Claude did not return submit_enriched_steps tool_use. stop_reason=${payload.stop_reason}`);
  }
  return toolBlock.input.steps;
}

// ── 検証: LLM 出力の sanity check ──────────────────────────────
function validate(steps: EnrichedStep[], bp: FSBlueprint): string[] {
  const errs: string[] = [];
  if (steps.length < 16 || steps.length > 26) errs.push(`step 数が範囲外: ${steps.length}`);
  const orders = steps.map((s) => s.order).sort((a, b) => a - b);
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) errs.push(`order 番号が連番でない: ${orders.join(",")}`);
  }
  for (const s of steps) {
    if (!ALLOWED_ILL_TYPES.includes(s.illustrationType as IllType)) {
      errs.push(`step ${s.order}: 未知の illustrationType ${s.illustrationType}`);
    }
    if (!s.tips || s.tips.length === 0) errs.push(`step ${s.order}: tips が空`);
    if (!s.pitfalls || s.pitfalls.length === 0) errs.push(`step ${s.order}: pitfalls が空`);
    if (typeof s.estimatedMinutes !== "number" || s.estimatedMinutes <= 0) {
      errs.push(`step ${s.order}: estimatedMinutes 不正 ${s.estimatedMinutes}`);
    }
  }
  // 部材寸法を description で引用しているケースをざっくり検証
  const dimStr = `${bp.dimensions.width}`;
  const hasDimRef = steps.some((s) => s.description.includes(dimStr));
  if (!hasDimRef) errs.push(`どの step も寸法 ${dimStr}mm に言及していない（疑わしい）`);
  return errs;
}

// ── main ───────────────────────────────────────────────────────
async function enrichOne(db: FirebaseFirestore.Firestore, useCaseID: string, dryRun: boolean, outDir: string) {
  console.log(`\n▶ ${useCaseID}`);
  const snap = await db.collection("blueprints").doc(useCaseID).get();
  if (!snap.exists) {
    console.error(`  blueprint が見つかりません: ${useCaseID}`);
    return;
  }
  const bp = snap.data() as FSBlueprint;
  const prompt = buildPrompt(bp);

  if (dryRun) {
    const outPath = path.join(outDir, `${useCaseID}.prompt.txt`);
    fs.writeFileSync(outPath, prompt);
    console.log(`  [dry-run] wrote ${outPath} (${prompt.length} chars)`);
    return;
  }

  const started = Date.now();
  const steps = await callClaude(prompt);
  const elapsed = Math.round((Date.now() - started) / 1000);
  console.log(`  received ${steps.length} steps in ${elapsed}s`);

  const errors = validate(steps, bp);
  if (errors.length > 0) {
    console.error(`  ⚠ 検証エラー:`);
    for (const e of errors) console.error(`    - ${e}`);
  }

  const result = {
    useCaseID,
    name: bp.name,
    dimensions: bp.dimensions,
    originalStepCount: bp.steps.length,
    enrichedStepCount: steps.length,
    validationErrors: errors,
    steps,
    generatedAt: new Date().toISOString(),
    generatedBy: "claude-opus-4-7",
  };
  const outPath = path.join(outDir, `${useCaseID}.json`);
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`  wrote ${outPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const ids = args.filter((a) => !a.startsWith("--"));
  if (ids.length === 0) {
    console.error("usage: enrich-blueprints.ts <useCaseID>... [--dry-run]");
    process.exit(1);
  }

  const db = initFirebase();
  const outDir = path.join(__dirname, "enriched");
  fs.mkdirSync(outDir, { recursive: true });

  for (const id of ids) {
    try {
      await enrichOne(db, id, dryRun, outDir);
    } catch (e) {
      console.error(`  ✗ ${id}: ${(e as Error).message}`);
    }
  }

  console.log(`\ndone — output dir: ${outDir}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
