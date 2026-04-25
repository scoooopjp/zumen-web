/**
 * 作例 (examples) + コメント (comments) を Firestore に投入する seed スクリプト。
 *
 * 実行:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     npx ts-node --project tsconfig.seed.json scripts/seed-user-content.ts
 *
 * 既に投入済みの seed データを再投入する場合は --reset オプションで全削除→再投入。
 *   npx ts-node ... scripts/seed-user-content.ts -- --reset
 *
 * 投入先 (本番 Firestore):
 *   - examples/{auto}                  ← 作例
 *   - examples/{auto}/comments/{auto}  ← 各作例にぶら下がるコメント
 *
 * すべての seed ドキュメントは authorUID prefix が `seed-` で識別可能。
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as path from "path";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS が未設定です");
  process.exit(1);
}

initializeApp({ credential: cert(require(path.resolve(keyPath)) as ServiceAccount) });
const db = getFirestore();

const RESET = process.argv.includes("--reset");

// ---- ユーザー (synthetic) ----
type SeedUser = { uid: string; name: string };
const USERS: SeedUser[] = [
  { uid: "seed-user-takashi", name: "タカシ" },
  { uid: "seed-user-yuko",    name: "ゆうこ" },
  { uid: "seed-user-kenji",   name: "kenji_diy" },
  { uid: "seed-user-mari",    name: "Mari@木工歴3年" },
  { uid: "seed-user-shota",   name: "ショウタ" },
  { uid: "seed-user-aiko",    name: "あいこ" },
  { uid: "seed-user-hideo",   name: "Hideo" },
  { uid: "seed-user-saya",    name: "さや" },
  { uid: "seed-user-ryo",     name: "りょう" },
  { uid: "seed-user-emi",     name: "えみ" },
];

const RETAILERS = ["カインズ", "コメリ", "コーナン", "DCM"] as const;

function pick<T>(arr: readonly T[], i: number): T { return arr[i % arr.length]; }
function randInt(min: number, max: number, seed: number): number {
  const v = (Math.sin(seed) * 10000) % 1;
  return Math.floor(min + Math.abs(v) * (max - min + 1));
}

function daysAgo(n: number): Timestamp {
  const d = new Date(Date.now() - n * 86400_000);
  return Timestamp.fromDate(d);
}

// ---- 作例テンプレート ----
type ExampleSeed = {
  useCaseID: string;
  useCaseName: string;
  budgetMax: number;       // 元の見積もり最大値 (¥)
  estTimeMinutes: number;  // 元の見積もり時間 (分)
  size?: { w: number; d: number; h: number }; // 実寸 (mm)
  comments: string[];      // 各作例で生成する個別の感想テキスト
  threadComments: string[][]; // 各作例につけるサブコメント (本コメに続くもの) — 列ごとに 1 作例ぶん
};

// 12 useCase × 平均 2.5 例 = 約 30 件
const SEEDS: ExampleSeed[] = [
  {
    useCaseID: "shelf-1", useCaseName: "シンプル壁面棚",
    budgetMax: 6000, estTimeMinutes: 120,
    size: { w: 800, d: 200, h: 30 },
    comments: [
      "リビングの壁に取り付けました。SPF1x6にワトコオイルを塗ってビンテージ感を出してます。下穴をしっかり開けたおかげで割れずに済みました。",
      "賃貸でも石膏ボードアンカーで設置できました。重い本も載せましたが2年目でも全然たわまない。コスパ最強。",
      "初めての棚作りでしたが2時間で完成。ビスは皿取りビットで埋めて木栓したので、表からはほとんど見えないのが満足ポイント。",
    ],
    threadComments: [
      ["ワトコオイルの色は何使いました?", "ダークウォルナットです、2度塗りで深い色になりました!", "ありがとうございます、参考にします"],
      ["賃貸で同じことしたいんですが、ボードアンカー何使いましたか?", "ニトムズの白いやつです。3個で30kgまでいけました", "助かります!"],
      ["皿取りビット、どこで買いましたか?", "カインズで2,000円くらいでした。木栓も同じ径で揃えると綺麗に仕上がります"],
    ],
  },
  {
    useCaseID: "bookshelf-1", useCaseName: "シンプル本棚",
    budgetMax: 8000, estTimeMinutes: 120,
    size: { w: 600, d: 250, h: 1200 },
    comments: [
      "文庫本100冊くらい入る本棚として作りました。SPF2x4で組んで、棚板だけ1x10。かなり頑丈です。",
      "圧迫感を減らしたくて背板なしで作りました。壁にL字金具で固定しているので地震対策もばっちり。",
    ],
    threadComments: [
      ["背板なしだと撓みませんか?", "横方向には筋交い1本入れたので大丈夫です。スタイリッシュに見せたい時はおすすめ"],
      ["1x10の棚板って反りませんか?", "1年経ちますが反りなしです。木裏を上にして取り付けるのがコツとのこと"],
    ],
  },
  {
    useCaseID: "tv-stand-1", useCaseName: "シンプルTV台",
    budgetMax: 10000, estTimeMinutes: 150,
    size: { w: 1200, d: 400, h: 350 },
    comments: [
      "55インチのTVを載せていますがびくともしません。配線穴を後ろに開けたので見た目スッキリ。",
      "ホームセンターで木材カットしてもらったので家での作業は組み立てだけ。3時間で完成しました。",
      "妻と一緒に作りました。塗装をブライワックスで仕上げて、雰囲気出ました。子供も喜んでます。",
    ],
    threadComments: [
      ["配線穴って何ミリで開けました?", "30mmの自在錐で開けました。HDMIとコンセント1個ずつ通せます"],
      ["カットサービスっていくらくらいでした?", "20カットで500円くらいでした。1カット30円くらい"],
      ["ブライワックスの色は?", "ジャコビアンです。SPFが古材っぽくなって最高"],
    ],
  },
  {
    useCaseID: "desk-1", useCaseName: "シンプルデスク",
    budgetMax: 10000, estTimeMinutes: 150,
    size: { w: 1200, d: 600, h: 720 },
    comments: [
      "在宅勤務用に作りました。天板は集成材、脚はSPF2x4。脚にはゴム足つけて床傷防止しています。",
      "ゲーミングデスクとして自作。モニターアーム取付に耐えられるよう、奥側にアングル材で補強入れました。"
    ],
    threadComments: [
      ["モニターアームのクランプって普通に挟めますか?", "天板厚25mmなのでばっちりです。30インチモニター乗せても全然ぐらつきません"],
      ["脚のゴム足どこで買いました?", "コーナンで4個400円くらいでした"],
    ],
  },
  {
    useCaseID: "shoe-rack-1", useCaseName: "玄関シューズラック",
    budgetMax: 6000, estTimeMinutes: 100,
    size: { w: 600, d: 300, h: 900 },
    comments: [
      "賃貸の狭い玄関に合わせて寸法調整。スニーカー20足くらい入ります。1段ごとに高さを変えてブーツも収納可能に。",
      "子供の靴用に低めで作りました。下段にスリッパを置けるように工夫。週末1日でDIY完了!"
    ],
    threadComments: [
      ["寸法調整のコツありますか?", "玄関のスペースを採寸→各段の高さを家にある靴に合わせて決めるとデッドスペースが減ります"],
      ["子供がぶつかっても大丈夫?", "角を全部ヤスリで丸めました。安全第一です"],
    ],
  },
  {
    useCaseID: "hanger-1", useCaseName: "シンプルハンガーラック",
    budgetMax: 6000, estTimeMinutes: 90,
    size: { w: 800, d: 400, h: 1600 },
    comments: [
      "玄関のコート掛け用に。SPF1x4の枠組みに丸棒1本通しただけのシンプル構造。コート10着+バッグ余裕です。",
      "ウォークインクローゼット代わり。1段下にカゴを置いて靴下類を収納してます。",
    ],
    threadComments: [
      ["丸棒は何ミリ?", "30mmです。重いコート10着でも全くたわまない"],
      ["転倒防止どうしてますか?", "上端に金具つけて壁にビス1本固定。子供がぶら下がっても倒れません"],
    ],
  },
  {
    useCaseID: "bench-1", useCaseName: "シンプルウッドベンチ",
    budgetMax: 6000, estTimeMinutes: 120,
    size: { w: 1200, d: 350, h: 420 },
    comments: [
      "玄関ポーチ用に作りました。屋外なのでキシラデコールで防腐塗装。1年経ちましたが劣化なし。",
      "子供の靴を履かせる用に低めで設計。リビングに移動して使ってもいい感じです。"
    ],
    threadComments: [
      ["屋外用塗料って何回塗り?", "下塗り→中塗り→上塗りの3度塗りです。1回で済ませると半年でハゲます"],
      ["重さどれくらい?", "10kg弱です。一人で楽に動かせます"],
    ],
  },
  {
    useCaseID: "planter-1", useCaseName: "プランタースタンド",
    budgetMax: 4000, estTimeMinutes: 90,
    size: { w: 400, d: 300, h: 700 },
    comments: [
      "ベランダで使うため水はけを意識して隙間を5mm空けて板を張りました。底にも穴開けて水抜き対策ばっちり。",
      "ハーブ栽培用に小型版を作りました。室内のキッチン窓辺に置いて毎朝使うバジルが手の届く位置に。",
    ],
    threadComments: [
      ["ベランダの床、汚れません?", "下にトレーを置いて水受けにしてます。今のところ床はきれい"],
      ["室内で土の匂いとか気になりませんか?", "鉢底石をしっかり敷いて排水を良くすれば気にならないですよ"],
    ],
  },
  {
    useCaseID: "wood-deck-1", useCaseName: "ミニウッドデッキ",
    budgetMax: 40000, estTimeMinutes: 480,
    size: { w: 1800, d: 1800, h: 200 },
    comments: [
      "庭の一部にウッドデッキ。ハードウッド(イタウバ)で作ったので15年もつと言われました。週末2日で完成。",
      "コンクリート基礎を打って束柱→根太→デッキ材の手順。水平出しに半日かかりましたが、それさえ終われば後はサクサク。",
      "下地はSPFで節約しました。デッキ材だけハードウッド。費用半分で済んで満足。"
    ],
    threadComments: [
      ["イタウバいくらくらい?", "30x105x4000で1本3,000円くらいでした。送料別"],
      ["束柱の固定どうやりました?", "コンクリ基礎にアンカーボルト埋めてから羽子板金物で固定です"],
      ["メンテどれくらい?", "年1回キシラデコールで防腐塗装。ハードウッドは無塗装でもいけるけど色味維持のために塗ってます"],
    ],
  },
  {
    useCaseID: "garden-table-1", useCaseName: "ガーデンテーブル",
    budgetMax: 15000, estTimeMinutes: 240,
    size: { w: 1200, d: 700, h: 720 },
    comments: [
      "BBQ用に作りました。天板に隙間あけて雨水抜き、脚は2x4を組み合わせて頑丈設計。家族4人で使ってます。",
      "塗装はオイルステインのチーク色。1年経ちますがいい感じに色が深まってきました。"
    ],
    threadComments: [
      ["雨ざらしで大丈夫?", "そのつもりで作りました。1年無傷ですが冬はカバーかけてます"],
      ["BBQの汚れって落ちます?", "トッププレート用にステンレス板敷いてます。汚れたら板だけ取り外して洗えるので便利"],
    ],
  },
  {
    useCaseID: "cat-tower-1", useCaseName: "シンプルキャットタワー",
    budgetMax: 7000, estTimeMinutes: 120,
    size: { w: 500, d: 500, h: 1500 },
    comments: [
      "うちの猫専用にサイズオーダーで作成。麻ロープを巻いた爪とぎポール付き。猫が大喜び!",
      "市販の倒れやすいタワーが嫌で自作しました。ベース重くして安定感UP。地震でも倒れない自信あります。",
    ],
    threadComments: [
      ["麻ロープってどこで?", "コーナンで6mm×30mで800円くらい"],
      ["ベースの重さどうしました?", "MDFを2枚重ねにしてズレ防止のスリップマットも貼ってます"],
    ],
  },
  {
    useCaseID: "fence-1", useCaseName: "木製目隠しフェンス",
    budgetMax: 20000, estTimeMinutes: 360,
    size: { w: 3600, d: 30, h: 1800 },
    comments: [
      "道路側の目隠し用。SPF1x4を縦に隙間20mmで張りました。外からは見えにくいけど風は通るので圧迫感なし。",
      "塗装はオスモのウッドステイン。半透明で木目を活かせます。隣家から「カフェみたい」と褒められました。"
    ],
    threadComments: [
      ["風で倒れたりしません?", "支柱は単管パイプを土に1mくらい埋めて、その上に木材で化粧してます。台風でも無事"],
      ["メンテどれくらい?", "オスモは2-3年に1回塗り直し。意外と長持ちします"],
    ],
  },
  {
    useCaseID: "kids-1", useCaseName: "子供用ローテーブル",
    budgetMax: 8000, estTimeMinutes: 120,
    size: { w: 800, d: 500, h: 350 },
    comments: [
      "3歳の娘用に。角は全部丸く面取りして安全に。塗装は食品衛生法適合のミルクペイント使用。",
      "天板を成長に合わせて高さ変えられるようにダボ穴を3段階で開けました。長く使える工夫です。"
    ],
    threadComments: [
      ["ミルクペイントって食品衛生法適合あるんですか?", "Old Villageのは適合品ありです。子供がなめても安全"],
      ["ダボ穴の精度大事ですよね", "ダボ用治具使えば誰でも揃います。1,500円くらいで買えますよ"],
    ],
  },
];

async function clearSeedData(): Promise<void> {
  console.log("🧹  既存の seed データを削除します...");
  const exSnap = await db.collection("examples")
    .where("authorUID", ">=", "seed-")
    .where("authorUID", "<", "seed-zzzz") // 範囲クエリで seed- prefix を抽出
    .get();
  console.log(`  対象 examples: ${exSnap.size} 件`);
  for (const doc of exSnap.docs) {
    const commentsSnap = await doc.ref.collection("comments").get();
    for (const c of commentsSnap.docs) await c.ref.delete();
    await doc.ref.delete();
  }
  console.log("✅  削除完了");
}

async function main() {
  if (RESET) await clearSeedData();

  console.log("📥  作例 + コメントを投入します...");
  let exampleCount = 0;
  let commentCount = 0;

  for (let s = 0; s < SEEDS.length; s++) {
    const seed = SEEDS[s];
    for (let v = 0; v < seed.comments.length; v++) {
      const author = pick(USERS, s * 7 + v * 3);
      const cost = randInt(Math.floor(seed.budgetMax * 0.6), Math.floor(seed.budgetMax * 1.1), s * 11 + v);
      const time = randInt(Math.floor(seed.estTimeMinutes * 0.7), Math.floor(seed.estTimeMinutes * 1.4), s * 13 + v + 1);
      const retailer = pick(RETAILERS, s * 5 + v);
      const created = daysAgo(randInt(2, 90, s * 17 + v));

      const data = {
        useCaseID: seed.useCaseID,
        useCaseName: seed.useCaseName,
        imageURL: null,
        actualWidth: seed.size?.w ?? null,
        actualDepth: seed.size?.d ?? null,
        actualHeight: seed.size?.h ?? null,
        actualCost: cost,
        actualTimeMinutes: time,
        retailer,
        comment: seed.comments[v],
        authorUID: author.uid,
        authorName: author.name,
        createdAt: created,
        hidden: false,
      };

      const ref = await db.collection("examples").add(data);
      exampleCount++;

      // 紐づくコメントスレッド
      const thread = seed.threadComments[v] ?? [];
      for (let c = 0; c < thread.length; c++) {
        const cAuthor = pick(USERS, s * 19 + v * 5 + c * 3 + 1);
        const cCreated = Timestamp.fromDate(
          new Date(created.toDate().getTime() + (c + 1) * 86400_000 * randInt(1, 5, s + v + c))
        );
        await ref.collection("comments").add({
          text: thread[c],
          authorUID: cAuthor.uid,
          authorName: cAuthor.name,
          createdAt: cCreated,
        });
        commentCount++;
      }
    }
  }

  console.log(`✅  完了: examples=${exampleCount}件 / comments=${commentCount}件`);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌  失敗:", e);
  process.exit(1);
});
