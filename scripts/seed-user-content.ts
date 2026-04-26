/**
 * ユーザー (users) + 作例 (examples) + コメント (comments) を Firestore に投入する seed スクリプト。
 *
 * 実行:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     npx ts-node --project tsconfig.seed.json scripts/seed-user-content.ts
 *
 * オプション:
 *   --users-only  ユーザープロフィールだけを upsert（作例・コメントは触らない）
 *   --reset       既存の seed examples / comments を全削除してから再投入
 *
 * 投入先 (本番 Firestore):
 *   - users/{uid}                      ← ユーザープロフィール（displayName/bio/photoURL/username）
 *   - usernames/{handle}               ← username 逆引き ({uid, seedTag})
 *   - examples/{auto}                  ← 作例
 *   - examples/{auto}/comments/{auto}  ← 各作例にぶら下がるコメント
 *
 * シード判別:
 *   v1 以降は doc に `seedTag: "zumen-seed-v1"` を付与し、UID は seedKey の sha256 で
 *   ランダムに見える 20 文字へ。--reset はこの seedTag で絞り込んで削除する。
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import * as path from "path";
import * as crypto from "crypto";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS が未設定です");
  process.exit(1);
}

initializeApp({ credential: cert(require(path.resolve(keyPath)) as ServiceAccount) });
const db = getFirestore();

const RESET = process.argv.includes("--reset");
const USERS_ONLY = process.argv.includes("--users-only");

const SEED_TAG = "zumen-seed-v1";

/**
 * seedKey から決定論的な UID を生成。
 * sha256 の先頭 20 文字を使うので、Firebase Auth の UID と見分けがつかない見た目になる。
 * 同じ seedKey は常に同じ UID にマップされるため、再実行で同じ doc を更新できる。
 */
function deterministicUID(seedKey: string): string {
  return crypto.createHash("sha256").update(`zumen-seed::${seedKey}`).digest("hex").slice(0, 20);
}

/**
 * DiceBear で決定論的なイラストアバターを生成（PNG・240px）。
 * 統一感を抑えるため、ユーザーごとに style と背景色を変える。
 * params で facialHair / glasses など性別ヒントになるオプションを注入できる。
 */
function dicebear(
  style: string,
  seed: string,
  bg: string,
  params: Record<string, string> = {},
): string {
  const search = new URLSearchParams({
    seed,
    size: "240",
    backgroundType: "gradientLinear",
    backgroundColor: bg,
    ...params,
  });
  return `https://api.dicebear.com/9.x/${style}/png?${search.toString()}`;
}

/** randomuser.me の写真ライクなアイコン（性別を URL で指定できる）。 */
function randomUser(gender: "men" | "women", num: number): string {
  return `https://randomuser.me/api/portraits/${gender}/${num}.jpg`;
}

// ---- ユーザー (synthetic) ----
// テストデータの統一感を抑えるため:
//  - 名前は @ / _ / スラッシュ / 数字 / 日英混在 で表記ゆれを意図的に作る
//  - アイコンは DiceBear (イラスト) と randomuser.me (写真) を混在させる
//  - 名前から推測される性別と、アイコンの性別表現を一致させる
//  - bio はベテラン/初心者/賃貸/戸建てなど属性を散らし、長さもバラつかせる
//  - username は 8 名に設定、2 名 (mari, ryo) は未設定で fallback (/user/{uid}) を確認できるよう敢えて空
type SeedUser = {
  /** 内部識別子。UID 生成と作例の固定割当に使う。 */
  seedKey: string;
  /** 公開ハンドル（任意）。設定済みなら /u/{username} で公開される */
  username: string | null;
  name: string;
  bio: string;
  photoURL: string;
};

const USERS: SeedUser[] = [
  {
    seedKey: "takashi-zumen",
    username: "takashi_spf",
    name: "タカシ@SPF愛好家",
    photoURL: randomUser("men", 32),
    bio: "築40年の戸建て住まい。SPF1x4と1x6があれば大体のものは作れる、が口癖。先週はキッチンに吊り棚を増設しました。",
  },
  {
    seedKey: "yuko-zumen",
    username: "yuko_balcony",
    name: "yuko_ベランダ部",
    photoURL: dicebear("lorelei", "yuko-zumen", "fce7f3,fef3c7"),
    bio: "都内マンション7F。狭いベランダで植物育てつつ小物を作ります。鉢スタンドの3作目を製作中。",
  },
  {
    seedKey: "kenji-zumen",
    username: "kenji_diy_lab",
    name: "kenji_diy_lab",
    photoURL: dicebear("avataaars", "kenji-zumen", "dbeafe,e0e7ff", {
      facialHair: "beardMedium",
      facialHairProbability: "100",
    }),
    bio: "工具沼の住人。マキタの新機種が出ると衝動買いしてしまう。インパクト3台所持。情報共有歓迎です。",
  },
  {
    seedKey: "mari-zumen",
    username: null, // ハンドル未設定 → /user/{uid} fallback の確認用
    name: "Mari / 木工歴3年",
    photoURL: dicebear("notionists", "mari-zumen", "fde68a,fed7aa"),
    bio: "もとは家具職人志望でした。今はオイルフィニッシュの研究で半年。失敗作もそのまま投稿してます。",
  },
  {
    seedKey: "shota-zumen",
    username: "shota_wfh",
    name: "ショウタ@在宅勤務",
    photoURL: randomUser("men", 47),
    bio: "在宅4年目。デスクまわりにだけは妥協しない。配線を全部裏に通す方法を試行錯誤中。",
  },
  {
    seedKey: "aiko-zumen",
    username: "aiko_2kids",
    name: "aiko_2児ママ",
    photoURL: dicebear("personas", "aiko-zumen", "f5d0fe,fbcfe8"),
    bio: "DIY歴1年の新参です。子供がいるので塗料は食品衛生法適合のものを使ってます。角は必ず丸める派。",
  },
  {
    seedKey: "hideo-zumen",
    username: "hideo_woodshop",
    name: "Hideo / 退職後DIY",
    photoURL: dicebear("micah", "hideo-zumen", "d1fae5,a7f3d0", {
      facialHair: "beard",
      facialHairProbability: "100",
      glassesProbability: "100",
    }),
    bio: "65歳で退職して工房始めました。週末はずっと木と向き合ってます。最近は鉋の扱いを練習中。",
  },
  {
    seedKey: "saya-zumen",
    username: "saya_rentaldiy",
    name: "saya@賃貸OK",
    photoURL: dicebear("big-smile", "saya-zumen", "ffe4e6,fecdd3"),
    bio: "ワンルーム賃貸でDIY。穴あけ無し・両面テープ＋突っ張り棒で何とかする派です。",
  },
  {
    seedKey: "ryo-zumen",
    username: null, // ハンドル未設定
    name: "ryo_ハードウッド派",
    photoURL: randomUser("men", 75),
    bio: "イタウバ・ウリン・セランガンバツを使い分けて庭まわりを整備中。SPFは下地用にしか使いません。",
  },
  {
    seedKey: "emi-zumen",
    username: "emi_3cats",
    name: "emi_猫3匹",
    photoURL: randomUser("women", 23),
    bio: "猫と暮らして10年。市販のキャットタワーが1度倒れてからは全部自作してます。",
  },
];

// 派生情報（ループで毎回計算しないよう先に解決）
type ResolvedUser = SeedUser & { uid: string };
const RESOLVED_USERS: ResolvedUser[] = USERS.map((u) => ({ ...u, uid: deterministicUID(u.seedKey) }));

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

/**
 * users/{uid} を upsert する。
 * - displayName / bio / photoURL / username / seedTag / seedKey は常に上書き
 * - createdAt / followingCount / followerCount は新規作成時のみ初期化
 * - usernames/{handle} 逆引きエントリも書き込む（ハンドル変更時は旧エントリを削除）
 * - 既存 examples の authorName を最新の name に揃える（denormalized なので同期）
 */
async function upsertSeedUsers(): Promise<void> {
  console.log(`👤  ${RESOLVED_USERS.length} 件のユーザープロフィールを upsert します...`);
  for (const u of RESOLVED_USERS) {
    const ref = db.collection("users").doc(u.uid);
    const snap = await ref.get();
    const prevUsername = (snap.data()?.username as string | null | undefined) ?? null;

    const base = {
      displayName: u.name,
      bio: u.bio,
      photoURL: u.photoURL,
      username: u.username,
      seedTag: SEED_TAG,
      seedKey: u.seedKey,
    };
    if (snap.exists) {
      await ref.set(base, { merge: true });
      console.log(`  · ${u.uid} (${u.seedKey}): 更新`);
    } else {
      await ref.set({
        ...base,
        createdAt: Timestamp.now(),
        followingCount: 0,
        followerCount: 0,
      });
      console.log(`  · ${u.uid} (${u.seedKey}): 新規作成`);
    }

    // username 逆引き
    if (prevUsername && prevUsername !== u.username) {
      await db.collection("usernames").doc(prevUsername).delete().catch(() => undefined);
    }
    if (u.username) {
      await db.collection("usernames").doc(u.username).set({
        uid: u.uid,
        seedTag: SEED_TAG,
      });
    }
  }

  // 作例側の denormalize 値を最新へ揃える
  console.log("🔄  既存 examples の authorName を最新化します...");
  let synced = 0;
  for (const u of RESOLVED_USERS) {
    const exSnap = await db.collection("examples").where("authorUID", "==", u.uid).get();
    for (const doc of exSnap.docs) {
      const data = doc.data();
      if (data.authorName === u.name) continue;
      await doc.ref.update({ authorName: u.name });
      synced++;
    }
  }
  console.log(`✅  ユーザー upsert 完了 (examples authorName を ${synced} 件更新)`);
}

/**
 * 既存の v1 seed データ (seedTag === "zumen-seed-v1") を全削除する。
 * users / examples / comments / usernames を網羅。
 */
async function clearSeedData(): Promise<void> {
  console.log("🧹  既存の seed データ (v1) を削除します...");

  const exSnap = await db.collection("examples").where("seedTag", "==", SEED_TAG).get();
  console.log(`  対象 examples: ${exSnap.size} 件`);
  for (const doc of exSnap.docs) {
    const commentsSnap = await doc.ref.collection("comments").get();
    for (const c of commentsSnap.docs) await c.ref.delete();
    await doc.ref.delete();
  }

  const unameSnap = await db.collection("usernames").where("seedTag", "==", SEED_TAG).get();
  console.log(`  対象 usernames: ${unameSnap.size} 件`);
  for (const doc of unameSnap.docs) await doc.ref.delete();

  console.log("✅  削除完了 (users はそのまま — upsert で上書きされます)");
}

async function main() {
  if (RESET) await clearSeedData();

  await upsertSeedUsers();

  if (USERS_ONLY) {
    console.log("✅  --users-only 指定のため終了");
    process.exit(0);
  }

  console.log("📥  作例 + コメントを投入します...");
  let exampleCount = 0;
  let commentCount = 0;

  for (let s = 0; s < SEEDS.length; s++) {
    const seed = SEEDS[s];
    for (let v = 0; v < seed.comments.length; v++) {
      const author = pick(RESOLVED_USERS, s * 7 + v * 3);
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
        seedTag: SEED_TAG,
      };

      const ref = await db.collection("examples").add(data);
      exampleCount++;

      // 紐づくコメントスレッド
      const thread = seed.threadComments[v] ?? [];
      for (let c = 0; c < thread.length; c++) {
        const cAuthor = pick(RESOLVED_USERS, s * 19 + v * 5 + c * 3 + 1);
        const cCreated = Timestamp.fromDate(
          new Date(created.toDate().getTime() + (c + 1) * 86400_000 * randInt(1, 5, s + v + c))
        );
        await ref.collection("comments").add({
          text: thread[c],
          authorUID: cAuthor.uid,
          authorName: cAuthor.name,
          createdAt: cCreated,
          seedTag: SEED_TAG,
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
