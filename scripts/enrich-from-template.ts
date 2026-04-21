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
 * 文字列置換で寸法・名前・部材仕様を新しい use case に合わせる。
 *
 * 戦略:
 *   1) 全 parts の spec (例 "19×280×1800mm") を部材名でマッチして置換
 *   2) 個数違いも置換
 *   3) 部材の通称 (1×10材 ↔ 1×8材 など) を spec から推定して置換
 *   4) その他の寸法数値 (奥行、幅、長さ) を個別置換
 */
function adapt(tplText: string, tplBp: FSBlueprint, newBp: FSBlueprint): string {
  let t = tplText;

  // 1) 名前の置換 (最優先: 他の置換より先に実行)
  t = t.split(tplBp.name).join(newBp.name);

  // 2) 部材仕様の置換 — 部材名プレフィックスで対応づけ
  //    (例: "側板" → "側板" 同士、spec の違いだけ置換)
  for (const tplPart of tplBp.parts) {
    const newPart = newBp.parts.find(
      (p) => extractPartKey(p.name) === extractPartKey(tplPart.name)
    );
    if (!newPart) continue;
    // spec フル置換 (例 "19×280×1800mm" → "19×150×1800mm")
    if (tplPart.spec !== newPart.spec) {
      t = t.split(tplPart.spec).join(newPart.spec);
    }
    // 個数・単位の置換 (例 "×48本" → "×56本")
    if (tplPart.quantity !== newPart.quantity || tplPart.unit !== newPart.unit) {
      const tplCountStr = `×${tplPart.quantity}${tplPart.unit}`;
      const newCountStr = `×${newPart.quantity}${newPart.unit}`;
      t = t.split(tplCountStr).join(newCountStr);
    }
  }

  // 3) SPF 材の通称 (厚みから推定)
  //    1×4材(19×89), 1×6材(19×140), 1×8材(19×184), 1×10材(19×235)
  //    ※ bookshelf では spec の中間値(幅)が 150/200/250/280/300/600 と雑多なので、
  //      template と target で使っている通称が違えば substitute
  const tplSpfName = findSpfTypename(tplBp);
  const newSpfName = findSpfTypename(newBp);
  if (tplSpfName && newSpfName && tplSpfName !== newSpfName) {
    t = t.split(tplSpfName).join(newSpfName);
  }

  // 4) ビス本数の置換 (パーツ名が同じ "コーススレッド" でも長さ違いがあり得るので別途)
  const screwTpl = tplBp.parts.find((p) => p.name.includes("コーススレッド"));
  const screwNew = newBp.parts.find((p) => p.name.includes("コーススレッド"));
  if (screwTpl && screwNew && screwTpl.quantity !== screwNew.quantity) {
    const tplPlus = Math.ceil(screwTpl.quantity * 1.25);
    const newPlus = Math.ceil(screwNew.quantity * 1.25);
    t = t.split(`${tplPlus}本`).join(`${newPlus}本`);
  }

  // 5) 全体寸法の置換
  t = t.split(`${tplBp.dimensions.width}×${tplBp.dimensions.depth}×${tplBp.dimensions.height}`).join(`${newBp.dimensions.width}×${newBp.dimensions.depth}×${newBp.dimensions.height}`);

  // 6) 個別寸法 (奥行・座面高・高さ・幅を文脈付きで)
  const dimSubs: Array<[string, string]> = [
    [`奥行${tplBp.dimensions.depth}`, `奥行${newBp.dimensions.depth}`],
    [`座面高${tplBp.dimensions.height}`, `座面高${newBp.dimensions.height}`],
    [`高さ${tplBp.dimensions.height}`, `高さ${newBp.dimensions.height}`],
    [`幅${tplBp.dimensions.width}`, `幅${newBp.dimensions.width}`],
  ];
  for (const [from, to] of dimSubs) {
    if (from !== to) t = t.split(from).join(to);
  }

  // 7) 裸の "N mm" 形式 (頻出寸法 — width/depth/height) も置換
  //    spec 置換で大半は済んでいるが、"1800mm" のような文中引用向け
  const bareDimSubs: Array<[number, number]> = [
    [tplBp.dimensions.width, newBp.dimensions.width],
    [tplBp.dimensions.depth, newBp.dimensions.depth],
    [tplBp.dimensions.height, newBp.dimensions.height],
  ];
  for (const [from, to] of bareDimSubs) {
    if (from !== to) {
      // "(N)mm" で囲まれたパターンを置換 (spec 内の "×N×" は既に置換済み)
      t = t.split(`(${from}mm)`).join(`(${to}mm)`);
      t = t.split(`${from}mm)`).join(`${to}mm)`);
    }
  }

  return t;
}

/** 部材名から共通キーを抽出 (例 "側板（SPF 1×10材）" → "側板") */
function extractPartKey(name: string): string {
  const m = name.match(/^([^\(（]+)/);
  return m ? m[1].trim() : name.trim();
}

/** SPF 通称名を推定 ("1×8材", "1×10材" など) */
function findSpfTypename(bp: FSBlueprint): string | null {
  for (const p of bp.parts) {
    const m = p.name.match(/1×(\d+)材/);
    if (m) return `1×${m[1]}材`;
  }
  return null;
}

/** 室内テンプレートから屋外用へ変換 (shoe-rack-1 (室内) → storage-* (屋外) など) */
function adjustOutdoor(text: string, tplBp: FSBlueprint, newBp: FSBlueprint): string {
  if (tplBp.indoorOutdoor !== "室内" || newBp.indoorOutdoor !== "屋外") return text;
  return text
    .replace(/室内用木材塗料\(ワトコオイル・ブライワックス等\)/g, "屋外用防腐塗料(キシラデコール・オスモカラー等)")
    .replace(/室内用木材塗料\(ワトコオイルやブライワックス等\)/g, "屋外用防腐塗料(キシラデコール等)")
    .replace(/ワトコオイルやブライワックス/g, "キシラデコールやオスモカラー")
    .replace(/ワトコオイル・ブライワックス/g, "キシラデコール・オスモカラー")
    .replace(/ワトコオイル/g, "キシラデコール")
    .replace(/ブライワックス/g, "オスモカラー")
    .replace(/室内用木材塗料/g, "屋外用防腐塗料")
    .replace(/通常のコーススレッド/g, "ステンレス製コーススレッド")
    .replace(/通常の鉄ビスで問題ない/g, "ステンレス製ビスを使わないと1年で錆びる")
    .replace(/3-5年に1回オイルを塗り直すと長持ちします。/g, "年1回、#240で軽く研磨後に再塗装することで寿命が10年以上に延びます。")
    .replace(/3-5年に1回オイルを塗り直すと長持ちします/g, "年1回、#240で軽く研磨後に再塗装すると長持ちします")
    .replace(/フローリングに置く場合は脚底にフェルトパッドを貼ると床を傷つけない/g, "芝や土の上に置く場合はレンガやブロックで脚を浮かせると腐食しにくくなります")
    .replace(/フローリング直置きの場合は脚底にフェルトパッドを貼ると床を傷つけない/g, "芝や土の上に置く場合はレンガやブロックで脚を浮かせると腐食しにくくなります")
    .replace(/塗料工程を省略すると手汗やこぼれで染みになる。木肌保護のため必ずオイル仕上げする/g, "防腐塗料を後回しにすると雨で膨張して歪む。用意を忘れずに")
    .replace(/フローリング/g, "地面")
    .replace(/玄関は水気が多いので、撥水性のゴムパッドがお勧め/g, "地面に直置きする場合はレンガかブロックで10cm浮かせる")
    .replace(/玄関タイル/g, "ウッドデッキや土の上")
    .replace(/玄関スペース/g, "設置スペース")
    .replace(/玄関ドアを開けた時の扇状範囲/g, "雨樋の真下や排水溝")
    .replace(/玄関マットで十分乾かしてから収納/g, "布で水気を拭き取ってから収納")
    .replace(/玄関/g, "屋外設置場所")
    .replace(/室内/g, "屋外")
    .replace(/保護/g, "防腐");
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
  adapted = adjustOutdoor(adapted, tpl.bp, newBp);
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
 * 各 templateID ごとに golden を選び、同 family の variants を自動生成。
 */
const ADAPTATIONS: Array<{ tplId: string; targetIds: string[] }> = [
  // bench family
  { tplId: "bench-1", targetIds: ["bench-6", "bench-10", "bench-11", "bench-12", "bench-13", "bench-14"] },
  { tplId: "bench-2", targetIds: ["bench-5", "bench-7", "bench-8", "bench-9"] },
  // bookshelf family
  { tplId: "bookshelf-1", targetIds: ["bookshelf-2", "bookshelf-3", "bookshelf-4", "bookshelf-5", "bookshelf-6", "bookshelf-7", "bookshelf-8", "bookshelf-9", "bookshelf-10"] },
  // shelf family — 同じ "側板+棚板+背板+L字金具" 構造
  { tplId: "bookshelf-1", targetIds: Array.from({ length: 20 }, (_, i) => `shelf-${i + 1}`) },
  // hanger family — 同じ構造 (ハンガーパイプ無しで棚板のみ、raw data 準拠)
  { tplId: "bookshelf-1", targetIds: Array.from({ length: 10 }, (_, i) => `hanger-${i + 1}`) },
  // tv-stand family — ラワン合板 18mm の箱体構造
  { tplId: "tv-stand-1", targetIds: Array.from({ length: 9 }, (_, i) => `tv-stand-${i + 2}`) },
  // desk family — 同じ合板箱体 (desk-1 も tv-stand-1 から生成)
  { tplId: "tv-stand-1", targetIds: Array.from({ length: 15 }, (_, i) => `desk-${i + 1}`) },
  // shoe-rack family — 杉板+2×4 コーナー支柱の箱体構造
  { tplId: "shoe-rack-1", targetIds: Array.from({ length: 9 }, (_, i) => `shoe-rack-${i + 2}`) },
  // storage family (plank-box 型) — shoe-rack-1 流用
  { tplId: "shoe-rack-1", targetIds: ["storage-1", "storage-2", "storage-3", "storage-4", "storage-7", "storage-9"] },
  // storage family (bookshelf 型) — bookshelf-1 流用
  { tplId: "bookshelf-1", targetIds: ["storage-5", "storage-8", "storage-10"] },
  // pet-storage family (bookshelf 型) — pet-storage-4 は除外 (bench-4 流用)
  { tplId: "bookshelf-1", targetIds: ["pet-storage-1", "pet-storage-2", "pet-storage-3", "pet-storage-5"] },
  // pet-storage-4 は収納ベンチ (蓋付き) なので bench-4 テンプレで生成
  { tplId: "bench-4", targetIds: ["pet-storage-4"] },
  // dining family — 全て 天板 2×6 + 脚 2×4 + 幕板 テーブル構造
  { tplId: "dining-1", targetIds: Array.from({ length: 9 }, (_, i) => `dining-${i + 2}`) },
  // garden-table family — 同じ構造 (屋外)
  { tplId: "dining-1", targetIds: Array.from({ length: 10 }, (_, i) => `garden-table-${i + 1}`) },
  // kids テーブル系 (table-like) — dining-1 流用
  { tplId: "dining-1", targetIds: ["kids-1", "kids-2", "kids-4", "kids-6", "kids-9", "kids-10"] },
  // kids plank-box 系 — shoe-rack-1 流用
  { tplId: "shoe-rack-1", targetIds: ["kids-3", "kids-5", "kids-8"] },
  // kids-7 は棚 — bookshelf-1 流用
  { tplId: "bookshelf-1", targetIds: ["kids-7"] },
  // flower-box family — 1×6 薄板箱体構造
  { tplId: "flower-box-1", targetIds: Array.from({ length: 9 }, (_, i) => `flower-box-${i + 2}`) },
  // cat-tower family — 麻ロープ+台板
  { tplId: "cat-tower-1", targetIds: Array.from({ length: 9 }, (_, i) => `cat-tower-${i + 2}`) },
  // cat-walk family — cat-tower と同構造
  { tplId: "cat-tower-1", targetIds: Array.from({ length: 10 }, (_, i) => `cat-walk-${i + 1}`) },
  // fence family — 支柱+横桟+板材
  { tplId: "fence-1", targetIds: Array.from({ length: 9 }, (_, i) => `fence-${i + 2}`) },
  // wood-deck family — デッキ材+根太+大引き+束石
  { tplId: "wood-deck-1", targetIds: Array.from({ length: 9 }, (_, i) => `wood-deck-${i + 2}`) },
  // storage-6 (自転車置き場) — wood-deck 構造
  { tplId: "wood-deck-1", targetIds: ["storage-6"] },
  // sign family — 看板板+補強桟
  { tplId: "sign-1", targetIds: Array.from({ length: 4 }, (_, i) => `sign-${i + 2}`) },
  // dog-house family — 杉板+2×4 post (屋外)
  { tplId: "shoe-rack-1", targetIds: Array.from({ length: 10 }, (_, i) => `dog-house-${i + 1}`) },
  // planter family — 杉板+2×4 post (両用/屋外)
  { tplId: "shoe-rack-1", targetIds: Array.from({ length: 10 }, (_, i) => `planter-${i + 1}`) },
  // entrance family 混合
  { tplId: "shoe-rack-1", targetIds: ["entrance-1", "entrance-2", "entrance-3"] },
  { tplId: "dining-1", targetIds: ["entrance-4"] },
  { tplId: "bookshelf-1", targetIds: ["entrance-5", "entrance-6", "entrance-7", "entrance-8"] },
];

async function main() {
  for (const batch of ADAPTATIONS) {
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
