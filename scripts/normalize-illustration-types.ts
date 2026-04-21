/**
 * normalize-illustration-types.ts
 * scripts/enriched/*.json の `illustrationType` を、iOS `IllType.from(_:)` と
 * Web `StepIllustration.KNOWN` が解釈できる正規値へ正規化する。
 *
 * 背景: enrich-from-template の初期実装でテンプレートが `sanding` / `check` /
 * `position` / `trim` / `back_panel` / `finish` などを出力していたため、両クライアントは
 * これらを canonical 値として認識できず、キーワード推論フォールバックに落ちていた。
 *
 * Run:
 *   npx ts-node --project tsconfig.seed.json scripts/normalize-illustration-types.ts
 */

import * as fs from "fs";
import * as path from "path";

const ENRICHED_DIR = path.join(__dirname, "enriched");

/** Web `KNOWN` / iOS `IllType.from` が認識する canonical 値 */
const CANONICAL = new Set<string>([
  "measure","markLine","cut","sand","drill","foundation","levelCheck",
  "topBoard","frame","wallMount","waterproof","paint","inspect","screw","complete",
  "assemble","install",
]);

/** 旧 → canonical マッピング */
const ALIASES: Record<string, string> = {
  sanding: "sand",
  check: "inspect",
  position: "markLine",
  trim: "cut",
  back_panel: "frame",
  finish: "complete",
};

interface Step {
  order: number;
  illustrationType?: string;
  [k: string]: unknown;
}
interface Enriched {
  useCaseID: string;
  steps: Step[];
  [k: string]: unknown;
}

function normalize(t: string | undefined): { out: string | undefined; changed: boolean } {
  if (!t) return { out: t, changed: false };
  if (CANONICAL.has(t)) return { out: t, changed: false };
  const alias = ALIASES[t];
  if (alias) return { out: alias, changed: true };
  return { out: t, changed: false };
}

function main() {
  const files = fs.readdirSync(ENRICHED_DIR).filter((f) => f.endsWith(".json"));
  const stats: Record<string, number> = {};
  let touchedFiles = 0;
  let touchedSteps = 0;

  for (const file of files) {
    const p = path.join(ENRICHED_DIR, file);
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as Enriched;
    let dirty = false;
    for (const step of data.steps) {
      const { out, changed } = normalize(step.illustrationType);
      if (changed) {
        stats[step.illustrationType as string] = (stats[step.illustrationType as string] ?? 0) + 1;
        step.illustrationType = out;
        dirty = true;
        touchedSteps += 1;
      }
    }
    if (dirty) {
      fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
      touchedFiles += 1;
    }
  }

  console.log(`Normalized ${touchedSteps} steps across ${touchedFiles} files.`);
  for (const [from, count] of Object.entries(stats).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${from} → ${ALIASES[from]}  (${count})`);
  }
}

main();
