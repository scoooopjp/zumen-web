/**
 * fix-consecutive-complete.ts
 * Reclassify non-final `complete` illustrationType steps so the completion
 * animation only plays once per blueprint. Runs are produced by template
 * enrichment where multiple end-of-build steps inherited `complete`.
 */

import * as fs from "fs";
import * as path from "path";

const ENRICHED_DIR = path.join(__dirname, "enriched");

const TITLE_TO_TYPE: Record<string, string> = {
  "カーペット(ボア素材)の貼り付け": "install",
  "クッション・マット類の準備": "install",
  "メンテナンス記録と運用": "inspect",
  "塗膜の完全硬化待ち": "paint",
  "壁への転倒防止固定": "install",
  "完成・設置と最終確認": "inspect",
  "窓枠への取り付け": "install",
  "脚パッドと転倒防止金具の取り付け": "install",
  "脚パッドと防水対策": "install",
};

interface Step {
  title?: string;
  illustrationType?: string;
  [k: string]: unknown;
}
interface Enriched {
  steps: Step[];
  [k: string]: unknown;
}

function main() {
  const files = fs
    .readdirSync(ENRICHED_DIR)
    .filter((f) => f.endsWith(".json"));
  let touchedFiles = 0;
  let touchedSteps = 0;

  for (const file of files) {
    const p = path.join(ENRICHED_DIR, file);
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as Enriched;
    const idx: number[] = [];
    data.steps.forEach((s, i) => {
      if (s.illustrationType === "complete") idx.push(i);
    });
    if (idx.length < 2) continue;

    let dirty = false;
    for (const i of idx.slice(0, -1)) {
      const step = data.steps[i];
      const mapped = TITLE_TO_TYPE[step.title ?? ""];
      if (!mapped) {
        console.warn(`[${file}] unmapped title: "${step.title}"`);
        continue;
      }
      step.illustrationType = mapped;
      dirty = true;
      touchedSteps += 1;
    }

    if (dirty) {
      fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
      touchedFiles += 1;
    }
  }

  console.log(
    `Reclassified ${touchedSteps} steps across ${touchedFiles} files.`,
  );
}

main();
