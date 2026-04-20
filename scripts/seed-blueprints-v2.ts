/**
 * seed-blueprints-v2.ts
 * Firestore blueprints コレクションに 223 件を一括投入するスクリプト
 * Run: npx ts-node --project tsconfig.seed.json scripts/seed-blueprints-v2.ts
 */
import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

// ── Firebase 初期化 ────────────────────────────────────────────
const svcPath = path.resolve(__dirname, "../serviceAccountKey.json");
if (!fs.existsSync(svcPath)) {
  console.error("serviceAccountKey.json が見つかりません:", svcPath);
  process.exit(1);
}
admin.initializeApp({ credential: admin.credential.cert(svcPath) });
const db = admin.firestore();

// ── IllType 定義（iOS StepIllustrationView と対応） ─────────────
type IllType =
  | "measure" | "markLine" | "cut" | "sand" | "drill"
  | "foundation" | "levelCheck" | "topBoard" | "frame"
  | "wallMount" | "waterproof" | "paint" | "inspect"
  | "screw" | "complete";

// ── データ型 ──────────────────────────────────────────────────
interface Step { order: number; title: string; description: string; illustrationType: IllType }
interface Part { name: string; spec: string; quantity: number; unit: string; note?: string }
interface CutItem { partName: string; thickness: number; width: number; length: number; quantity: number }
interface Tool { name: string; note: string }
interface Blueprint {
  useCaseID: string; templateID: string; name: string; category: string;
  indoorOutdoor: string;
  dimensions: { width: number; depth: number; height: number };
  warnings: string[]; tools: Tool[];
  steps: Step[]; parts: Part[]; cutItems: CutItem[];
}

// ── useCase カタログ（223件） ──────────────────────────────────
// [id, name, category, templateID, indoorOutdoor, w, d, h]
type UCRow = [string, string, string, string, string, number, number, number];

const CATALOG: UCRow[] = [
  // ── 棚 (20) ──────────────────────────────────────────────
  ["shelf-1",  "シンプル壁面棚",         "棚", "tpl-shelf-basic", "室内",  900, 200, 1200],
  ["shelf-2",  "オープン収納棚",          "棚", "tpl-shelf-basic", "室内", 1200, 300, 1800],
  ["shelf-3",  "キッチン吊り棚",          "棚", "tpl-shelf-basic", "室内",  800, 250,  300],
  ["shelf-4",  "ディアウォール棚",        "棚", "tpl-shelf-basic", "室内",  600, 200, 2200],
  ["shelf-5",  "L字型コーナー棚",         "棚", "tpl-shelf-basic", "室内",  600, 600,  900],
  ["shelf-6",  "階段下収納棚",            "棚", "tpl-shelf-basic", "室内", 1500, 400,  800],
  ["shelf-7",  "ベッドサイドシェルフ",    "棚", "tpl-shelf-basic", "室内",  300, 200,  600],
  ["shelf-8",  "玄関飾り棚",              "棚", "tpl-shelf-basic", "室内",  800, 180,  400],
  ["shelf-9",  "多段壁面収納",            "棚", "tpl-shelf-basic", "室内", 1200, 300, 2000],
  ["shelf-10", "子供部屋絵本棚",          "棚", "tpl-shelf-basic", "室内",  900, 250,  900],
  ["shelf-11", "キッチンスパイスラック",  "棚", "tpl-shelf-basic", "室内",  500, 120,  350],
  ["shelf-12", "ランドリーラック",        "棚", "tpl-shelf-basic", "室内",  600, 300,  700],
  ["shelf-13", "バスルーム棚",            "棚", "tpl-shelf-basic", "室内",  400, 150,  500],
  ["shelf-14", "ガレージ工具棚",          "棚", "tpl-shelf-basic", "室内", 1800, 400, 1800],
  ["shelf-15", "アンティーク風壁棚",      "棚", "tpl-shelf-basic", "室内", 1000, 230,  600],
  ["shelf-16", "フロートシェルフ",        "棚", "tpl-shelf-basic", "室内",  800, 200,   40],
  ["shelf-17", "作業部屋工具棚",          "棚", "tpl-shelf-basic", "室内", 1500, 400, 2000],
  ["shelf-18", "脱衣所タオル棚",          "棚", "tpl-shelf-basic", "室内",  600, 200,  700],
  ["shelf-19", "店舗ディスプレイ棚",      "棚", "tpl-shelf-basic", "室内", 1800, 350, 1800],
  ["shelf-20", "可動仕切り収納棚",        "棚", "tpl-shelf-basic", "室内", 2400, 400, 2000],

  // ── プランター台 (10) ───────────────────────────────────
  ["planter-1",  "プランタースタンド",             "プランター台", "tpl-planter-stand", "両用",  300, 300, 400],
  ["planter-2",  "ガーデンプランタースタンド",     "プランター台", "tpl-planter-stand", "屋外",  600, 300, 600],
  ["planter-3",  "多段プランターラダー",           "プランター台", "tpl-planter-stand", "両用",  500, 300, 900],
  ["planter-4",  "ミニプランター台",               "プランター台", "tpl-planter-stand", "両用",  200, 200, 200],
  ["planter-5",  "コーナープランター台",           "プランター台", "tpl-planter-stand", "屋外",  400, 400, 500],
  ["planter-6",  "フェンス付きプランタースタンド", "プランター台", "tpl-planter-stand", "屋外",  800, 300, 700],
  ["planter-7",  "ハーブ用プランター棚",           "プランター台", "tpl-planter-stand", "両用",  600, 200, 700],
  ["planter-8",  "バルコニープランター台",         "プランター台", "tpl-planter-stand", "屋外",  900, 200, 450],
  ["planter-9",  "スタッキングプランター台",       "プランター台", "tpl-planter-stand", "両用",  400, 400, 800],
  ["planter-10", "ウッドプランターボックス",       "プランター台", "tpl-planter-stand", "屋外",  600, 300, 300],

  // ── コンポスト (5) ──────────────────────────────────────
  ["compost-1", "木製コンポストボックス",   "コンポスト", "tpl-compost-box", "屋外", 600,  600, 700],
  ["compost-2", "2層式コンポストボックス",  "コンポスト", "tpl-compost-box", "屋外", 900,  500, 700],
  ["compost-3", "ミミズ堆肥コンポスター",   "コンポスト", "tpl-compost-box", "屋外", 450,  450, 600],
  ["compost-4", "コンポスト収納ボックス",   "コンポスト", "tpl-compost-box", "屋外", 500,  500, 650],
  ["compost-5", "大型コンポストボックス",   "コンポスト", "tpl-compost-box", "屋外",1200,  600, 800],

  // ── ベンチ (15) ─────────────────────────────────────────
  ["bench-1",  "シンプルウッドベンチ",  "ベンチ", "tpl-bench", "両用", 1200, 350, 430],
  ["bench-2",  "ガーデンベンチ",        "ベンチ", "tpl-bench", "屋外", 1500, 400, 450],
  ["bench-3",  "背もたれ付きベンチ",    "ベンチ", "tpl-bench", "両用", 1200, 450, 850],
  ["bench-4",  "収納付きベンチ",        "ベンチ", "tpl-bench", "室内", 1200, 400, 450],
  ["bench-5",  "コーナーベンチ",        "ベンチ", "tpl-bench", "屋外", 1500,1500, 450],
  ["bench-6",  "ベンチチェア（小型）",  "ベンチ", "tpl-bench", "両用",  600, 300, 400],
  ["bench-7",  "縁側風ベンチ",          "ベンチ", "tpl-bench", "屋外", 1800, 400, 350],
  ["bench-8",  "バルコニーベンチ",      "ベンチ", "tpl-bench", "屋外", 1000, 350, 430],
  ["bench-9",  "公園風ベンチ",          "ベンチ", "tpl-bench", "屋外", 1800, 500, 450],
  ["bench-10", "子供用ローベンチ",      "ベンチ", "tpl-bench", "室内",  800, 300, 320],
  ["bench-11", "玄関用ベンチ",          "ベンチ", "tpl-bench", "室内",  900, 350, 430],
  ["bench-12", "ピクニックベンチ",      "ベンチ", "tpl-bench", "屋外", 1200, 350, 430],
  ["bench-13", "植木鉢台兼ベンチ",      "ベンチ", "tpl-bench", "屋外", 1400, 450, 430],
  ["bench-14", "折りたたみベンチ",      "ベンチ", "tpl-bench", "両用", 1000, 300, 430],
  ["bench-15", "テラスデイベッド",      "ベンチ", "tpl-bench", "屋外", 2000, 900, 400],

  // ── ガーデンテーブル (10) ────────────────────────────────
  ["garden-table-1",  "ガーデンテーブル",              "ガーデンテーブル", "tpl-garden-table", "屋外", 1200, 700, 720],
  ["garden-table-2",  "ピクニックテーブル（ベンチ一体型）","ガーデンテーブル","tpl-garden-table","屋外",1500, 800, 730],
  ["garden-table-3",  "ラウンドガーデンテーブル",       "ガーデンテーブル", "tpl-garden-table", "屋外",  900, 900, 720],
  ["garden-table-4",  "フォールディングガーデンテーブル","ガーデンテーブル","tpl-garden-table","屋外",  900, 600, 720],
  ["garden-table-5",  "バルコニー小テーブル",           "ガーデンテーブル", "tpl-garden-table", "屋外",  600, 600, 700],
  ["garden-table-6",  "カフェ風ガーデンテーブル",       "ガーデンテーブル", "tpl-garden-table", "屋外",  800, 800, 720],
  ["garden-table-7",  "BBQテーブル",                    "ガーデンテーブル", "tpl-garden-table", "屋外", 1800, 900, 720],
  ["garden-table-8",  "縁台テーブル",                   "ガーデンテーブル", "tpl-garden-table", "屋外", 1200, 600, 350],
  ["garden-table-9",  "六角形ピクニックテーブル",       "ガーデンテーブル", "tpl-garden-table", "屋外", 1500,1500, 730],
  ["garden-table-10", "キャンプ用ロールテーブル",       "ガーデンテーブル", "tpl-garden-table", "屋外",  900, 600, 700],

  // ── シューズラック (10) ──────────────────────────────────
  ["shoe-rack-1",  "玄関シューズラック",         "シューズラック", "tpl-shoe-rack", "室内",  600, 300, 500],
  ["shoe-rack-2",  "大容量シューズボックス",      "シューズラック", "tpl-shoe-rack", "室内", 1200, 350, 900],
  ["shoe-rack-3",  "傘立て付きシューズラック",    "シューズラック", "tpl-shoe-rack", "室内",  700, 300, 900],
  ["shoe-rack-4",  "ベンチ一体型シューズラック",  "シューズラック", "tpl-shoe-rack", "室内",  900, 350, 450],
  ["shoe-rack-5",  "スリムシューズラック",        "シューズラック", "tpl-shoe-rack", "室内",  400, 250, 900],
  ["shoe-rack-6",  "靴磨き台付きシューズラック",  "シューズラック", "tpl-shoe-rack", "室内",  800, 350, 800],
  ["shoe-rack-7",  "スタッキングシューズラック",  "シューズラック", "tpl-shoe-rack", "室内",  600, 300, 700],
  ["shoe-rack-8",  "アウトドアシューズラック",    "シューズラック", "tpl-shoe-rack", "屋外",  900, 350, 600],
  ["shoe-rack-9",  "子供用シューズラック",        "シューズラック", "tpl-shoe-rack", "室内",  500, 250, 400],
  ["shoe-rack-10", "壁掛け玄関収納",              "シューズラック", "tpl-shoe-rack", "室内",  800, 150, 600],

  // ── フラワーボックス (10) ────────────────────────────────
  ["flower-box-1",  "ウィンドウフラワーボックス",       "フラワーボックス", "tpl-flower-box", "屋外",  800, 200, 200],
  ["flower-box-2",  "ガーデンフラワーボックス（長尺）", "フラワーボックス", "tpl-flower-box", "屋外", 1200, 250, 250],
  ["flower-box-3",  "ハンギングフラワーボックス",       "フラワーボックス", "tpl-flower-box", "屋外",  500, 200, 180],
  ["flower-box-4",  "ウォールフラワーポット",           "フラワーボックス", "tpl-flower-box", "屋外",  400, 200, 200],
  ["flower-box-5",  "ミニハーブガーデンボックス",       "フラワーボックス", "tpl-flower-box", "両用",  600, 200, 200],
  ["flower-box-6",  "フェンス取付フラワーボックス",     "フラワーボックス", "tpl-flower-box", "屋外",  600, 180, 200],
  ["flower-box-7",  "木製プランターポット",             "フラワーボックス", "tpl-flower-box", "屋外",  300, 300, 300],
  ["flower-box-8",  "コーナーフラワーボックス",         "フラワーボックス", "tpl-flower-box", "屋外",  350, 350, 250],
  ["flower-box-9",  "バルコニーフラワーボックス",       "フラワーボックス", "tpl-flower-box", "屋外",  900, 200, 200],
  ["flower-box-10", "アンティーク木箱フラワーボックス", "フラワーボックス", "tpl-flower-box", "両用",  500, 300, 250],

  // ── TV台 (10) ──────────────────────────────────────────
  ["tv-stand-1",  "シンプルTV台",         "TV台", "tpl-tv-stand", "室内", 1200, 400, 400],
  ["tv-stand-2",  "収納付きローボード",   "TV台", "tpl-tv-stand", "室内", 1800, 450, 450],
  ["tv-stand-3",  "壁掛け風TV台",         "TV台", "tpl-tv-stand", "室内", 1500, 400, 350],
  ["tv-stand-4",  "引き出し付きTV台",     "TV台", "tpl-tv-stand", "室内", 1200, 450, 450],
  ["tv-stand-5",  "TV台兼本棚",           "TV台", "tpl-tv-stand", "室内", 1800, 400, 1800],
  ["tv-stand-6",  "天然木TV台",           "TV台", "tpl-tv-stand", "室内", 1500, 450, 450],
  ["tv-stand-7",  "アイアン脚TV台",       "TV台", "tpl-tv-stand", "室内", 1200, 400, 400],
  ["tv-stand-8",  "コーナーTV台",         "TV台", "tpl-tv-stand", "室内",  900, 900, 450],
  ["tv-stand-9",  "マルチメディアラック", "TV台", "tpl-tv-stand", "室内",  600, 400, 1800],
  ["tv-stand-10", "リビング収納ボード",   "TV台", "tpl-tv-stand", "室内", 2400, 450, 500],

  // ── ウッドデッキ (10) ───────────────────────────────────
  ["wood-deck-1",  "ミニウッドデッキ",           "ウッドデッキ", "tpl-wood-deck", "屋外",  900, 900, 300],
  ["wood-deck-2",  "ウッドデッキ（大型）",        "ウッドデッキ", "tpl-wood-deck", "屋外", 3600,2400, 300],
  ["wood-deck-3",  "バルコニーウッドデッキ",      "ウッドデッキ", "tpl-wood-deck", "屋外", 1800,1200, 150],
  ["wood-deck-4",  "縁台（縁側デッキ）",          "ウッドデッキ", "tpl-wood-deck", "屋外", 1800, 600, 350],
  ["wood-deck-5",  "アジアン風デッキ",            "ウッドデッキ", "tpl-wood-deck", "屋外", 2400,1800, 250],
  ["wood-deck-6",  "手すり付きウッドデッキ",      "ウッドデッキ", "tpl-wood-deck", "屋外", 2400,1800, 300],
  ["wood-deck-7",  "段差解消デッキ",              "ウッドデッキ", "tpl-wood-deck", "屋外", 1200, 900, 200],
  ["wood-deck-8",  "プールデッキ",                "ウッドデッキ", "tpl-wood-deck", "屋外", 4800,2400, 300],
  ["wood-deck-9",  "テラスデッキ（屋根なし）",    "ウッドデッキ", "tpl-wood-deck", "屋外", 3000,2400, 300],
  ["wood-deck-10", "ルーフデッキ（屋上）",        "ウッドデッキ", "tpl-wood-deck", "屋外", 3600,3600, 100],

  // ── キャットウォーク (10) ───────────────────────────────
  ["cat-walk-1",  "壁付けキャットステップ",       "キャットウォーク", "tpl-cat-walk", "室内",  400, 250, 200],
  ["cat-walk-2",  "キャットタワー一体型ウォーク", "キャットウォーク", "tpl-cat-walk", "室内",  600, 400,1800],
  ["cat-walk-3",  "棚板式キャットウォーク",       "キャットウォーク", "tpl-cat-walk", "室内",  500, 250, 200],
  ["cat-walk-4",  "コーナーキャットシェルフ",     "キャットウォーク", "tpl-cat-walk", "室内",  400, 400, 200],
  ["cat-walk-5",  "猫用隠れ家付きウォーク",       "キャットウォーク", "tpl-cat-walk", "室内",  600, 400, 400],
  ["cat-walk-6",  "吊り橋式キャットウォーク",     "キャットウォーク", "tpl-cat-walk", "室内",  900, 200, 100],
  ["cat-walk-7",  "ミニキャットウォーク",         "キャットウォーク", "tpl-cat-walk", "室内",  350, 200, 200],
  ["cat-walk-8",  "猫用はしご",                   "キャットウォーク", "tpl-cat-walk", "室内",  300, 200,1200],
  ["cat-walk-9",  "猫用窓辺ベッド",               "キャットウォーク", "tpl-cat-walk", "室内",  600, 400, 200],
  ["cat-walk-10", "窓際キャットステップ",         "キャットウォーク", "tpl-cat-walk", "室内",  450, 250, 200],

  // ── 犬小屋 (10) ─────────────────────────────────────────
  ["dog-house-1",  "小型犬用木製犬小屋",         "犬小屋", "tpl-compost-box", "屋外",  600,  500, 600],
  ["dog-house-2",  "中型犬用犬小屋",             "犬小屋", "tpl-compost-box", "屋外",  800,  700, 750],
  ["dog-house-3",  "大型犬用犬小屋",             "犬小屋", "tpl-compost-box", "屋外", 1000,  900, 900],
  ["dog-house-4",  "屋根付き高床式犬小屋",       "犬小屋", "tpl-compost-box", "屋外",  800,  700, 900],
  ["dog-house-5",  "ドア付き犬小屋",             "犬小屋", "tpl-compost-box", "屋外",  750,  650, 700],
  ["dog-house-6",  "断熱ペットハウス",           "犬小屋", "tpl-compost-box", "屋外",  700,  600, 700],
  ["dog-house-7",  "縁側付き犬小屋",             "犬小屋", "tpl-compost-box", "屋外", 1200,  700, 750],
  ["dog-house-8",  "ミニチュアハウス型犬小屋",   "犬小屋", "tpl-compost-box", "屋外",  700,  600, 800],
  ["dog-house-9",  "折りたたみ犬用ケージカバー", "犬小屋", "tpl-compost-box", "室内",  900,  600, 700],
  ["dog-house-10", "犬用ウッドデッキ付き犬小屋", "犬小屋", "tpl-compost-box", "屋外", 1500,  800, 800],

  // ── キャットタワー (10) ──────────────────────────────────
  ["cat-tower-1",  "シンプルキャットタワー",     "キャットタワー", "tpl-cat-walk", "室内",  450, 450,1200],
  ["cat-tower-2",  "3段キャットタワー",          "キャットタワー", "tpl-cat-walk", "室内",  500, 500,1500],
  ["cat-tower-3",  "据え置き型キャットタワー",   "キャットタワー", "tpl-cat-walk", "室内",  600, 600,1600],
  ["cat-tower-4",  "壁面一体型キャットタワー",   "キャットタワー", "tpl-cat-walk", "室内",  400, 300,1800],
  ["cat-tower-5",  "ハンモック付きキャットタワー","キャットタワー","tpl-cat-walk", "室内",  600, 600,1400],
  ["cat-tower-6",  "隠れ家付きキャットタワー",   "キャットタワー", "tpl-cat-walk", "室内",  600, 600,1500],
  ["cat-tower-7",  "多頭飼い用キャットタワー",   "キャットタワー", "tpl-cat-walk", "室内",  900, 600,1800],
  ["cat-tower-8",  "スリムキャットタワー",       "キャットタワー", "tpl-cat-walk", "室内",  350, 350,1500],
  ["cat-tower-9",  "猫用ジャングルジム",         "キャットタワー", "tpl-cat-walk", "室内",  900, 900,1200],
  ["cat-tower-10", "突っ張り式キャットタワー",   "キャットタワー", "tpl-cat-walk", "室内",  400, 400,2200],

  // ── ペット用収納 (5) ────────────────────────────────────
  ["pet-storage-1", "猫砂ボックス収納キャビネット", "ペット用収納", "tpl-shoe-rack", "室内",  600, 500, 700],
  ["pet-storage-2", "ペットフード収納棚",           "ペット用収納", "tpl-shoe-rack", "室内",  500, 350, 800],
  ["pet-storage-3", "ペット用おもちゃ収納ボックス", "ペット用収納", "tpl-shoe-rack", "室内",  450, 350, 400],
  ["pet-storage-4", "ペットベッド付き収納ベンチ",   "ペット用収納", "tpl-bench",     "室内",  900, 400, 450],
  ["pet-storage-5", "ペット用品ラック",             "ペット用収納", "tpl-shoe-rack", "室内",  600, 300, 1200],

  // ── ダイニングテーブル (10) ──────────────────────────────
  ["dining-1",  "シンプルダイニングテーブル",            "ダイニングテーブル", "tpl-garden-table", "室内", 1200, 700, 720],
  ["dining-2",  "4人掛けダイニングテーブル",             "ダイニングテーブル", "tpl-garden-table", "室内", 1400, 800, 720],
  ["dining-3",  "6人掛けダイニングテーブル",             "ダイニングテーブル", "tpl-garden-table", "室内", 1800, 900, 720],
  ["dining-4",  "折りたたみダイニングテーブル",          "ダイニングテーブル", "tpl-garden-table", "室内", 1000, 700, 720],
  ["dining-5",  "無垢材ダイニングテーブル",              "ダイニングテーブル", "tpl-garden-table", "室内", 1600, 800, 720],
  ["dining-6",  "カフェ風ダイニングテーブル",            "ダイニングテーブル", "tpl-garden-table", "室内",  800, 700, 720],
  ["dining-7",  "コンパクトダイニングテーブル",          "ダイニングテーブル", "tpl-garden-table", "室内",  900, 600, 720],
  ["dining-8",  "丸型ダイニングテーブル",                "ダイニングテーブル", "tpl-garden-table", "室内",  900, 900, 720],
  ["dining-9",  "ハイテーブル（バーカウンター）",        "ダイニングテーブル", "tpl-garden-table", "室内", 1200, 400, 1000],
  ["dining-10", "子供用ローダイニングテーブル",          "ダイニングテーブル", "tpl-garden-table", "室内",  900, 600, 400],

  // ── デスク・作業台 (15) ──────────────────────────────────
  ["desk-1",  "シンプルデスク",                 "デスク・作業台", "tpl-tv-stand", "室内", 1200, 600, 720],
  ["desk-2",  "L字型デスク",                    "デスク・作業台", "tpl-tv-stand", "室内", 1400, 700, 720],
  ["desk-3",  "ガレージ用作業台",               "デスク・作業台", "tpl-tv-stand", "室内", 1800, 700, 850],
  ["desk-4",  "スタンディングデスク",           "デスク・作業台", "tpl-tv-stand", "室内", 1200, 600, 1000],
  ["desk-5",  "引き出し付きデスク",             "デスク・作業台", "tpl-tv-stand", "室内", 1200, 600, 720],
  ["desk-6",  "棚付きデスク",                   "デスク・作業台", "tpl-tv-stand", "室内", 1200, 600, 1400],
  ["desk-7",  "DIY作業台",                      "デスク・作業台", "tpl-tv-stand", "室内", 1800, 800, 850],
  ["desk-8",  "キッチン作業台",                 "デスク・作業台", "tpl-tv-stand", "室内",  900, 600, 850],
  ["desk-9",  "パソコンデスク",                 "デスク・作業台", "tpl-tv-stand", "室内", 1000, 600, 720],
  ["desk-10", "子供用学習デスク",               "デスク・作業台", "tpl-tv-stand", "室内",  900, 500, 700],
  ["desk-11", "在宅勤務デスク（仕切り付き）",   "デスク・作業台", "tpl-tv-stand", "室内", 1400, 700, 720],
  ["desk-12", "ソーイングデスク",               "デスク・作業台", "tpl-tv-stand", "室内", 1000, 600, 720],
  ["desk-13", "アート作業台",                   "デスク・作業台", "tpl-tv-stand", "室内", 1200, 700, 720],
  ["desk-14", "2段デスク（ロフトタイプ）",      "デスク・作業台", "tpl-tv-stand", "室内", 1200, 600, 1800],
  ["desk-15", "折りたたみ壁掛けデスク",         "デスク・作業台", "tpl-tv-stand", "室内",  800, 500, 720],

  // ── 本棚 (10) ──────────────────────────────────────────
  ["bookshelf-1",  "シンプル本棚",       "本棚", "tpl-shelf-basic", "室内",  600, 280, 1800],
  ["bookshelf-2",  "大型本棚",           "本棚", "tpl-shelf-basic", "室内", 1200, 300, 2100],
  ["bookshelf-3",  "文庫本棚（スリム）", "本棚", "tpl-shelf-basic", "室内",  400, 150, 1800],
  ["bookshelf-4",  "壁面一体本棚",       "本棚", "tpl-shelf-basic", "室内", 2400, 300, 2400],
  ["bookshelf-5",  "漫画本棚",           "本棚", "tpl-shelf-basic", "室内",  600, 200, 1800],
  ["bookshelf-6",  "絵本棚（子供用）",   "本棚", "tpl-shelf-basic", "室内",  900, 250,  900],
  ["bookshelf-7",  "スリム本棚",         "本棚", "tpl-shelf-basic", "室内",  300, 200, 1800],
  ["bookshelf-8",  "コーナー本棚",       "本棚", "tpl-shelf-basic", "室内",  600, 600, 1800],
  ["bookshelf-9",  "マガジンラック",     "本棚", "tpl-shelf-basic", "室内",  400, 200,  900],
  ["bookshelf-10", "飾り棚一体型本棚",   "本棚", "tpl-shelf-basic", "室内", 1200, 300, 1800],

  // ── ハンガーラック (10) ──────────────────────────────────
  ["hanger-1",  "シンプルハンガーラック",         "ハンガーラック", "tpl-shelf-basic", "室内",  900, 400, 1600],
  ["hanger-2",  "2段ハンガーラック",              "ハンガーラック", "tpl-shelf-basic", "室内", 1000, 400, 1700],
  ["hanger-3",  "壁付けハンガーラック",           "ハンガーラック", "tpl-shelf-basic", "室内",  800, 150,  800],
  ["hanger-4",  "シューズ付きハンガーラック",     "ハンガーラック", "tpl-shelf-basic", "室内",  900, 400, 1700],
  ["hanger-5",  "スリムハンガーラック",           "ハンガーラック", "tpl-shelf-basic", "室内",  600, 350, 1600],
  ["hanger-6",  "帽子掛け付きハンガーラック",     "ハンガーラック", "tpl-shelf-basic", "室内",  900, 400, 1700],
  ["hanger-7",  "子供用ハンガーラック",           "ハンガーラック", "tpl-shelf-basic", "室内",  700, 350, 1200],
  ["hanger-8",  "クローゼット追加ハンガー",       "ハンガーラック", "tpl-shelf-basic", "室内",  600, 300,  500],
  ["hanger-9",  "突っ張りハンガーラック",         "ハンガーラック", "tpl-shelf-basic", "室内",  800, 400, 2200],
  ["hanger-10", "ウォークインクローゼット用ラック","ハンガーラック","tpl-shelf-basic", "室内", 1200, 400, 1800],

  // ── 子供用家具 (10) ──────────────────────────────────────
  ["kids-1",  "子供用ローテーブル",         "子供用家具", "tpl-garden-table", "室内",  800, 600, 400],
  ["kids-2",  "キッズチェア",               "子供用家具", "tpl-bench",        "室内",  350, 300, 600],
  ["kids-3",  "砂場ボックス",               "子供用家具", "tpl-compost-box",  "屋外", 1200,1200, 300],
  ["kids-4",  "ブランコ",                   "子供用家具", "tpl-bench",        "屋外",  600, 400,1500],
  ["kids-5",  "秘密基地（プレイハウス）",   "子供用家具", "tpl-compost-box",  "屋外", 1200,1000,1500],
  ["kids-6",  "子供用ベッドフレーム",       "子供用家具", "tpl-bench",        "室内", 2000, 900, 800],
  ["kids-7",  "キッズ棚",                   "子供用家具", "tpl-shelf-basic",  "室内",  800, 250, 900],
  ["kids-8",  "子供用おもちゃ箱",           "子供用家具", "tpl-compost-box",  "室内",  600, 400, 500],
  ["kids-9",  "キッズ用工作台",             "子供用家具", "tpl-tv-stand",     "室内",  900, 600, 600],
  ["kids-10", "キャンプ用キッズチェア",     "子供用家具", "tpl-bench",        "屋外",  350, 300, 550],

  // ── 物置・収納 (10) ─────────────────────────────────────
  ["storage-1",  "木製物置（小型）",        "物置・収納", "tpl-compost-box", "屋外", 1200, 900,1800],
  ["storage-2",  "ガーデン収納ボックス",    "物置・収納", "tpl-compost-box", "屋外",  800, 500, 600],
  ["storage-3",  "バルコニー収納ボックス",  "物置・収納", "tpl-compost-box", "屋外",  600, 400, 500],
  ["storage-4",  "工具収納ボックス",        "物置・収納", "tpl-compost-box", "室内",  800, 500, 700],
  ["storage-5",  "薪棚",                    "物置・収納", "tpl-shelf-basic", "屋外", 1200, 300, 900],
  ["storage-6",  "自転車置き場（屋根付き）","物置・収納", "tpl-wood-deck",   "屋外", 2400,1200,2000],
  ["storage-7",  "BBQ道具収納ボックス",     "物置・収納", "tpl-compost-box", "屋外",  600, 500, 600],
  ["storage-8",  "庭道具収納ラック",        "物置・収納", "tpl-shelf-basic", "屋外",  900, 400,1500],
  ["storage-9",  "物置兼作業台",            "物置・収納", "tpl-compost-box", "屋外", 1800, 900,1800],
  ["storage-10", "灯油缶収納ラック",        "物置・収納", "tpl-shelf-basic", "屋外",  600, 400, 600],

  // ── ガーデンフェンス (10) ────────────────────────────────
  ["fence-1",  "木製目隠しフェンス",       "ガーデンフェンス", "tpl-wood-deck", "屋外", 1800,  90,1800],
  ["fence-2",  "ラティスフェンス",         "ガーデンフェンス", "tpl-wood-deck", "屋外", 1800,  40,1200],
  ["fence-3",  "花壇フェンス",             "ガーデンフェンス", "tpl-wood-deck", "屋外", 1200,  60, 600],
  ["fence-4",  "ガーデンゲート",           "ガーデンフェンス", "tpl-wood-deck", "屋外",  900, 100,1800],
  ["fence-5",  "ピケットフェンス",         "ガーデンフェンス", "tpl-wood-deck", "屋外", 1800,  60, 900],
  ["fence-6",  "低木フェンス（枕木風）",   "ガーデンフェンス", "tpl-wood-deck", "屋外", 1800, 150, 600],
  ["fence-7",  "バルコニー目隠しパネル",   "ガーデンフェンス", "tpl-wood-deck", "屋外", 1200,  40,1500],
  ["fence-8",  "アジアン風竹フェンス",     "ガーデンフェンス", "tpl-wood-deck", "屋外", 1800,  60,1500],
  ["fence-9",  "犬用ペットフェンス",       "ガーデンフェンス", "tpl-wood-deck", "屋外",  900, 100, 900],
  ["fence-10", "道路境界フェンス（高型）", "ガーデンフェンス", "tpl-wood-deck", "屋外", 1800,  90,2100],

  // ── 玄関収納 (8) ───────────────────────────────────────
  ["entrance-1", "玄関ベンチ付きシューズラック", "玄関収納", "tpl-shoe-rack", "室内",  900, 350, 900],
  ["entrance-2", "傘立て一体型収納",             "玄関収納", "tpl-shoe-rack", "室内",  700, 300, 900],
  ["entrance-3", "玄関飾り台（花台）",           "玄関収納", "tpl-flower-box","室内",  600, 250, 800],
  ["entrance-4", "スツール付き収納",             "玄関収納", "tpl-bench",     "室内",  500, 350, 450],
  ["entrance-5", "玄関コートハンガー",           "玄関収納", "tpl-shelf-basic","室内", 700, 300,1800],
  ["entrance-6", "キーボックス付きラック",       "玄関収納", "tpl-shelf-basic","室内", 500, 200, 600],
  ["entrance-7", "アウトドア用品収納ラック",     "玄関収納", "tpl-shelf-basic","室内", 900, 400,1800],
  ["entrance-8", "ランドセル棚",                 "玄関収納", "tpl-shelf-basic","室内", 800, 350, 900],

  // ── 看板・インテリア (5) ─────────────────────────────────
  ["sign-1", "ウッドサイン看板",        "看板・インテリア", "tpl-flower-box", "両用",  600, 25, 300],
  ["sign-2", "ガーデン表札",            "看板・インテリア", "tpl-flower-box", "屋外",  300, 25, 200],
  ["sign-3", "店舗看板（木製）",        "看板・インテリア", "tpl-flower-box", "屋外",  900, 30, 400],
  ["sign-4", "メニューボード",          "看板・インテリア", "tpl-flower-box", "両用",  600, 20, 900],
  ["sign-5", "アンティーク風木製看板",  "看板・インテリア", "tpl-flower-box", "両用",  700, 30, 500],
];

// ── カテゴリ別 Generator ──────────────────────────────────────

// iOS の buildTools(for:) と完全一致させる
function makeTools(category: string, outdoor: boolean): Tool[] {
  const tools: Tool[] = [
    { name: "メジャー（5m以上）",  note: "各部材の採寸に使用" },
    { name: "鉛筆・さしがね",      note: "墨線引き・直角確認" },
    { name: "のこぎり",            note: "ホームセンターのカットサービス利用を推奨" },
    { name: "電動ドライバー",      note: "インパクトドライバーが作業効率UP" },
    { name: "サンドペーパー",      note: "#120・#240の2種を用意" },
    { name: "水平器",              note: "組み立て時の水平確認に必須" },
    { name: "クランプ（2個以上）", note: "接合時の仮固定に使用" },
  ];
  if (outdoor) {
    tools.push({ name: "刷毛・塗料バット", note: "防腐塗料の塗布に使用" });
  } else {
    tools.push({ name: "刷毛・塗料バット", note: "オイル・ニス仕上げに使用" });
  }
  if (category === "ウッドデッキ") {
    tools.push({ name: "水糸・杭",       note: "基準線の設定に使用" });
    tools.push({ name: "スコップ・砕石", note: "整地・砕石敷きに使用" });
  }
  if (category === "キャットウォーク" || category === "キャットタワー") {
    tools.push({ name: "下地センサー", note: "壁の柱・間柱の位置を確認" });
  }
  return tools;
}

function makeWarnings(category: string, outdoor: boolean, name: string): string[] {
  const w: string[] = [];
  if (outdoor) {
    w.push("屋外使用の場合は防腐塗装が必須です（年1回の再塗装推奨）");
    w.push("ステンレスビスを使用してください（鉄ビスは錆びます）");
  }
  w.push("下穴を開けてからビスを打ち、木割れを防いでください");
  if (["ハンガーラック", "壁面一体本棚", "多段壁面収納"].some(s => name.includes(s.replace("多段壁面収納","多段"))) || name.includes("壁")) {
    w.push("壁に固定する場合は必ず間柱を探してください（石膏ボードのみへの固定は不可）");
  }
  if (["キャットタワー", "キャットウォーク", "猫用"].some(s => name.includes(s))) {
    w.push("猫の体重に耐えられるよう、全てのジョイント部分を十分に締めてください");
  }
  if (["犬小屋", "ペットハウス"].some(s => name.includes(s))) {
    w.push("ペットが舐めても安全な塗料を使用してください（水性ウレタン塗料推奨）");
  }
  if (["デッキ", "縁台"].some(s => name.includes(s))) {
    w.push("束石は水平に設置してください（傾くと根太が歪みます）");
  }
  return w;
}

// ── 棚系ジェネレータ ──────────────────────────────────────────
function genShelf(id: string, name: string, w: number, d: number, h: number, outdoor: boolean): Pick<Blueprint, "parts"|"cutItems"|"steps"> {
  const t = 19; // 板厚
  const shelfCount = Math.max(2, Math.floor(h / 300));
  const parts: Part[] = [
    { name: `側板（SPF 1×${d > 230 ? "10" : "8"}材）`, spec: `${t}×${d}×${h}mm`, quantity: 2, unit: "枚" },
    { name: `棚板（SPF 1×${d > 230 ? "10" : "8"}材）`, spec: `${t}×${d}×${w}mm`, quantity: shelfCount, unit: "枚" },
    { name: "背板（ベニヤ 4mm）", spec: `${w}×${h}mm`, quantity: 1, unit: "枚", note: "4mm厚" },
    { name: "コーススレッド 38mm", spec: "38mm", quantity: shelfCount * 8, unit: "本" },
    { name: "L字金具", spec: "50mm", quantity: 4, unit: "個", note: "転倒防止用" },
  ];
  const cutItems: CutItem[] = [
    { partName: "側板", thickness: t, width: d, length: h, quantity: 2 },
    { partName: "棚板", thickness: t, width: d, length: w, quantity: shelfCount },
    { partName: "背板（ベニヤ）", thickness: 4, width: w, length: h, quantity: 1 },
  ];
  const steps: Step[] = [
    { order: 1, title: "寸法確認とカット依頼", description: `側板（${h}mm）・棚板（${w}mm）・背板のカットリストを作成し、ホームセンターのカットサービスに依頼します。カット後は全部材の寸法をメジャーで確認してください。`, illustrationType: "measure" },
    { order: 2, title: "全部材のやすりがけ", description: "#120→#240のサンドペーパーで全面を研磨します。側板の棚受け面と棚板の表面を重点的に磨き、スプリンターを除去します。", illustrationType: "sand" },
    { order: 3, title: "棚板位置のマーキング", description: `側板2枚に棚板（${shelfCount}段）の固定位置を鉛筆でマーキングします。左右の側板が同じ高さになるよう水平器で確認します。`, illustrationType: "markLine" },
    { order: 4, title: "下穴を開ける", description: "マーキング位置にφ3mmドリルで下穴を開けます。ドリルの深さにマスキングテープで目印をつけ、貫通を防ぎます。", illustrationType: "drill" },
    { order: 5, title: "棚板のビス留め", description: `側板外側から棚板の木口に向かってコーススレッド38mmを打ちます。1か所につき2本で固定し（計${shelfCount * 4}本）、棚板がぐらつかないか確認します。`, illustrationType: "screw" },
    { order: 6, title: "背板の取り付け", description: `ベニヤ板（${w}×${h}mm）を背面にあてがい、対角線の長さが同じか確認して直角を出します。タッカーまたは細ビスで全周固定します。`, illustrationType: "frame" },
    { order: 7, title: "転倒防止の壁固定", description: "L字金具を上部に取り付け、壁の間柱に固定します。間柱センサーで間柱位置を確認してから作業します。", illustrationType: "wallMount" },
    { order: 8, title: "仕上げ塗装", description: `${outdoor ? "屋外用防腐塗料を全面に2回塗りします（乾燥時間：各24時間）。" : "オイルステインを刷毛で塗布し、15分後に布で拭き取ります。24時間乾燥させてから使用します。"}`, illustrationType: "paint" },
    { order: 9, title: "完成確認", description: `全棚板の水平を確認し、${name}が正しく組み上がっているか最終チェックします。壁固定がしっかりしているか手で押して確認します。`, illustrationType: "complete" },
  ];
  return { parts, cutItems, steps };
}

// ── ベンチ系ジェネレータ ─────────────────────────────────────
function genBench(id: string, name: string, w: number, d: number, h: number, outdoor: boolean): Pick<Blueprint, "parts"|"cutItems"|"steps"> {
  const hasBack = name.includes("背もたれ") || name.includes("デイベッド");
  const hasStorage = name.includes("収納");
  const legH = h - 38;
  const parts: Part[] = [
    { name: "天板（2×6材）", spec: `38×140×${w}mm`, quantity: name.includes("デイベッド") ? 5 : 2, unit: "枚" },
    { name: "脚材（2×4材）", spec: `38×89×${legH}mm`, quantity: 4, unit: "本" },
    { name: "幕板（2×4材）", spec: `38×89×${w}mm`, quantity: 2, unit: "本" },
  ];
  if (hasBack) {
    parts.push({ name: "背もたれ材（2×4材）", spec: `38×89×${w}mm`, quantity: 2, unit: "本" });
    parts.push({ name: "背もたれ支柱（2×4材）", spec: `38×89×${h + 300}mm`, quantity: 2, unit: "本" });
  }
  if (hasStorage) {
    parts.push({ name: "底板（SPF 1×8材）", spec: `19×184×${w - 76}mm`, quantity: 2, unit: "枚" });
    parts.push({ name: "蓋材（SPF 1×8材）", spec: `19×184×${w}mm`, quantity: 2, unit: "枚" });
    parts.push({ name: "蝶番", spec: "50mm", quantity: 2, unit: "個" });
  }
  parts.push({ name: "コーススレッド 65mm", spec: "65mm", quantity: hasBack ? 60 : 40, unit: "本" });

  const cutItems: CutItem[] = [
    { partName: "天板", thickness: 38, width: 140, length: w, quantity: name.includes("デイベッド") ? 5 : 2 },
    { partName: "脚材", thickness: 38, width: 89, length: legH, quantity: 4 },
    { partName: "幕板", thickness: 38, width: 89, length: w, quantity: 2 },
  ];
  if (hasBack) {
    cutItems.push({ partName: "背もたれ支柱", thickness: 38, width: 89, length: h + 300, quantity: 2 });
    cutItems.push({ partName: "背もたれ材", thickness: 38, width: 89, length: w, quantity: 2 });
  }

  const steps: Step[] = [
    { order: 1, title: "材料のカットとやすりがけ", description: `${name}の各部材を指定寸法にカットします。天板・脚材・幕板をカット後、#120→#240サンドペーパーで全面を研磨します。天板は座面となるため特に丁寧に仕上げます。`, illustrationType: "cut" },
    { order: 2, title: "脚フレームの仮組み（片側）", description: `脚材2本と幕板1本でコの字型フレームを仮組みします。スコヤで直角を確認し、クランプで固定してビス位置を確認します。`, illustrationType: "frame" },
    { order: 3, title: "脚フレームのビス留め", description: `コーススレッド65mmで幕板と脚材を固定します。1か所につき2本を斜め打ちにすると強度が増します。下穴（φ3mm）を忘れずに開けます。`, illustrationType: "screw" },
    { order: 4, title: "反対側フレームの作成", description: "最初に作ったフレームを型紙として、もう片側のフレームを同じ寸法で組み立てます。左右が同寸になるよう注意します。", illustrationType: "measure" },
    { order: 5, title: "左右フレームの連結", description: `2本目の幕板（${w}mm）で左右フレームを連結します。対角線の長さを測り、歪みがないか確認してからビスを打ちます。`, illustrationType: "frame" },
    { order: 6, title: "天板の固定", description: `天板を均等に並べ、クランプで仮固定してからビスを打ちます。天板の端を揃え、間隔を均一に保ちます（5mm程度の隙間を推奨）。`, illustrationType: "topBoard" },
    ...(hasBack ? [
      { order: 7, title: "背もたれの取り付け", description: "背もたれ支柱を後脚に取り付け、背もたれ材を水平に固定します。角度は約100°が使いやすい標準角度です。", illustrationType: "frame" as IllType },
    ] : []),
    { order: hasBack ? 8 : 7, title: "やすりがけと塗装", description: `全体を#240サンドペーパーで仕上げ研磨します。${outdoor ? "屋外用防腐塗料（キシラデコール等）を全面に2回塗りします（乾燥24時間）。" : "オイルステインまたはウレタン塗料で仕上げます。"}`, illustrationType: "paint" },
    { order: hasBack ? 9 : 8, title: "完成確認", description: `${name}を設置場所に置き、水平を確認します。ガタつきがある場合は脚底に高さ調整パッドを貼って対応します。`, illustrationType: "complete" },
  ];
  return { parts, cutItems, steps };
}

// ── テーブル系ジェネレータ ───────────────────────────────────
function genTable(id: string, name: string, w: number, d: number, h: number, outdoor: boolean): Pick<Blueprint, "parts"|"cutItems"|"steps"> {
  const topCount = Math.ceil(w / 140);
  const legH = h - 38;
  const parts: Part[] = [
    { name: "天板（2×6材）", spec: `38×140×${w}mm`, quantity: topCount, unit: "枚" },
    { name: "脚材（2×4材）", spec: `38×89×${legH}mm`, quantity: 4, unit: "本" },
    { name: "幕板（2×4材）", spec: `38×89×${w - 76}mm`, quantity: 2, unit: "本" },
    { name: "幕板（短辺）（2×4材）", spec: `38×89×${d - 76}mm`, quantity: 2, unit: "本" },
    { name: "コーススレッド 75mm", spec: "75mm", quantity: 60, unit: "本" },
  ];
  const cutItems: CutItem[] = [
    { partName: "天板", thickness: 38, width: 140, length: w, quantity: topCount },
    { partName: "脚材", thickness: 38, width: 89, length: legH, quantity: 4 },
    { partName: "幕板（長辺）", thickness: 38, width: 89, length: w - 76, quantity: 2 },
    { partName: "幕板（短辺）", thickness: 38, width: 89, length: d - 76, quantity: 2 },
  ];
  const steps: Step[] = [
    { order: 1, title: "寸法確認とカット", description: `${name}（${w}×${d}×${h}mm）の全部材をカットリストにまとめます。カットサービスを利用して精度の高いカットを依頼します。`, illustrationType: "measure" },
    { order: 2, title: "全部材のやすりがけ", description: "#120→#240サンドペーパーで全面研磨します。特に天板表面は念入りに磨きます。", illustrationType: "sand" },
    { order: 3, title: "脚フレームの組み立て", description: "脚材と短辺幕板でコの字型フレームを2セット作ります。スコヤで直角を確認しながらコーススレッドで固定します。", illustrationType: "frame" },
    { order: 4, title: "長辺幕板の取り付け", description: "2つの脚フレームを長辺幕板で連結します。対角線が等しいことを確認して水平・直角を出します。", illustrationType: "levelCheck" },
    { order: 5, title: "天板の並べと固定", description: `天板${topCount}枚を均等に並べ、5mm程度の隙間を保ちながらクランプで仮固定します。幕板に向かってビスを打ちます。`, illustrationType: "topBoard" },
    { order: 6, title: "天板のビス留め", description: "コーススレッド75mmで天板を幕板に固定します。天板1枚につき各幕板に2本打ちます。ビスは木目に沿って均等に配置します。", illustrationType: "screw" },
    { order: 7, title: "仕上げのやすりがけ", description: "組み立て後、全体を#240で再研磨します。ビス頭周辺の木材が盛り上がっている場合は平らにします。", illustrationType: "sand" },
    { order: 8, title: "塗装仕上げ", description: `${outdoor ? "屋外用ウッドステイン（キシラデコール等）を2回塗りします。乾燥を24時間十分とります。" : "オイルステインまたはワックスで仕上げます。木目が引き立つオーク・ウォルナット系が人気です。"}`, illustrationType: "paint" },
    { order: 9, title: "完成確認", description: `${name}の水平とガタつきを確認します。脚底にフェルトパッドを貼ると床傷を防げます。`, illustrationType: "complete" },
  ];
  return { parts, cutItems, steps };
}

// ── TV台/デスク系ジェネレータ ────────────────────────────────
function genCabinet(id: string, name: string, w: number, d: number, h: number): Pick<Blueprint, "parts"|"cutItems"|"steps"> {
  const t = 18; // 合板厚
  const shelfQty = Math.max(1, Math.floor(h / 250) - 1);
  const parts: Part[] = [
    { name: "天板・底板（ラワン合板 18mm）", spec: `${t}×${d}×${w}mm`, quantity: 2, unit: "枚" },
    { name: "側板（ラワン合板 18mm）", spec: `${t}×${d}×${h - t * 2}mm`, quantity: 2, unit: "枚" },
    { name: "棚板（ラワン合板 18mm）", spec: `${t}×${d - 10}×${w - t * 2}mm`, quantity: shelfQty, unit: "枚" },
    { name: "背板（ベニヤ 4mm）", spec: `${w}×${h}mm`, quantity: 1, unit: "枚", note: "4mm厚" },
    { name: "コーススレッド 38mm", spec: "38mm", quantity: 60, unit: "本" },
    { name: "木工ボンド", spec: "速乾タイプ", quantity: 1, unit: "本" },
  ];
  const cutItems: CutItem[] = [
    { partName: "天板", thickness: t, width: d, length: w, quantity: 1 },
    { partName: "底板", thickness: t, width: d, length: w, quantity: 1 },
    { partName: "側板", thickness: t, width: d, length: h - t * 2, quantity: 2 },
    { partName: "棚板", thickness: t, width: d - 10, length: w - t * 2, quantity: shelfQty },
    { partName: "背板（ベニヤ）", thickness: 4, width: w, length: h, quantity: 1 },
  ];
  const steps: Step[] = [
    { order: 1, title: "寸法確認とカット", description: `${name}（${w}×${d}×${h}mm）のカットリストを作成します。合板は重いため、ホームセンターのカットサービスを活用してください。`, illustrationType: "measure" },
    { order: 2, title: "木口テープの貼り付け", description: "合板の木口（断面）に木口テープをアイロンで貼り付けます。見える面の木口は全てテープ処理します。", illustrationType: "markLine" },
    { order: 3, title: "全部材のやすりがけ", description: "#180→#240サンドペーパーで表面を研磨します。木口テープの端も丁寧に磨きます。", illustrationType: "sand" },
    { order: 4, title: "側板への棚板位置マーキング", description: `側板2枚に棚板（${shelfQty}枚）の固定位置をマーキングします。水平器で左右を合わせます。棚受けダボを使う場合はφ8mmで穴を開けます。`, illustrationType: "drill" },
    { order: 5, title: "箱体の組み立て（底板→側板→天板）", description: "底板に側板をビスと木工ボンドで固定し、最後に天板を取り付けます。スコヤで直角を確認しながら進めます。", illustrationType: "frame" },
    { order: 6, title: "棚板の取り付け", description: `棚板${shelfQty}枚を棚受けダボまたはビスで固定します。棚板の水平を確認します。`, illustrationType: "screw" },
    { order: 7, title: "背板の取り付け", description: "ベニヤ背板を取り付けて箱体の歪みを矯正します。対角線が等しいことを確認してタッカーまたは細ビスで固定します。", illustrationType: "frame" },
    { order: 8, title: "塗装仕上げ", description: "水性塗料またはオイルステインで全体を仕上げます。2回塗りで均一な仕上がりになります。乾燥後24時間は重い荷物を乗せないでください。", illustrationType: "paint" },
    { order: 9, title: "完成確認", description: `${name}の水平・ガタつきを確認します。脚底にフェルトまたはゴムパッドを貼ります。配線穴が必要な場合はホールソーで開けます。`, illustrationType: "complete" },
  ];
  return { parts, cutItems, steps };
}

// ── ウッドデッキ系ジェネレータ ───────────────────────────────
function genDeck(id: string, name: number, w: number, d: number, h: number): Pick<Blueprint, "parts"|"cutItems"|"steps"> {
  const deckCount = Math.ceil(w / 100);
  const joistCount = Math.ceil(d / 400) + 1;
  const beamCount = Math.ceil(w / 900) + 1;
  const parts: Part[] = [
    { name: "デッキ材（ウエスタンレッドシダー）", spec: `20×90×${d}mm`, quantity: deckCount, unit: "枚", note: "屋外対応" },
    { name: `根太（2×4材）`, spec: `38×89×${d}mm`, quantity: joistCount, unit: "本" },
    { name: "大引き（4×4材）", spec: `89×89×${w}mm`, quantity: beamCount, unit: "本" },
    { name: "束石", spec: "150mm角", quantity: beamCount * 2, unit: "個" },
    { name: "ステンレスコーススレッド 90mm", spec: "90mm", quantity: deckCount * joistCount * 2, unit: "本" },
  ];
  const cutItems: CutItem[] = [
    { partName: "デッキ材", thickness: 20, width: 90, length: d, quantity: deckCount },
    { partName: "根太", thickness: 38, width: 89, length: d, quantity: joistCount },
    { partName: "大引き", thickness: 89, width: 89, length: w, quantity: beamCount },
  ];
  const steps: Step[] = [
    { order: 1, title: "レイアウトと地盤確認", description: `${w}×${d}mmのエリアに縄張りをして束石位置を確定します。地盤が軟弱な場合は砕石を敷いて転圧します。`, illustrationType: "measure" },
    { order: 2, title: "束石の水平設置", description: `束石（${beamCount * 2}個）を設置し、水糸を基準に全ての天端を同じ高さに揃えます。誤差±3mm以内が目標です。`, illustrationType: "foundation" },
    { order: 3, title: "束石の水平確認", description: "水平器で縦横の水平を確認し、砂や砕石で微調整します。全ての束石が正確に同じ高さであることが重要です。", illustrationType: "levelCheck" },
    { order: 4, title: "大引きの設置", description: `防腐処理済み4×4材（${beamCount}本）を束石に設置し、束バンドで固定します。大引きの上面が水平になるか再確認します。`, illustrationType: "frame" },
    { order: 5, title: "根太の取り付け", description: `根太${joistCount}本を400mm間隔で大引きと直交させて取り付けます。羽子板ボルトか根太受け金物で固定します。`, illustrationType: "frame" },
    { order: 6, title: "デッキ材の仮並べ", description: `デッキ材${deckCount}枚を仮並べし、5〜6mmのスペーサーで等間隔に並べます。両端の出寸法を均等にします。`, illustrationType: "topBoard" },
    { order: 7, title: "デッキ材のビス留め", description: "ステンレスコーススレッド90mmで各根太との交点に2本ずつビスを打ちます。端から30mm以上離してビスを打ちます。", illustrationType: "screw" },
    { order: 8, title: "端部のカットと仕上げ", description: "デッキ材端部を墨糸に合わせて丸ノコでまっすぐカットします。カット面に防腐剤を塗ります。", illustrationType: "cut" },
    { order: 9, title: "防腐塗装2回", description: "デッキ全体にキシラデコールやウッドステインを木目に沿って塗ります。24時間乾燥後に2回目を塗ります。根太・大引きの露出面にも塗布します。", illustrationType: "waterproof" },
    { order: 10, title: "完成確認", description: "全面の水平確認・ガタつき確認・ビス浮きの確認を行います。使用前に荷重をかけて構造が安定しているか確認します。", illustrationType: "complete" },
  ];
  return { parts, cutItems, steps };
}

// ── コンポスト/箱系ジェネレータ ─────────────────────────────
function genBox(id: string, name: string, w: number, d: number, h: number, outdoor: boolean, isPet: boolean): Pick<Blueprint, "parts"|"cutItems"|"steps"> {
  const t = 19;
  const slats = Math.ceil(w / 80);
  const parts: Part[] = [
    { name: `前後板（杉板 19mm）`, spec: `${t}×120×${w}mm`, quantity: Math.ceil(h / 120) * 2, unit: "枚" },
    { name: `側板（杉板 19mm）`, spec: `${t}×120×${d}mm`, quantity: Math.ceil(h / 120) * 2, unit: "枚" },
    { name: `底板（ラワン合板 12mm）`, spec: `12×${d - t * 2}×${w - t * 2}mm`, quantity: 1, unit: "枚", note: "通気穴加工あり" },
    { name: "コーナー支柱（2×4材）", spec: `38×89×${h}mm`, quantity: 4, unit: "本" },
    { name: "コーススレッド 65mm", spec: "65mm", quantity: 60, unit: "本" },
  ];
  const cutItems: CutItem[] = [
    { partName: "前板", thickness: t, width: 120, length: w, quantity: Math.ceil(h / 120) * 2 },
    { partName: "側板", thickness: t, width: 120, length: d, quantity: Math.ceil(h / 120) * 2 },
    { partName: "底板", thickness: 12, width: d - t * 2, length: w - t * 2, quantity: 1 },
    { partName: "コーナー支柱", thickness: 38, width: 89, length: h, quantity: 4 },
  ];
  const steps: Step[] = [
    { order: 1, title: "寸法確認と部材カット", description: `${name}（${w}×${d}×${h}mm）のカットリストを作成します。杉板の木口面は防腐剤を事前に塗ると耐久性が上がります。`, illustrationType: "measure" },
    { order: 2, title: "コーナー支柱の立て付け", description: `4本のコーナー支柱（${h}mm）を垂直に立てて作業台に固定します。水平器で縦方向の垂直を確認します。`, illustrationType: "foundation" },
    { order: 3, title: "前後板の取り付け", description: "前後の杉板を支柱にコーススレッドで固定します。板の間に5mm程度の通気スリットを設けると堆肥化が促進されます（コンポストの場合）。", illustrationType: "screw" },
    { order: 4, title: "側板の取り付け", description: "同様に両側の板を支柱に固定します。対角線の長さが等しいか確認して歪みを防ぎます。", illustrationType: "frame" },
    { order: 5, title: "底板の加工と取り付け", description: `底板に直径20mmの通気穴を9箇所均等に開けます。${outdoor ? "底板は地面からの湿気に注意し、防腐塗料を2回塗りしてから取り付けます。" : "底板を箱体底部に取り付け、コーススレッドで固定します。"}`, illustrationType: "drill" },
    { order: 6, title: "蓋（フタ）の作成", description: "蓋板を指定寸法にカットし、補強材で反り防止を施します。蝶番2個で本体に取り付けます。", illustrationType: "topBoard" },
    { order: 7, title: "やすりがけと防腐処理", description: `全体を#120→#240サンドペーパーで研磨します。${outdoor ? "屋外用防腐塗料を全面に2回塗りします（乾燥24時間）。コーナー部分・木口面は特に念入りに。" : isPet ? "ペットが舐めても安全な水性ウレタン塗料を塗ります。" : "オスモカラーなどの木材保護塗料で仕上げます。"}`, illustrationType: "waterproof" },
    { order: 8, title: "完成確認", description: `${name}の各面の垂直・蓋の開閉確認・ビス締めの確認を行います。設置場所に置いてガタつきがないか確認します。`, illustrationType: "complete" },
  ];
  return { parts, cutItems, steps };
}

// ── フラワーボックス系ジェネレータ ──────────────────────────
function genFlowerBox(id: string, name: string, w: number, d: number, h: number): Pick<Blueprint, "parts"|"cutItems"|"steps"> {
  const t = 12;
  const parts: Part[] = [
    { name: "前後板（SPF 1×6材）", spec: `${t}×140×${w}mm`, quantity: 2, unit: "枚" },
    { name: "側板（SPF 1×6材）", spec: `${t}×140×${d}mm`, quantity: 2, unit: "枚" },
    { name: "底板（SPF 1×6材）", spec: `${t}×140×${w - t * 2}mm`, quantity: Math.ceil(d / 140), unit: "枚", note: "排水穴加工" },
    { name: "コーススレッド 38mm", spec: "38mm", quantity: 30, unit: "本" },
    { name: "防腐塗料（屋外用）", spec: "水性", quantity: 1, unit: "缶" },
  ];
  const cutItems: CutItem[] = [
    { partName: "前後板", thickness: t, width: 140, length: w, quantity: 2 },
    { partName: "側板", thickness: t, width: 140, length: d, quantity: 2 },
    { partName: "底板", thickness: t, width: 140, length: w - t * 2, quantity: Math.ceil(d / 140) },
  ];
  const steps: Step[] = [
    { order: 1, title: "寸法確認とカット", description: `${name}（${w}×${d}×${h}mm）の前後板・側板・底板をカットします。SPF材は軽くて加工しやすいのでビギナーにも扱いやすい素材です。`, illustrationType: "cut" },
    { order: 2, title: "やすりがけ", description: "#120→#240サンドペーパーで全部材を研磨します。植物を扱う部品なので、ケバが残らないよう丁寧に仕上げます。", illustrationType: "sand" },
    { order: 3, title: "側板への前後板ビス留め", description: "側板2枚の間に前後板を挟み込む形で組み立てます。クランプで固定しながらコーススレッド38mmで接合します。", illustrationType: "screw" },
    { order: 4, title: "底板の排水穴加工", description: "底板に直径10mmの排水穴を均等に4〜6か所開けます。排水穴がないと根腐れの原因になります。", illustrationType: "drill" },
    { order: 5, title: "底板の取り付け", description: "排水穴を開けた底板を箱の内側底面に取り付けます。底板の端と箱側板が揃うよう調整します。", illustrationType: "frame" },
    { order: 6, title: "防腐塗装", description: "屋外用防腐塗料を内外全面に2回塗りします。特に底板・木口面は念入りに。乾燥後24時間待ってから土を入れます。", illustrationType: "waterproof" },
    { order: 7, title: "完成確認", description: `${name}を設置場所に仮置きし、水平を確認します。掛け金具やフェンス固定金具が必要な場合は取り付けます。`, illustrationType: "complete" },
  ];
  return { parts, cutItems, steps };
}

// ── フェンス系ジェネレータ ───────────────────────────────────
function genFence(id: string, name: string, w: number, d: number, h: number): Pick<Blueprint, "parts"|"cutItems"|"steps"> {
  const postCount = Math.ceil(w / 1200) + 1;
  const boardCount = Math.ceil(h / 90);
  const parts: Part[] = [
    { name: "支柱（4×4材）", spec: `89×89×${h + 600}mm`, quantity: postCount, unit: "本", note: "地中埋め込み600mm分含む" },
    { name: "横桟（2×4材）", spec: `38×89×${w}mm`, quantity: 3, unit: "本" },
    { name: "板材（SPF 1×4材）", spec: `19×89×${h}mm`, quantity: boardCount, unit: "枚" },
    { name: "ステンレスコーススレッド 75mm", spec: "75mm", quantity: boardCount * 6, unit: "本" },
    { name: "モルタル（支柱固定用）", spec: "速硬タイプ", quantity: postCount, unit: "袋" },
    { name: "屋外用防腐塗料", spec: "キシラデコール等", quantity: 2, unit: "缶" },
  ];
  const cutItems: CutItem[] = [
    { partName: "支柱", thickness: 89, width: 89, length: h + 600, quantity: postCount },
    { partName: "横桟", thickness: 38, width: 89, length: w, quantity: 3 },
    { partName: "板材", thickness: 19, width: 89, length: h, quantity: boardCount },
  ];
  const steps: Step[] = [
    { order: 1, title: "設置位置の測定と墨出し", description: `フェンスを設置する${w}mmの線を墨出しします。支柱位置（${postCount}か所）を均等に決め、杭で目印をつけます。`, illustrationType: "markLine" },
    { order: 2, title: "支柱穴の掘削", description: `支柱（${postCount}本）を埋め込む穴を600mm深さで掘ります。φ100mm程度の穴をポストホールディガーで開けます。`, illustrationType: "foundation" },
    { order: 3, title: "支柱の立て付けと固定", description: "支柱を穴に立て、水糸と水平器で全支柱の垂直・高さを揃えます。速硬モルタルを流し込み24時間養生します。", illustrationType: "levelCheck" },
    { order: 4, title: "横桟の取り付け", description: "モルタルが硬化後、横桟3本を支柱にビス留めします（上・中・下）。横桟の水平を水平器で確認します。", illustrationType: "frame" },
    { order: 5, title: "板材の取り付け", description: `板材${boardCount}枚を横桟にビス留めします。隙間の間隔を均一に保ちながら（5mm程度）順番に固定します。`, illustrationType: "screw" },
    { order: 6, title: "防腐塗装", description: "全体にキシラデコールなどの防腐塗料を2回塗りします。木口面・支柱の地際部分は特に入念に塗布します。", illustrationType: "waterproof" },
    { order: 7, title: "完成確認", description: `${name}の垂直・板材の均一な並びを確認します。ガタつきがある場合はビスを追加します。`, illustrationType: "complete" },
  ];
  return { parts, cutItems, steps };
}

// ── キャット系ジェネレータ ───────────────────────────────────
function genCatFurniture(id: string, name: string, w: number, d: number, h: number, isTower: boolean): Pick<Blueprint, "parts"|"cutItems"|"steps"> {
  const t = 15;
  const levels = isTower ? Math.max(2, Math.floor(h / 400)) : 1;
  const parts: Part[] = [
    { name: `台板（ラワン合板 15mm）`, spec: `${t}×${d}×${w}mm`, quantity: isTower ? levels + 1 : 1, unit: "枚" },
    { name: "支柱（麻ロープ巻きポール）", spec: `φ90×${h}mm`, quantity: isTower ? 2 : 1, unit: "本", note: "麻ロープ巻き" },
    { name: "支柱（2×4材）", spec: `38×89×${h}mm`, quantity: isTower ? 2 : 0, unit: "本" },
    { name: "麻ロープ", spec: "φ8mm", quantity: isTower ? h * 3 / 1000 : 1, unit: "m" },
    { name: "コーススレッド 50mm", spec: "50mm", quantity: 40, unit: "本" },
    { name: "カーペット（ボア素材）", spec: `${d}×${w}mm`, quantity: isTower ? levels : 1, unit: "枚", note: "クッション用" },
  ];
  const cutItems: CutItem[] = [
    { partName: "台板", thickness: t, width: d, length: w, quantity: isTower ? levels + 1 : 1 },
    { partName: "支柱（木材コア）", thickness: 38, width: 89, length: h, quantity: isTower ? 2 : 1 },
  ];
  const steps: Step[] = [
    { order: 1, title: "設計と寸法確認", description: `${name}（W${w}×D${d}×H${h}mm）の各部材寸法を確認します。猫の体重（最大5〜7kg）に耐えられる構造を意識します。`, illustrationType: "measure" },
    { order: 2, title: "台板のカットとやすりがけ", description: `台板${isTower ? levels + 1 : 1}枚を指定サイズにカットします。猫が乗る面の角を丁寧に面取りし、ケバがないよう#120→#240で研磨します。`, illustrationType: "sand" },
    { order: 3, title: "支柱への麻ロープ巻き", description: "支柱となる木材に木工ボンドを薄く塗り、麻ロープをきつく巻き付けます。ロープの端はステープルで固定します。これが猫の爪とぎになります。", illustrationType: "markLine" },
    { order: 4, title: "ベース台板への支柱固定", description: "ベース台板に支柱をコーススレッドと木工ボンドで固定します。支柱が垂直になるよう水平器で確認します。", illustrationType: "foundation" },
    ...(isTower ? [
      { order: 5, title: `中段台板の取り付け（${levels}段）`, description: `支柱の中間位置に台板を水平に取り付けます。猫が楽に乗り降りできる高さ間隔（30〜40cm）を確保します。ビスを2本以上打ち、しっかり固定します。`, illustrationType: "frame" as IllType },
    ] : []),
    { order: isTower ? 6 : 5, title: "カーペットの貼り付け", description: "各台板にカーペット生地（ボア素材）を木工ボンドまたはタッカーで貼り付けます。猫が滑りにくくなります。", illustrationType: "topBoard" },
    { order: isTower ? 7 : 6, title: "壁への固定（オプション）", description: "転倒防止のため、L字金具で壁の間柱に固定します。特に高いキャットタワーは必須の安全対策です。", illustrationType: "wallMount" },
    { order: isTower ? 8 : 7, title: "完成確認と安全テスト", description: `${name}を揺らして安定性を確認します。全ジョイント部のビスを再度増し締めします。猫を乗せる前に荷重テスト（猫の体重以上の重りで5分以上）を実施します。`, illustrationType: "inspect" },
    { order: isTower ? 9 : 8, title: "完成", description: "猫用おやつを台板に置いて猫を誘導します。最初は低い段から慣らしていくとスムーズです。", illustrationType: "complete" },
  ];
  return { parts, cutItems, steps };
}

// ── 看板系ジェネレータ ───────────────────────────────────────
function genSign(id: string, name: string, w: number, d: number, h: number): Pick<Blueprint, "parts"|"cutItems"|"steps"> {
  const parts: Part[] = [
    { name: "看板板（杉無垢板）", spec: `${d}×${h}×${w}mm`, quantity: 1, unit: "枚" },
    { name: "補強桟（SPF 1×2材）", spec: `19×38×${w - 20}mm`, quantity: 2, unit: "本", note: "反り防止" },
    { name: "吊り金具", spec: "ステンレス製", quantity: 2, unit: "個" },
    { name: "コーススレッド 30mm", spec: "30mm", quantity: 10, unit: "本" },
    { name: "木焼きペン または ルーター", spec: "文字入れ用", quantity: 1, unit: "個" },
    { name: "屋外用塗料（オスモカラー等）", spec: "クリア/カラー", quantity: 1, unit: "缶" },
  ];
  const cutItems: CutItem[] = [
    { partName: "看板板", thickness: d, width: h, length: w, quantity: 1 },
    { partName: "補強桟", thickness: 19, width: 38, length: w - 20, quantity: 2 },
  ];
  const steps: Step[] = [
    { order: 1, title: "材料確認と寸法マーキング", description: `${name}（${w}×${h}mm）の外形を板にマーキングします。木目の方向を確認し、文字を入れる面を決めます。`, illustrationType: "markLine" },
    { order: 2, title: "形状カットとやすりがけ", description: "外形を切り出し、#120→#240→#400サンドペーパーで丁寧に研磨します。角は手のひらで触れてもトゲが刺さらないよう面取りします。", illustrationType: "cut" },
    { order: 3, title: "文字・デザインの転写", description: "下書きを鉛筆で板に描きます。プリントアウトをカーボン紙で転写する方法が簡単です。彫刻する場合はルーターまたはノミを使います。", illustrationType: "markLine" },
    { order: 4, title: "文字入れ（焼き入れ/彫刻）", description: "木焼きペン（ウッドバーニング）または木工ルーターで文字を入れます。焼きすぎないよう一定のスピードで動かします。", illustrationType: "drill" },
    { order: 5, title: "補強桟の取り付け", description: "裏面に補強桟2本をビス留めします。桟は板の反りを防ぐため板幅方向に対して垂直に固定します。", illustrationType: "screw" },
    { order: 6, title: "塗装仕上げ", description: "文字部分をステインで着色し、全体をクリア塗料で保護します。屋外使用の場合は防水性の高いオスモカラーを使います。2回塗りを推奨します。", illustrationType: "paint" },
    { order: 7, title: "吊り金具取り付けと完成確認", description: `吊り金具を裏面に取り付け、水平に掛けられるよう位置を調整します。${name}を実際の設置場所に掛けて確認します。`, illustrationType: "complete" },
  ];
  return { parts, cutItems, steps };
}

// ── メインジェネレータ関数 ───────────────────────────────────
function generateBlueprint(row: UCRow): Blueprint {
  const [ucID, name, category, templateID, io, w, d, h] = row;
  const outdoor = io === "屋外" || io === "両用";
  const tools = makeTools(category, outdoor);
  const warnings = makeWarnings(category, outdoor, name);

  let generated: Pick<Blueprint, "parts"|"cutItems"|"steps">;

  if (category === "棚" || category === "本棚" || category === "ハンガーラック" ||
      (category === "ペット用収納" && templateID === "tpl-shoe-rack") ||
      (category === "物置・収納" && (templateID === "tpl-shelf-basic")) ||
      (category === "玄関収納" && templateID === "tpl-shelf-basic") ||
      (category === "子供用家具" && templateID === "tpl-shelf-basic")) {
    generated = genShelf(ucID, name, w, d, h, outdoor);
  } else if (category === "ベンチ" || (category === "子供用家具" && (name.includes("チェア") || name.includes("ベンチ") || name.includes("ブランコ") || name.includes("ベッド"))) ||
             (category === "ペット用収納" && templateID === "tpl-bench") ||
             (category === "玄関収納" && templateID === "tpl-bench")) {
    generated = genBench(ucID, name, w, d, h, outdoor);
  } else if (category === "ガーデンテーブル" || category === "ダイニングテーブル" ||
             (category === "子供用家具" && templateID === "tpl-garden-table")) {
    generated = genTable(ucID, name, w, d, h, outdoor);
  } else if (category === "TV台" || category === "デスク・作業台" ||
             (category === "子供用家具" && templateID === "tpl-tv-stand")) {
    generated = genCabinet(ucID, name, w, d, h);
  } else if (category === "ウッドデッキ" || (category === "物置・収納" && templateID === "tpl-wood-deck")) {
    generated = genDeck(ucID, 0, w, d, h);
  } else if (category === "フラワーボックス" || category === "看板・インテリア" && templateID === "tpl-flower-box" && name.includes("フラワー")) {
    generated = genFlowerBox(ucID, name, w, d, h);
  } else if (category === "看板・インテリア") {
    generated = genSign(ucID, name, w, d, h);
  } else if (category === "ガーデンフェンス") {
    generated = genFence(ucID, name, w, d, h);
  } else if (category === "キャットウォーク" || category === "キャットタワー") {
    generated = genCatFurniture(ucID, name, w, d, h, category === "キャットタワー");
  } else if (category === "コンポスト" || category === "犬小屋" || category === "物置・収納" ||
             category === "シューズラック" || category === "玄関収納" ||
             (category === "子供用家具" && templateID === "tpl-compost-box") ||
             category === "プランター台" ||
             (category === "ペット用収納")) {
    const isPet = category === "ペット用収納" || category === "犬小屋";
    generated = genBox(ucID, name, w, d, h, outdoor, isPet);
  } else {
    generated = genShelf(ucID, name, w, d, h, outdoor);
  }

  return {
    useCaseID: ucID,
    templateID,
    name,
    category,
    indoorOutdoor: io,
    dimensions: { width: w, depth: d, height: h },
    warnings,
    tools,
    ...generated,
  };
}

// ── シード実行 ───────────────────────────────────────────────
async function main() {
  const col = db.collection("blueprints");
  const total = CATALOG.length;
  console.log(`Seeding ${total} blueprints...`);

  const batchSize = 20;
  for (let i = 0; i < total; i += batchSize) {
    const batch = db.batch();
    const slice = CATALOG.slice(i, i + batchSize);
    for (const row of slice) {
      const bp = generateBlueprint(row);
      batch.set(col.doc(bp.useCaseID), bp);
    }
    await batch.commit();
    console.log(`  ${Math.min(i + batchSize, total)}/${total} committed`);
  }
  console.log("Done!");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
