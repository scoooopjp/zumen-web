/**
 * fix-outdoor-leaks.ts
 * shoe-rack-1 (室内) テンプレから派生した屋外プロダクト (planter, dog-house,
 * cat-walk, flower-box) の enriched JSON に残存する室内限定の塗装文言を、
 * 屋外向けの塗料/対策文言へ書き換える。
 */

import * as fs from "fs";
import * as path from "path";

const ENRICHED_DIR = path.join(__dirname, "enriched");

/** 対象ファイル: 屋外/両用で『室内用ワトコオイル…』がまだ残っているもの */
const TARGETS = [
  "dog-house-9",
  "planter-1", "planter-3", "planter-4", "planter-7", "planter-9",
];

const REPLACEMENTS: Array<[RegExp, string]> = [
  [
    /塗装前に#240で全体を軽く撫で、濡れ布巾で粉を除去します。ビス頭周りや木口部分の段差も均します。室内用なのでワトコオイルやブライワックスなどが使いやすいです。/g,
    "塗装前に#240で全体を軽く撫で、濡れ布巾で粉を除去します。ビス頭周りや木口部分の段差も均します。屋外環境に耐える防腐・防カビ塗料(キシラデコールやオスモカラー等)を使います。",
  ],
  [
    /室内作業なら換気を良くし、揮発臭対策で窓を開ける/g,
    "屋外塗装は風で塵が付きやすい。無風・乾燥の日を選ぶと仕上がりが安定",
  ],
];

function main() {
  let touched = 0;
  for (const id of TARGETS) {
    const p = path.join(ENRICHED_DIR, `${id}.json`);
    if (!fs.existsSync(p)) continue;
    const raw = fs.readFileSync(p, "utf8");
    let out = raw;
    for (const [pat, rep] of REPLACEMENTS) {
      out = out.replace(pat, rep);
    }
    if (out !== raw) {
      fs.writeFileSync(p, out);
      touched += 1;
      console.log(`rewrote: ${id}`);
    }
  }
  console.log(`Touched ${touched} / ${TARGETS.length} files.`);
}

main();
