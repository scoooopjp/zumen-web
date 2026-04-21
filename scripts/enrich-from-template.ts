/**
 * enrich-from-template.ts
 *
 * 手書きの代表的な enriched JSON をテンプレとして、同一 templateID の簡易変種を
 * パラメータ置換で生成する。tpl-bench の bench-1 / bench-2 を手書きしたので、
 * bench-5〜bench-14 の "標準 4 脚ベンチ" 変種はこれで生成できる。
 *
 * Run:
 *   npx ts-node --project tsconfig.seed.json scripts/enrich-from-template.ts
 */

import * as fs from "fs";
import * as path from "path";

interface FSPart { name: string; spec: string; quantity: number; unit: string; note?: string; }
interface FSStep {
  order: number; title: string; description: string;
  illustrationType?: string;
  tips?: string[]; pitfalls?: string[]; estimatedMinutes?: number;
}
interface FSBlueprint {
  useCaseID: string; templateID: string; name: string; category: string;
  indoorOutdoor: string;
  dimensions: { width: number; depth: number; height: number };
  warnings: string[];
  tools: Array<{ name: string; note?: string }>;
  steps: FSStep[];
  parts: FSPart[];
  cutItems: Array<{ partName: string; thickness: number; width: number; length: number; quantity: number }>;
}

const RAW_DIR = "/tmp/blueprint-raw";
const OUT_DIR = path.join(__dirname, "enriched");

function loadRaw(id: string): FSBlueprint {
  return JSON.parse(fs.readFileSync(path.join(RAW_DIR, `${id}.json`), "utf-8"));
}

function loadEnriched(id: string) {
  const p = path.join(OUT_DIR, `${id}.json`);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

/**
 * 文字列置換で寸法・名前を新しい use case に合わせる
 */
function adapt(tplText: string, tplBp: FSBlueprint, newBp: FSBlueprint): string {
  const legLenTpl = tplBp.parts.find((p) => p.name.includes("脚材"))?.spec.match(/×(\d+)mm$/)?.[1];
  const legLenNew = newBp.parts.find((p) => p.name.includes("脚材"))?.spec.match(/×(\d+)mm$/)?.[1];
  const screwCountTpl = tplBp.parts.find((p) => p.name.includes("コーススレッド"))?.quantity ?? 40;
  const screwCountNew = newBp.parts.find((p) => p.name.includes("コーススレッド"))?.quantity ?? 40;

  let t = tplText;

  // 名前
  t = t.split(tplBp.name).join(newBp.name);
  // 寸法全体
  t = t.split(`${tplBp.dimensions.width}×${tplBp.dimensions.depth}×${tplBp.dimensions.height}`).join(`${newBp.dimensions.width}×${newBp.dimensions.depth}×${newBp.dimensions.height}`);
  // 幅・奥行・高さ個別 (長さ系の描写)
  t = t.split(`${tplBp.dimensions.width}mm`).join(`${newBp.dimensions.width}mm`);
  t = t.split(`${tplBp.dimensions.depth}mm`).join(`${newBp.dimensions.depth}mm`);
  t = t.split(`${tplBp.dimensions.height}mm`).join(`${newBp.dimensions.height}mm`);
  t = t.split(`奥行${tplBp.dimensions.depth}`).join(`奥行${newBp.dimensions.depth}`);
  t = t.split(`座面高${tplBp.dimensions.height}`).join(`座面高${newBp.dimensions.height}`);
  // 脚材長さ
  if (legLenTpl && legLenNew) {
    t = t.split(`${legLenTpl}mm`).join(`${legLenNew}mm`);
  }
  // ビス本数
  if (screwCountTpl !== screwCountNew) {
    t = t.split(`${screwCountTpl}本`).join(`${screwCountNew}本`);
    // 1.25 倍の言及は pills
    const tplPlus = Math.ceil(screwCountTpl * 1.25);
    const newPlus = Math.ceil(screwCountNew * 1.25);
    t = t.split(`${tplPlus}本`).join(`${newPlus}本`);
  }

  return t;
}

/** 屋内/屋外 切替 — 塗装・防腐関連 */
function adjustIndoor(text: string, newBp: FSBlueprint): string {
  const isIndoor = newBp.indoorOutdoor === "室内";
  if (!isIndoor) return text;

  // 屋外想定の文言 → 屋内想定に書き換え (順序が重要)
  return text
    // 段階 1: 屋外特有の文脈を置換
    .replace(/屋外用防腐塗料\(キシラデコール・オスモカラー等\)/g, "室内用木材塗料(ワトコオイル・ブライワックス等)")
    .replace(/屋外用防腐塗料\(キシラデコール等\)/g, "室内用木材塗料(ワトコオイルやブライワックス等)")
    .replace(/屋外用防腐塗料/g, "室内用木材塗料")
    .replace(/キシラデコール等/g, "ワトコオイル等")
    .replace(/ステンレス製ビス推奨。/g, "通常のコーススレッドで可。")
    .replace(/ステンレス製を選ぶ。鉄製は1年で錆びる/g, "通常の鉄ビスで問題ない")
    .replace(/年1回、#240で軽く研磨後に同じ塗料で再塗装することで寿命が10年以上に延びます。/g, "3-5年に1回オイルを塗り直すと長持ちします。")
    .replace(/年1回、#240で軽く研磨後に同じ塗料で再塗装するとベンチ寿命が10年以上延びます。/g, "3-5年に1回オイルを塗り直すとベンチが長持ちします。")
    // 段階 2: 問題になる固有フレーズを文脈込みで置換
    .replace(/屋外なら風の少ない日を選ぶ。ビスを落としても見つけやすいようブルーシートは薄色を選ぶ/g, "室内で作業する場合は掃除がしやすいようブルーシートは薄色を選ぶと木くずが見えやすい")
    .replace(/風の強い日は屋外作業を避ける。軽い幕板が動いて直角が狂う/g, "作業台が不安定だと直角が狂う。ガタつきがないか確認してから始める")
    .replace(/室内で切断・研磨すると木粉が家中に舞う。必ず換気の効くガレージか屋外で行う/g, "切断・研磨は木粉が大量に出る。換気の効くベランダやガレージで行い、終わったら掃除機で即回収")
    .replace(/屋内で作業するとサンディング時の粉塵が大量に出る。必ず屋外か換気の効くガレージで行う/g, "サンディング時の粉塵が大量に出る。ベランダやガレージなど換気できる場所で行う")
    .replace(/直射日光下で塗ると表面だけ乾いて内部が半乾きになる。日陰か曇天を狙う/g, "暖房直風で乾かすと表面だけ乾いて内部が半乾きになる。自然乾燥を待つ")
    .replace(/乾燥前に雨に当たると塗膜が流れる。乾燥時間24時間は必守/g, "乾燥前に触ると指紋や埃が付く。乾燥時間24時間は必守")
    .replace(/乾燥前に雨に当たると塗膜が流れる。天気予報を確認してから塗装/g, "乾燥中は埃の少ない場所に置く。扇風機の近くなどは避ける")
    .replace(/屋外設置のためステンレス製ビス推奨。/g, "")
    .replace(/屋外用ベンチなのに防腐塗料を後回しにすると雨で膨張して歪む。用意を忘れずに/g, "塗料工程を省略すると手汗やこぼれで染みになる。木肌保護のため必ずオイル仕上げする")
    .replace(/室内用ベンチなのに保護塗料を後回しにすると雨で膨張して歪む。用意を忘れずに/g, "塗料工程を省略すると手汗やこぼれで染みになる。木肌保護のため必ずオイル仕上げする")
    .replace(/屋外使用の場合は年1回、#240で軽く研磨後に同じ塗料で再塗装すると/g, "3-5年に1回、オイルを塗り直すと")
    .replace(/芝や土の上に置く場合はレンガやブロックで脚を浮かせると腐食しにくくなります/g, "フローリングに置く場合は脚底にフェルトパッドを貼ると床を傷つけない")
    .replace(/設置場所の地面が芝や土の場合、レンガやコンクリートブロックを敷いて脚を浮かせると腐食しにくい/g, "フローリング直置きの場合は脚底にフェルトパッドを貼ると床を傷つけない")
    .replace(/屋外放置でメンテしないと2-3年で塗膜が剥がれて腐食が始まる。年1回の塗り直しが寿命の鍵/g, "長年使うとオイルが抜けてカサついてくる。3-5年に1回の塗り直しで風合いを保てる")
    .replace(/2-3年放置すると塗膜が剥がれて腐食開始。年1回の塗り直しが寿命の鍵/g, "長く使うとオイルが抜けてくる。3-5年で塗り直しを検討")
    .replace(/芝生の上に直置きすると脚底が常に湿気る。ブロックで浮かせるのが屋外DIYの定石/g, "フローリングに直置きすると脚底で床が傷つく。フェルトパッドが必須")
    // 段階 3: 残りの単純置換 (最後に実行)
    .replace(/屋外/g, "室内")
    .replace(/腐食/g, "劣化")
    .replace(/防腐/g, "保護");
}

function adaptBlueprint(tpl: { bp: FSBlueprint; enriched: any }, newBp: FSBlueprint): any {
  const rawJson = JSON.stringify(tpl.enriched);
  let adapted = adapt(rawJson, tpl.bp, newBp);
  adapted = adjustIndoor(adapted, newBp);

  const result = JSON.parse(adapted);
  result.useCaseID = newBp.useCaseID;
  result.name = newBp.name;
  result.dimensions = newBp.dimensions;
  result.originalStepCount = newBp.steps.length;
  result.generatedAt = new Date().toISOString();
  result.generatedBy = "claude-opus-4-7-template-adapted";
  return result;
}

/**
 * bench-1 → bench-11, bench-12, bench-13 (標準サイズ 両用)
 * bench-2 → bench-5, bench-7, bench-8, bench-9 (屋外)
 * bench-1 → bench-6, bench-14 (小さめ 両用)
 * bench-1 (indoor flavor) → bench-10 (室内 子供用)
 */
const BENCH_ADAPTATIONS: Array<{ tplId: string; targetIds: string[] }> = [
  { tplId: "bench-1", targetIds: ["bench-6", "bench-11", "bench-12", "bench-13", "bench-14"] },
  { tplId: "bench-2", targetIds: ["bench-5", "bench-7", "bench-8", "bench-9"] },
  { tplId: "bench-1", targetIds: ["bench-10"] },
];

async function main() {
  for (const batch of BENCH_ADAPTATIONS) {
    const tplBp = loadRaw(batch.tplId);
    const tplEnriched = loadEnriched(batch.tplId);
    if (!tplEnriched) {
      console.error(`template enriched not found: ${batch.tplId}`);
      continue;
    }
    for (const tid of batch.targetIds) {
      const newBp = loadRaw(tid);
      const adapted = adaptBlueprint({ bp: tplBp, enriched: tplEnriched }, newBp);
      fs.writeFileSync(path.join(OUT_DIR, `${tid}.json`), JSON.stringify(adapted, null, 2));
      console.log(`✓ ${tid} (from ${batch.tplId}): ${newBp.dimensions.width}×${newBp.dimensions.depth}×${newBp.dimensions.height}, ${newBp.indoorOutdoor}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
