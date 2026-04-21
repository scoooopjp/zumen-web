/**
 * fix-spf-confusion-pitfall.ts
 * bookshelf-1 テンプレから派生した 51 件の enriched JSON に含まれる、自己矛盾した
 * SPF 部材比較の pitfall を汎用的な SPF 検品 pitfall に置換する。
 *
 * 背景: 元 golden (bookshelf-1, 奥行280mm) では "1×10材(幅235mm)と1×8材(幅184mm)を
 * 混同しない。本棚の奥行は280mmなので1×10一択" という pitfall があったが、
 * typename 置換後に "1×8材と1×8材" のような意味のない比較に退化していた。
 * 奥行も本ケースの寸法と合わないため、pitfall ごと書き直す。
 *
 * Run:
 *   npx ts-node --project tsconfig.seed.json scripts/fix-spf-confusion-pitfall.ts
 */

import * as fs from "fs";
import * as path from "path";

const ENRICHED_DIR = path.join(__dirname, "enriched");
const PATTERN = /1×\d+材\(幅\d+mm\)と1×\d+材\(幅\d+mm\)を混同しない。[^"]*1×\d+一択/;
const REPLACEMENT =
  "SPF材は1枚ずつ反り・割れ・節を確認してから購入。反り1mm以上の材を組むと棚板が歪む";

interface Step {
  pitfalls?: string[];
  [k: string]: unknown;
}
interface Enriched {
  useCaseID: string;
  steps: Step[];
  [k: string]: unknown;
}

function main() {
  const files = fs.readdirSync(ENRICHED_DIR).filter((f) => f.endsWith(".json"));
  let touchedFiles = 0;
  let touchedPitfalls = 0;

  for (const file of files) {
    const p = path.join(ENRICHED_DIR, file);
    const data = JSON.parse(fs.readFileSync(p, "utf8")) as Enriched;
    let dirty = false;
    for (const step of data.steps) {
      if (!step.pitfalls) continue;
      step.pitfalls = step.pitfalls.map((pit) => {
        if (PATTERN.test(pit)) {
          dirty = true;
          touchedPitfalls += 1;
          return REPLACEMENT;
        }
        return pit;
      });
    }
    if (dirty) {
      fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
      touchedFiles += 1;
    }
  }

  console.log(`Rewrote ${touchedPitfalls} pitfall strings across ${touchedFiles} files.`);
}

main();
