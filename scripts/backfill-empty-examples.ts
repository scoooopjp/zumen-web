/**
 * 既存の examples ドキュメントのうち comment / steps が欠けているものを再生成する。
 *
 * 背景:
 *   seed-examples.ts の初期実行時、Pexels で hero 写真が取れなかった useCase は
 *   `createExample` の冒頭で early return していた。しかし別経路 (legacy seed) で
 *   useCaseID / authorUID 等の最低限フィールドだけ書かれた skeleton ドキュメントが
 *   1120 件残っており、Web の `/example/{id}` ページで `ex.comment.replace(...)` が
 *   throw して SSR エラーを引き起こしていた。
 *
 *   ランタイム側は `lib/firestore.ts:fsExampleToModel` で defensive coercion 済み
 *   (空文字フォールバック)。本スクリプトはデータ自体を正しい状態に戻す目的で実行する。
 *
 * 実行:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     npx ts-node --project tsconfig.seed.json scripts/backfill-empty-examples.ts [flags]
 *
 * Flags:
 *   --dry-run    Firestore に書かない (件数だけレポート)
 *   --limit=N    先頭 N 件だけ処理
 *
 * 設計方針:
 *   - 既存フィールドは破壊しない (merge 書き込み)
 *   - comment / steps が欠けているドキュメントだけ更新
 *   - actualWidth/Depth/Height/Cost/TimeMinutes/retailer も欠けていれば補完
 *   - hero 写真は Option B のとおり生成しない (imageURL 欠損は LottieIcon にフォールバック)
 *   - 文章生成のロジックは seed-examples.ts と一致させる
 *     (将来の seed 改善時は両方更新)
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ── Init ─────────────────────────────────────────────────────

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS 未設定");
  process.exit(1);
}

initializeApp({
  credential: cert(require(path.resolve(keyPath)) as ServiceAccount),
});
const db = getFirestore();

const DRY = process.argv.includes("--dry-run");
const LIMIT = (() => {
  const a = process.argv.find((x) => x.startsWith("--limit="));
  return a ? parseInt(a.slice("--limit=".length), 10) : null;
})();

// ── Types (seed-examples.ts と同期) ───────────────────────────

interface SeedUser {
  uid: string;
  displayName: string;
  bio: string;
  photoURL: string | null;
  username: string | null;
  seedKey: string | null;
}

interface UseCase {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  indoorOutdoor: string;
  estimatedBudgetMin: number;
  estimatedBudgetMax: number;
  estimatedTimeMinutes: number;
  templateID: string;
}

type Residential = "house" | "apartment" | "balcony" | "old-house" | "rural" | "any";
type Pet = "cat" | "dog" | "none";
type Experience = "beginner" | "intermediate" | "advanced";

interface Persona {
  residential: Residential[];
  pets: Pet[];
  hasKids: boolean;
  experience: Experience;
  focus: Set<string>;
}

// ── Deterministic RNG ────────────────────────────────────────

class Rng {
  private state: number;
  constructor(seed: string) {
    const h = crypto.createHash("sha256").update(seed).digest();
    this.state = h.readUInt32BE(0) || 1;
  }
  next(): number {
    this.state = (this.state + 0x6D2B79F5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  weighted<T>(arr: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((s, w) => s + w, 0);
    let r = this.next() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  }
}

// ── Persona extraction ───────────────────────────────────────

function parsePersona(bio: string): Persona {
  const b = bio;
  const residential: Residential[] = [];
  if (/戸建て|一軒家|築\d+年.*戸建て/.test(b)) residential.push("house");
  if (/マンション|賃貸|ワンルーム|一人暮らし|アパート/.test(b)) residential.push("apartment");
  if (/ベランダ|バルコニー/.test(b)) residential.push("balcony");
  if (/古民家|築40年|築60年|実家/.test(b)) residential.push("old-house");
  if (/田舎|長野|札幌|農村/.test(b)) residential.push("rural");
  if (residential.length === 0) residential.push("any");

  const pets: Pet[] = [];
  if (/猫/.test(b)) pets.push("cat");
  if (/犬/.test(b)) pets.push("dog");
  if (pets.length === 0) pets.push("none");

  const hasKids = /子供|娘|息子|2児|3児|キッズ|子育て/.test(b);

  let experience: Experience = "intermediate";
  if (/初心者|3ヶ月|新参|始めて|始めました|目覚めた|新卒/.test(b)) experience = "beginner";
  if (/工房|大工|職人|歴\d+年|歴8年|歴10年|退職|30年|建築学|本業大工|プロ/.test(b)) experience = "advanced";
  if (/工学部|計算|設計が得意|Fusion|3D|デジファブ/.test(b)) experience = "advanced";

  const focus = new Set<string>();
  if (/SPF|1x4|1x6|2x4/.test(b)) focus.add("spf");
  if (/ハードウッド|ウリン|イペ|イタウバ|セランガンバツ|無垢/.test(b)) focus.add("hardwood");
  if (/棚|キッチン|吊り棚|スパイス/.test(b)) focus.add("shelf");
  if (/本棚|文庫|漫画/.test(b)) focus.add("bookshelf");
  if (/在宅|デスク|ワークデスク|モニター|ゲーミング|テレワーク/.test(b)) focus.add("desk");
  if (/ベンチ|縁側|縁台/.test(b)) focus.add("bench");
  if (/プランター|植物|ハーブ|鉢|花壇|観葉植物/.test(b)) focus.add("planter");
  if (/フェンス|目隠し|境界/.test(b)) focus.add("fence");
  if (/デッキ|ウッドデッキ|テラス/.test(b)) focus.add("deck");
  if (/玄関|シューズ|靴|傘立て/.test(b)) focus.add("entrance");
  if (/ハンガー|コート|クローゼット/.test(b)) focus.add("hanger");
  if (/物置|薪|倉庫|工具収納/.test(b)) focus.add("storage");
  if (/看板|サイン|表札|カフェ風/.test(b)) focus.add("sign");
  if (/コンポスト|堆肥|ミミズ/.test(b)) focus.add("compost");
  if (/作業台|ワークベンチ|工房|作業/.test(b)) focus.add("workbench");
  if (/雑貨|小物|アクセサリー|レジン/.test(b)) focus.add("zakka");
  if (/カフェ|アンティーク|ヴィンテージ|ビンテージ|ブライワックス|オイル/.test(b)) focus.add("rustic");
  if (/インテリア|ナチュラル|北欧/.test(b)) focus.add("interior");
  if (/原状回復|突っ張り|両面テープ|穴あけ無し|ディアウォール/.test(b)) focus.add("rental-friendly");
  if (/古民家|改修|リノベ|床はり|漆喰|襖|畳/.test(b)) focus.add("renovation");
  if (/タイニーハウス|tiny/.test(b)) focus.add("tiny-house");
  if (/ガーデン|庭/.test(b)) focus.add("garden");
  if (/BBQ|キャンプ|アウトドア/.test(b)) focus.add("outdoor-life");
  if (/カット|手鋸|電動工具|インパクト|トリマー|工具沼|工具コレクター|墨壺|差し金|鉋|彫刻刀/.test(b)) focus.add("tool-lover");
  if (/狭い|小物|小型|スリム/.test(b)) focus.add("small");
  if (/動画|YouTube|ブログ|アカウント|発信|レビュー|記録|ログ|ドキュメンタリー/.test(b)) focus.add("media");

  return { residential, pets, hasKids, experience, focus };
}

// ── Narrative generation ─────────────────────────────────────

function buildOpening(_user: SeedUser, persona: Persona, uc: UseCase, rng: Rng): string {
  const parts: string[] = [];
  const motiv = rng.pick([
    `週末を使って${uc.name}を作りました。`,
    `気になっていた${uc.name}にようやく挑戦。`,
    `${uc.name}を自作しました。`,
    `市販品ではしっくりこなかったので${uc.name}を自分で組みました。`,
    `今回は${uc.name}にトライ。`,
  ]);
  parts.push(motiv);

  if (persona.residential.includes("apartment")) {
    parts.push(rng.pick([
      "賃貸でも置けるサイズで設計してます。",
      "マンション住まいなので搬入できる寸法を最優先。",
      "一人暮らしなので一人で組み立てられる構造に。",
    ]));
  } else if (persona.residential.includes("old-house")) {
    parts.push(rng.pick([
      "築年数が経った家なので、雰囲気に合わせて少し重めの作りに。",
      "古い柱や梁とのバランスを意識して仕上げました。",
    ]));
  } else if (persona.residential.includes("rural")) {
    parts.push(rng.pick([
      "田舎の広い庭を活かしてゆったり目に作りました。",
      "周りに何もない環境なので電動工具をフル活用。",
    ]));
  }

  if (persona.focus.has("spf") && rng.next() < 0.6) {
    parts.push(rng.pick([
      "材料はおなじみのSPF、コスパ重視でいきました。",
      "SPF 2x4 と 1x6 の組み合わせ。慣れた材料なので作業もスムーズ。",
      "今回もSPFが主役。1本300円台で揃うのがありがたい。",
    ]));
  } else if (persona.focus.has("hardwood") && rng.next() < 0.6) {
    parts.push(rng.pick([
      "メイン材は今回もイタウバ。雨ざらしでも 10 年は安心です。",
      "ウリンを使ったので、初期費用は張りますが長期的にはこちらが安いと割り切ってます。",
      "ハードウッド (ウリン) を選択。重さと固さに作業中泣かされました。",
    ]));
  }

  return parts.join("");
}

function buildMiddle(_user: SeedUser, persona: Persona, uc: UseCase, rng: Rng): string {
  const parts: string[] = [];

  const tips: Record<string, string[]> = {
    "棚": [
      "下穴と皿取りビットで木栓仕上げにしたら、表面のビス頭が消えて綺麗です。",
      "石膏ボードアンカー (ニトムズ) で棚 1 段あたり 30kg まで耐荷重を確保。",
      "間柱センサーで下地を確認してからビス位置を決めました。",
    ],
    "本棚": [
      "棚板は 1x10 を採用。文庫本 60 冊載せても撓みなしでした。",
      "背板なしで圧迫感を抑えて、横方向に筋交いを 1 本入れて強度を担保。",
      "L 字金具で壁固定。地震時の転倒対策は必須です。",
    ],
    "TV台": [
      "後ろに 30mm の自在錐で配線穴を開けたので、コードが綺麗に処理できます。",
      "天板は集成材で広く取り、サウンドバーも一緒に置けるサイズに。",
      "重たい液晶 TV を載せるので脚は 2x4 を縦に 4 本。",
    ],
    "ダイニングテーブル": [
      "天板はオイル仕上げ (ワトコ ナチュラル)。3 度塗りで木目がくっきり出ました。",
      "ハードメープルは硬くて加工が大変ですが、傷が付きにくいので食卓向きです。",
      "脚はホゾ組みで強度を確保。組んだ後の安定感が違います。",
    ],
    "デスク・作業台": [
      "天板の奥行きを 600mm 取って、モニター + ノート PC + サブ資料が並ぶ広さに。",
      "脚にはアジャスターを付けて、床の不陸を吸収できるようにしてます。",
      "ケーブルは天板裏に配線モールで隠して、見た目スッキリ。",
    ],
    "ベンチ": [
      "屋外用なのでキシラデコール 3 度塗り。1 年経ちますが色褪せ最小限。",
      "脚はハの字に開く形で安定感アップ。子供が座っても揺れません。",
      "座面と脚の接合は ボンド + ビス + ダボで 3 重に補強。",
    ],
    "ガーデンテーブル": [
      "天板に 5mm の隙間を空けて雨水抜き。1 年経っても腐食ゼロ。",
      "脚はクロス型で安定。BBQ で 6 人座っても揺れません。",
      "屋外塗装は 防腐塗料 → クリアの 2 段仕上げで保護を厚めに。",
    ],
    "ウッドデッキ": [
      "束柱はコンクリ基礎にアンカー固定。羽子板金物で根太と接続してます。",
      "デッキ材は 30x105 のイタウバ、隙間 5mm で水抜きを確保。",
      "水平出しに半日。ここでサボると後々ガタつくので妥協できません。",
    ],
    "ガーデンフェンス": [
      "支柱は単管パイプを 1m 埋めて、その上に木材で化粧。台風でも無事でした。",
      "目隠し板は隙間 20mm で風抜けを作りつつ、目線は完全カット。",
      "ラチェット式の水準器で 3 本ごとに垂直確認。手間ですが仕上がりに直結。",
    ],
    "シューズラック": [
      "段ごとに高さを変えて、ブーツとスニーカーで使い分け。",
      "下段にスリッパ用のスペースを作って、家族 4 人分を収納できる構成。",
      "天板は飾り棚として鍵やマスクを置くのにも便利。",
    ],
    "玄関収納": [
      "ベンチ機能と収納を兼ねた構造。腰掛けて靴が履けるのが地味に便利。",
      "扉は隠し蝶番で見た目スッキリ。閉まったときの収まりが綺麗です。",
      "コート掛けと一体化。来客時にもサッと預けられる動線に。",
    ],
    "フラワーボックス": [
      "底に 8mm の水抜き穴を 4 箇所。鉢底ネットを敷いて土漏れ防止。",
      "防腐塗装は 2 度塗り。1 年経ちましたが土からの湿気で傷んでません。",
      "L 字金具でベランダ手すりに固定。風が強い日でも安心。",
    ],
    "プランター台": [
      "天板を網状 (隙間 5mm) にして水はけを確保。受け皿不要なのが楽。",
      "脚にはキャスター付き。日光に合わせて鉢ごと動かせます。",
      "屋外で使うのでキシラデコール 3 度塗り。木目が深まって良い感じ。",
    ],
    "コンポスト": [
      "通気性のため板の隙間を 10mm 確保。底はメッシュで地面と接続。",
      "蓋は丁番式で開閉ラク。雨水が直接入らないように傾斜つけてます。",
      "2 層式にして、片方を熟成中に切り替えられる構造に。",
    ],
    "キャットウォーク": [
      "壁付け板は下地のある場所のみにビス止め。耐荷重 10kg を 3 段確保。",
      "板の角は鉋で R 面取り。爪が引っかからないように仕上げてます。",
      "ジャンプの着地音を抑えるためフェルトを天面に貼ってます。",
    ],
    "キャットタワー": [
      "ベース板は MDF 2 枚重ねで重心を低く、市販品より安定感があります。",
      "支柱には麻ロープを巻いて爪研ぎ機能を兼用。",
      "ハンモック部はキャンバス地、洗濯機で丸洗い可能にしました。",
    ],
    "犬小屋": [
      "屋根は片流れ。雨の侵入を防ぐため軒を 100mm 出してます。",
      "床は高床式 (脚 100mm) にして湿気から守る設計。",
      "防腐塗料 (キシラデコール ピニー) でナチュラルに仕上げました。",
    ],
    "ペット用収納": [
      "猫砂が飛び散らないよう、入口にゴム製のフラップを取り付け。",
      "通気性のため側面にスリットを 5 箇所入れて湿気と臭いを抜く構造に。",
      "蓋は片手で開閉できるダンパー式。手が塞がっていても便利です。",
    ],
    "子供用家具": [
      "角は全て R 面取り、塗料は食品衛生法適合のミルクペイント。",
      "天板を成長に合わせてダボ穴 3 段階で高さ調整可能にしました。",
      "扉は指挟み防止のソフトクローズ蝶番を使ってます。",
    ],
    "ハンガーラック": [
      "丸棒は 32mm。コート 12 着掛けても全くたわまない太さです。",
      "下段にカゴを配置して、靴下や帽子の収納も兼ねた多機能構造。",
      "上端を金具で壁固定して、子供がぶら下がっても倒れない設計。",
    ],
    "物置・収納": [
      "屋根は片流れ + アスファルトシングル。雨漏りゼロです。",
      "床は OSB 合板 12mm、その上に防水シート。湿気対策としては十分。",
      "扉は南京錠が掛けられる金具を付けて、防犯面もケア。",
    ],
    "看板・インテリア": [
      "焼き杉風に表面をバーナーで炙って、ブラシで磨いて木目を強調。",
      "文字はステンシルで手書き感を出しつつ均一な太さに。",
      "ヤニ止めシーラーを下塗りしてから本塗装。色ムラが出にくいです。",
    ],
  };

  const list = tips[uc.category] ?? ["シンプルな構造ですが、寸法と直角だけは丁寧に出しました。"];
  parts.push(rng.pick(list));

  if (persona.hasKids && rng.next() < 0.5) {
    parts.push(rng.pick([
      "子供が触っても安全なように角は全部丸めてます。",
      "塗料は食品衛生法適合品。子供がなめても大丈夫なものに統一。",
    ]));
  }

  if (persona.focus.has("rental-friendly") && rng.next() < 0.5) {
    parts.push(rng.pick([
      "壁に穴は開けず、ディアウォールで突っ張る方式にしてます。",
      "両面テープ + 突っ張り棒の組み合わせで原状回復可能な構造です。",
    ]));
  }

  if (persona.focus.has("tool-lover") && rng.next() < 0.4) {
    parts.push(rng.pick([
      "今回はマキタの新しい充電インパクトを実戦投入。トルクが段違いでした。",
      "トリマーで縁を面取りすると一気に見栄えが上がりますね。",
    ]));
  }

  return parts.join("");
}

function buildClosing(_user: SeedUser, _persona: Persona, _uc: UseCase, rng: Rng): string {
  return rng.pick([
    "結果には満足してます。",
    "家族にも好評で作って良かった。",
    "この作品で DIY のモチベがまた上がりました。",
    "次は別のサイズで再チャレンジ予定です。",
    "費用対効果も高くて満足です。",
    "ホームセンター店員さんに相談しながら進めたのが良かった。",
    "想定以上に綺麗に仕上がって、自分でもびっくり。",
    "完成までトータル 1 ヶ月、ゆるゆる進めて楽しかったです。",
  ]);
}

function buildComment(user: SeedUser, persona: Persona, uc: UseCase, rng: Rng): string {
  return [
    buildOpening(user, persona, uc, rng),
    buildMiddle(user, persona, uc, rng),
    buildClosing(user, persona, uc, rng),
  ].join("");
}

// ── Step generation ──────────────────────────────────────────

const COMMON_STEP_VARIANTS: Record<string, string[]> = {
  measure: [
    "完成寸法を採寸し、設置場所のサイズを確認。各部材の長さを決めて切り出し図を作りました。",
    "現地でメジャーを当てて、家具との干渉が出ない最大寸法を確定。木取り図を 1 枚にまとめてからホームセンターへ。",
    "コンベックスで 3 回測って数値を揃えました。ここで 1mm でもズレるとあとで響くので慎重に。",
    "間取り図に実寸を書き込んで、棚 1 段ずつの高さと幅を割り出し。最終チェックは現場合わせ。",
  ],
  markLine: [
    "材料 1 本ずつにカット位置を罫書き。スコヤを当てて鉛筆で直角線を引きます。",
    "曲尺で直角を出しつつ墨線。1mm の差が後々響くので、シャーペンの 0.5mm で細めに引きました。",
    "材料の表裏とも墨を入れて、切る側を分かりやすく印付け。捨てる側にバツ印を入れる癖をつけてます。",
    "墨壺は使わずシャーペン派。墨線が薄い方が削って消せて、最終仕上げで困らないので。",
  ],
  cut: [
    "丸鋸 / 手鋸で部材をカット。墨線の外側 0.5mm をターゲットに、仕上げで微調整しました。",
    "ホームセンターのカットサービスを利用。1 カット 30 円で精度も出るので、長い直線は基本ここで頼んでます。",
    "卓上スライド丸鋸でまとめて切断。切断面の直角が出るので、後の組み立てが圧倒的にラクです。",
    "ゼットソーの替刃で手鋸カット。電動と違って騒音気にせず夜でも作業できるのが地味に便利。",
    "切る前に治具をクランプで固定して、ガイド付きで切断。フリーハンドより遥かに直線が出ます。",
  ],
  sand: [
    "切断面と表面を 240 番までサンドペーパーで研磨。角は鉋で軽く面取り。",
    "オービタルサンダーで #120 → #240 と段階的に研磨。最後は手で順目に流して仕上げ。",
    "棒ヤスリで木口の繊維方向に沿って軽く面取り。塗装ノリが目に見えて変わります。",
    "サンディング後はエアダスターで木粉を完全除去。塗装前のひと手間で塗りムラが減ります。",
  ],
  drill: [
    "ビス止め位置に 3mm の下穴を開けて木割れを防止。皿取りビットで皿ビスが面一になるよう座ぐりも一緒に。",
    "下穴ドリル 2.5mm + 皿取り兼用ビットで一発開け。木口の割れリスクを最小化。",
    "ビス径より 1mm 細い下穴を入れる流派。SPF みたいな柔らかい材ほど下穴サボると後悔します。",
    "穴位置は治具を使って正確にマーキング。複数箇所で揃えるとビスラインが綺麗に通ります。",
  ],
  assemble: [
    "ボンド + ビスで本体フレームを組み上げ。コーナークランプで直角を維持しながら締め込み。",
    "タイトボンド III と 65mm コーススレッドで本組み。圧着 30 分待つと接着強度が段違いです。",
    "下から積み上げる順で仮組み → 直角確認 → 本締めの 3 ステップで進行。焦らないのがコツ。",
    "鬼目ナットを使って分解可能な構造に。引っ越し対応も視野に入れたモジュール設計です。",
  ],
  screw: [
    "65mm のコーススレッドでフレームを固定。仮組みでズレを修正してから本締めしました。",
    "ビスは構造材に 1/3 以上効くよう計算して長さ選定。45mm では不足だったので 65mm に変更。",
    "ステンレス製のスクリュービスを使用。屋内でも錆びない安心感、見た目も持続します。",
    "電動インパクトのトルク調整で締めすぎ防止。割れやすい SPF では 1 段下げで運用。",
  ],
  paint: [
    "ワトコオイル (ダークウォルナット) を 2 度塗り。1 度塗りでは薄かったので 2 度塗りで深みを出しました。",
    "ブライワックスのジャコビーンを布で擦り込み。1 時間置いてからウエスで磨くと自然な艶が出ます。",
    "オスモのクリアでナチュラル仕上げ。木目を活かしたい時はこれ一択です。",
    "アサヒペンの水性ステイン (オーク) を刷毛で 1 度塗り → 拭き取りで濃淡コントロール。",
    "蜜蝋ワックスでシンプル仕上げ。室内で使うので食品衛生法適合の塗料を選びました。",
  ],
  inspect: [
    "完成後にガタつきと水平を確認。気になる箇所はサンドペーパーで微調整して仕上げました。",
    "水準器を 4 方向で当てて水平確認。1 箇所 2mm の浮きがあったので脚の底を削って調整。",
    "実際に荷重を載せてみて、軋みやたわみが出ないかチェック。問題なしで完成です。",
    "全ビスを最終増し締め。最後にダスターで木屑を払って、これで完成です。",
  ],
};

function stepTemplate(uc: UseCase, rng: Rng): { type: string; text: string }[] {
  const cat = uc.category;
  const pickCommon = (type: string): { type: string; text: string } => ({
    type,
    text: rng.pick(COMMON_STEP_VARIANTS[type] ?? ["手順どおりに作業しました。"]),
  });
  const common = (variant: "short" | "medium" | "long") => {
    const types =
      variant === "short"
        ? ["measure", "cut", "drill", "assemble", "inspect"]
        : variant === "medium"
        ? ["measure", "markLine", "cut", "sand", "drill", "assemble", "paint"]
        : ["measure", "markLine", "cut", "sand", "drill", "assemble", "screw", "paint", "inspect"];
    return types.map(pickCommon);
  };

  const variant = rng.weighted(["short", "medium", "long"] as const, [3, 4, 3]);
  let steps = common(variant);

  if (cat === "ウッドデッキ") {
    steps = [
      { type: "measure",    text: "デッキ設置範囲を採寸。高さ 200mm 想定で水盛り缶でレベルを取り、各束柱の高さを算出。" },
      { type: "foundation", text: "コンクリート基礎を 6 箇所に打設。アンカーボルトを埋め込んで束柱の取り付け面を確保。" },
      { type: "frame",      text: "束柱→大引→根太の順で組み立て。羽子板金物で接続部を固定して全体の剛性を確保。" },
      { type: "levelCheck", text: "全体の水平を再確認。1 箇所 5mm 沈んでたので束柱を調整して水平を出し直しました。" },
      { type: "cut",        text: "デッキ材 (イタウバ) を 1820mm にカット。両端面はオービタルサンダーで丸めて怪我防止。" },
      { type: "drill",      text: "ステンレス製のコーススレッドで根太に固定。下穴と皿ぐりを必ずセットで。" },
      { type: "screw",      text: "デッキ材を端から固定。隙間は 5mm キープ、目地ゲージを使って均等に。" },
      { type: "waterproof", text: "ハードウッドは無塗装でも持ちますが色味維持のため防腐塗料を年 1 で塗布する予定。" },
      { type: "complete",   text: "完成。立った時の安定感と床鳴りのなさにこだわった甲斐あり、家族も大満足です。" },
    ];
  } else if (cat === "ガーデンフェンス") {
    steps = [
      { type: "measure",    text: "敷地境界を採寸し、支柱位置を 900mm 間隔で割り出し。地面の不陸も確認してます。" },
      { type: "foundation", text: "支柱埋設用に 250mm × 800mm の穴を掘削。砕石を底に入れて排水確保。" },
      { type: "frame",      text: "単管 + 木材化粧の支柱を立てて、生コンを流し込み固定。乾燥に 2 日かけました。" },
      { type: "cut",        text: "目隠し板 (1x4 SPF) を 1800mm にカット。屋外用なので木口にも防腐塗料を含浸させます。" },
      { type: "screw",      text: "支柱に板を 20mm 間隔で固定。テンプレで間隔を揃えると仕上がりが綺麗です。" },
      { type: "waterproof", text: "オスモのウッドステインを 2 度塗り。半透明仕上げで木目を活かしてます。" },
      { type: "inspect",    text: "全体の垂直と上端ラインを確認。微妙なズレは微調整で揃えて完成。" },
    ];
  } else if (cat === "キャットタワー") {
    steps = [
      { type: "measure",  text: "猫の身体に合わせて段の間隔を 350mm に設定。ジャンプ可能な距離を意識してます。" },
      { type: "cut",      text: "支柱用 2x4 を 1500mm、棚板 (1x10) を 400mm にカット。本数分まとめて切り出し。" },
      { type: "sand",     text: "猫の爪が引っかからないよう、棚板の角は鉋でしっかり R 面取りしました。" },
      { type: "drill",    text: "支柱と棚板の接続用に 5mm の下穴を貫通。ボルト + 鬼目ナットで分解可能に。" },
      { type: "assemble", text: "ベース → 支柱 → 棚板の順に組み立て。ベース板は MDF 2 枚重ねで重心低めに。" },
      { type: "frame",    text: "支柱に麻ロープを 6mm 隙間ゼロで巻き付け。爪研ぎ機能を兼用してます。" },
      { type: "complete", text: "完成。安定感は市販品の比じゃないと自負してます。猫もすぐ気に入ってくれました。" },
    ];
  } else if (cat === "プランター台" || cat === "フラワーボックス") {
    steps = [
      { type: "measure",   text: "鉢のサイズに合わせて天板の幅と奥行きを決定。鉢が 3 つ並ぶ寸法に設計。" },
      { type: "cut",       text: "天板 (1x4) と脚 (2x2) を必要長にカット。天板は隙間 5mm で水はけを確保。" },
      { type: "drill",     text: "脚と天板の接続位置に 3mm の下穴。脚の位置がズレないようテンプレで罫書き済み。" },
      { type: "assemble",  text: "ボンド + ビスで枠組みを構築。直角を確認しながらコーナークランプで保持。" },
      { type: "waterproof",text: "屋外で雨ざらしになるのでキシラデコール 3 度塗り。木口は特に念入りに。" },
      { type: "complete",  text: "完成。鉢を並べると一気に植物コーナー感が出て満足度高いです。" },
    ];
  } else if (cat === "犬小屋") {
    steps = [
      { type: "measure",   text: "犬種に合わせて内寸を採寸。立って向き直れる広さを最優先。" },
      { type: "cut",       text: "壁・屋根・床用の合板を必要寸法にカット。屋根は片流れで雨水を逃がす形状。" },
      { type: "frame",     text: "床と壁を 1x4 の角材で枠組みしてから合板を貼り付け、頑丈な構造に。" },
      { type: "assemble",  text: "壁同士を組み立てて外形を作成。床は高床式 (脚 100mm) で湿気対策。" },
      { type: "waterproof",text: "外面はキシラデコール、屋根にはアスファルトルーフィングを貼って雨水対策。" },
      { type: "complete",  text: "完成して犬を入れたところ、すぐに気に入って入ってくれました。" },
    ];
  } else if (cat === "看板・インテリア") {
    steps = [
      { type: "measure",  text: "看板のサイズと文字配置を紙に下書き。バランスを見ながら最終寸法を決定。" },
      { type: "cut",      text: "杉板を必要寸法にカット。表面はバーナーで軽く炙って木目を強調 (焼き杉風)。" },
      { type: "sand",     text: "ワイヤーブラシで焼いた表面の炭をかき落とし、木目だけを残すようにブラッシング。" },
      { type: "paint",    text: "文字部分はステンシルで手書き感を出して塗装。色は黒で深みを意識。" },
      { type: "complete", text: "完成。店舗の入口に取り付けたら一気にカフェ感が出ました。" },
    ];
  } else if (cat === "コンポスト") {
    steps = [
      { type: "measure",   text: "庭の置き場所を採寸して必要サイズを決定。生ごみ量に対して少し大きめに。" },
      { type: "cut",       text: "板材を必要寸法にカット。空気が通るよう板の隙間を 10mm 開ける設計。" },
      { type: "frame",     text: "支柱を立てて壁を組み立て。底はメッシュにして地面と接続させる構造。" },
      { type: "assemble",  text: "蓋を丁番で取り付け、雨水が入らないように傾斜を付けました。" },
      { type: "waterproof",text: "屋外なのでキシラデコール塗布。発酵熱でも持つよう厚塗りしました。" },
      { type: "complete",  text: "完成。生ごみ投入してから 3 ヶ月で良質な堆肥になり、庭で重宝してます。" },
    ];
  }

  if (steps.length < 4) steps = common("medium");
  return steps;
}

// ── Backfill logic ───────────────────────────────────────────

const RETAILERS = ["カインズ", "コメリ", "コーナン", "DCM", "ロイヤルホームセンター"];

interface ExampleDoc {
  id: string;
  data: FirebaseFirestore.DocumentData;
}

function isMissingContent(data: FirebaseFirestore.DocumentData): boolean {
  const comment = data.comment;
  const steps = data.steps;
  const commentEmpty = typeof comment !== "string" || comment.trim().length === 0;
  const stepsEmpty = !Array.isArray(steps) || steps.length === 0;
  return commentEmpty || stepsEmpty;
}

async function loadUser(uid: string): Promise<SeedUser | null> {
  if (!uid) return null;
  const snap = await db.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  const d = snap.data() ?? {};
  return {
    uid,
    displayName: (d.displayName as string) ?? "",
    bio: (d.bio as string) ?? "",
    photoURL: (d.photoURL as string | null) ?? null,
    username: (d.username as string | null) ?? null,
    seedKey: (d.seedKey as string | null) ?? null,
  };
}

async function loadUseCase(id: string): Promise<UseCase | null> {
  if (!id) return null;
  const snap = await db.collection("useCases").doc(id).get();
  if (!snap.exists) return null;
  const d = snap.data() ?? {};
  return {
    id,
    name: (d.name as string) ?? "",
    category: (d.category as string) ?? "",
    difficulty: (d.difficulty as string) ?? "",
    indoorOutdoor: (d.indoorOutdoor as string) ?? "",
    estimatedBudgetMin: (d.estimatedBudgetMin as number) ?? 3000,
    estimatedBudgetMax: (d.estimatedBudgetMax as number) ?? 10000,
    estimatedTimeMinutes: (d.estimatedTimeMinutes as number) ?? 120,
    templateID: (d.templateID as string) ?? "",
  };
}

interface BuiltContent {
  comment: string;
  steps: Array<{
    id: string;
    order: number;
    text: string;
    imageURL: string | null;
    illustrationType: string;
  }>;
  fallback: {
    actualWidth: number;
    actualDepth: number;
    actualHeight: number;
    actualCost: number;
    actualTimeMinutes: number;
    retailer: string;
  };
}

function buildContent(user: SeedUser, uc: UseCase, exampleId: string): BuiltContent {
  const persona = parsePersona(user.bio);
  const rng = new Rng(`backfill::${user.uid}::${exampleId}::${uc.id}`);

  const comment = buildComment(user, persona, uc, rng);

  const stepDefs = stepTemplate(uc, rng);
  const steps = stepDefs.map((s, i) => ({
    id: `step-${String(i + 1).padStart(2, "0")}-${s.type}`,
    order: i + 1,
    text: s.text,
    imageURL: null,
    illustrationType: s.type,
  }));

  const widthBase =
    uc.estimatedBudgetMax >= 30000 ? 1800 : uc.estimatedBudgetMax >= 10000 ? 1200 : 800;
  const w = rng.int(Math.floor(widthBase * 0.7), Math.floor(widthBase * 1.3));
  const d = rng.int(200, 600);
  const h = rng.int(
    200,
    uc.category === "ハンガーラック" || uc.category === "本棚"
      ? 1800
      : uc.category === "デスク・作業台"
      ? 720
      : 1000,
  );
  const cost = rng.int(
    Math.max(1000, Math.floor(uc.estimatedBudgetMin * 0.8)),
    Math.floor(uc.estimatedBudgetMax * 1.1),
  );
  const time = rng.int(
    Math.max(30, Math.floor(uc.estimatedTimeMinutes * 0.7)),
    Math.floor(uc.estimatedTimeMinutes * 1.4),
  );

  return {
    comment,
    steps,
    fallback: {
      actualWidth: w,
      actualDepth: d,
      actualHeight: h,
      actualCost: cost,
      actualTimeMinutes: time,
      retailer: rng.pick(RETAILERS),
    },
  };
}

async function main(): Promise<void> {
  console.log(`🚀  backfill-empty-examples 開始 (DRY=${DRY})`);

  const snap = await db.collection("examples").get();
  console.log(`📚  全 examples: ${snap.size}`);

  const broken: ExampleDoc[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    if (isMissingContent(data)) broken.push({ id: d.id, data });
  }
  console.log(`🛠   要修復: ${broken.length} 件`);

  if (broken.length === 0) {
    console.log("✅  全て正常。終了。");
    process.exit(0);
  }

  const target = LIMIT ? broken.slice(0, LIMIT) : broken;
  console.log(`▶️  処理対象: ${target.length} 件${LIMIT ? ` (--limit=${LIMIT})` : ""}`);

  // ユーザー / useCase を一括 prefetch (重複あり)
  const userIds = Array.from(new Set(target.map((b) => (b.data.authorUID as string) ?? "").filter(Boolean)));
  const ucIds = Array.from(new Set(target.map((b) => (b.data.useCaseID as string) ?? "").filter(Boolean)));
  console.log(`👥  ユニーク author: ${userIds.length} / useCase: ${ucIds.length}`);

  const userCache = new Map<string, SeedUser>();
  const ucCache = new Map<string, UseCase>();
  for (const uid of userIds) {
    const u = await loadUser(uid);
    if (u) userCache.set(uid, u);
  }
  for (const id of ucIds) {
    const c = await loadUseCase(id);
    if (c) ucCache.set(id, c);
  }
  console.log(`📦  prefetch 完了: users=${userCache.size}, useCases=${ucCache.size}`);

  let updated = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;
  const BATCH_SIZE = 400;

  for (const { id, data } of target) {
    const authorUID = (data.authorUID as string) ?? "";
    const useCaseID = (data.useCaseID as string) ?? "";
    const user = userCache.get(authorUID);
    const uc = ucCache.get(useCaseID);
    if (!user || !uc) {
      skipped++;
      console.log(`   ⚠️  skip ${id}: user=${!!user} useCase=${!!uc}`);
      continue;
    }

    const built = buildContent(user, uc, id);

    const update: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {};

    // 必ず書く: comment / steps
    update.comment = built.comment;
    update.steps = built.steps;

    // 欠けていれば補完: 数値・retailer
    if (typeof data.actualWidth !== "number") update.actualWidth = built.fallback.actualWidth;
    if (typeof data.actualDepth !== "number") update.actualDepth = built.fallback.actualDepth;
    if (typeof data.actualHeight !== "number") update.actualHeight = built.fallback.actualHeight;
    if (typeof data.actualCost !== "number") update.actualCost = built.fallback.actualCost;
    if (typeof data.actualTimeMinutes !== "number")
      update.actualTimeMinutes = built.fallback.actualTimeMinutes;
    if (typeof data.retailer !== "string" || data.retailer.length === 0)
      update.retailer = built.fallback.retailer;

    // 欠けていれば補完: useCaseName / authorName
    if (typeof data.useCaseName !== "string" || data.useCaseName.length === 0)
      update.useCaseName = uc.name;
    if (typeof data.authorName !== "string" || data.authorName.length === 0)
      update.authorName = user.displayName;

    // 欠けていれば補完: createdAt / hidden
    if (!data.createdAt) update.createdAt = Timestamp.now();
    if (typeof data.hidden !== "boolean") update.hidden = false;

    update.backfilledAt = FieldValue.serverTimestamp();

    if (DRY) {
      updated++;
      if (updated <= 3) {
        console.log(`   🧪 dry ${id}: ${built.comment.slice(0, 40)}… steps=${built.steps.length}`);
      }
      continue;
    }

    batch.update(db.collection("examples").doc(id), update);
    batchCount++;
    updated++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`   ✓ ${updated}/${target.length} 件 commit (batch=${batchCount})`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (!DRY && batchCount > 0) {
    await batch.commit();
    console.log(`   ✓ 残 ${batchCount} 件 commit`);
  }

  console.log(`\n✅  完了: 更新=${updated} 件 / skip=${skipped} 件${DRY ? " (dry-run)" : ""}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌  失敗:", e);
  process.exit(1);
});
