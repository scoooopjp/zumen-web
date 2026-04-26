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
import { getStorage } from "firebase-admin/storage";
import * as path from "path";
import * as crypto from "crypto";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS が未設定です");
  process.exit(1);
}

const STORAGE_BUCKET_NAME = "zumen-d0625.firebasestorage.app";

initializeApp({
  credential: cert(require(path.resolve(keyPath)) as ServiceAccount),
  storageBucket: STORAGE_BUCKET_NAME,
});
const db = getFirestore();
const bucket = getStorage().bucket();

const RESET = process.argv.includes("--reset");
const USERS_ONLY = process.argv.includes("--users-only");
// 既に Storage に置かれているアバターも強制的に再アップロードする（ソース画像差し替え時用）
const FORCE_AVATAR_REUPLOAD = process.argv.includes("--force-avatars");

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

/**
 * 各 seed user の `photoURL` (DiceBear / Unsplash の URL) は「ソース画像」として扱い、
 * Firebase Storage の `users/{uid}/avatar.jpg`（実ユーザーの保存先と同じ）にコピーする。
 * Firestore に書き込む値は Storage の公開 URL に置き換える。
 *
 * - 既に Storage に存在するときはスキップ（`--force-avatars` で再取得）
 * - DiceBear PNG / Unsplash JPEG とも `Content-Type` を保持して保存
 */
async function uploadAvatarFromSource(uid: string, sourceURL: string): Promise<string> {
  const storagePath = `users/${uid}/avatar.jpg`;
  const file = bucket.file(storagePath);
  const publicURL =
    `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET_NAME}` +
    `/o/${encodeURIComponent(storagePath)}?alt=media`;

  if (!FORCE_AVATAR_REUPLOAD) {
    const [exists] = await file.exists();
    if (exists) return publicURL;
  }

  const res = await fetch(sourceURL);
  if (!res.ok) {
    throw new Error(`avatar fetch failed (${res.status}): ${sourceURL}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/jpeg";

  await file.save(buffer, {
    contentType,
    metadata: { cacheControl: "public, max-age=31536000" },
  });

  return publicURL;
}

// ---- ユーザー (synthetic) ----
// テストデータの統一感を抑えるため:
//  - 名前は @ / _ / スラッシュ / 数字 / 日英混在 で表記ゆれを意図的に作る
//  - アイコンは DiceBear のイラスト中心 + 「日本の SNS で典型的な物・ペット写真」を一部混入
//    (ペット写真は Unsplash の固定 photo-id を直接参照)
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

const HAND_CURATED_USERS: SeedUser[] = [
  {
    seedKey: "takashi-zumen",
    username: "takashi_spf",
    name: "タカシ@SPF愛好家",
    photoURL: dicebear("adventurer", "takashi-male-v3", "bae6fd,e0f2fe"),
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
    photoURL: dicebear("notionists", "kenji-zumen-jp", "dbeafe,bfdbfe", {
      beardProbability: "100",
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
    photoURL: dicebear("personas", "shota-male", "fef3c7,fde68a"),
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
    photoURL: dicebear("notionists", "hideo-zumen-jp", "d1fae5,a7f3d0", {
      beardProbability: "100",
    }),
    bio: "65歳で退職して工房始めました。週末はずっと木と向き合ってます。最近は鉋の扱いを練習中。",
  },
  {
    seedKey: "saya-zumen",
    username: "saya_rentaldiy",
    name: "saya@賃貸OK",
    photoURL: dicebear("lorelei", "saya-zumen-jp", "ffe4e6,fecdd3"),
    bio: "ワンルーム賃貸でDIY。穴あけ無し・両面テープ＋突っ張り棒で何とかする派です。",
  },
  {
    seedKey: "ryo-zumen",
    username: null, // ハンドル未設定
    name: "ryo_ハードウッド派",
    photoURL: dicebear("notionists", "ryo-zumen-mature", "d4d4d8,a1a1aa"),
    bio: "イタウバ・ウリン・セランガンバツを使い分けて庭まわりを整備中。SPFは下地用にしか使いません。",
  },
  {
    seedKey: "emi-zumen",
    username: "emi_3cats",
    name: "emi_猫3匹",
    // 「飼い猫を SNS アイコンにする」は日本では定番。emi 本人の bio (猫3匹) と整合させる。
    photoURL: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=240&h=240&fit=crop&crop=faces",
    bio: "猫と暮らして10年。市販のキャットタワーが1度倒れてからは全部自作してます。",
  },
];

// ---- 追加テストユーザー（90 名 / procedurally generated）----
// 男性 30 / 女性 30 / 性別ニュートラル 30。
//  - 男性名 → notionists(beard) / personas(facialHair) で男性表現
//  - 女性名 → lorelei / notionists(beardProbability=0)
//  - ニュートラル枠 → notionists-neutral / bottts-neutral / fun-emoji / モチーフ写真
// `gen-{m|f|n}-NN` を seedKey とし再実行で UID 安定。
type UserSeedTuple = readonly [name: string, username: string | null, bio: string];

const BG_PALETTES: readonly string[] = [
  "ffe4e6,fecdd3", "fef3c7,fde68a", "fed7aa,fdba74", "dbeafe,bfdbfe",
  "d1fae5,a7f3d0", "e9d5ff,d8b4fe", "ccfbf1,99f6e4", "e0e7ff,c7d2fe",
  "e7e5e4,d6d3d1", "bae6fd,e0f2fe",
];

// Unsplash 上で 200 OK が確認できた、人物以外のモチーフ写真（猫・犬・植物・コーヒーなど）
const MOTIF_PHOTOS: readonly string[] = [
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1561948955-570b270e7c36?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1444212477490-ca407925329e?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1463936575829-25148e1db1b8?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1452857297128-d9c29adba80b?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1568736333610-eae6e0ab9206?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1493804714600-6edb1cd93080?w=240&h=240&fit=crop",
  "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=240&h=240&fit=crop",
];

const MALE_SEEDS: readonly UserSeedTuple[] = [
  ["Takeshi / DIY8年", "takeshi_spf_lover", "千葉の戸建て住まい。SPFと2x4が好き。最近は子供部屋の収納を作ってます。"],
  ["ヒロシ@木工", "hiroshi_woodshop", "30代の DIY 中級者。ホームセンターで切ってもらう派。週末は工房にこもります。"],
  ["Yuki_garage", "yuki_garage_lab", "ガレージで工具を集めてます。インパクトとトリマーがあれば何でもできる(と信じてる)。"],
  ["Makoto", "makoto_diy", "築20年のマンション住まい。賃貸OKなDIYを開拓中です。原状回復が前提。"],
  ["Daiki@週末DIY", "daiki_weekend", "平日エンジニア、週末木工職人。図面引いてからじゃないと動けないタイプです。"],
  ["Naoki / ナオキ", null, "DIY始めて3年。最初は失敗だらけでしたが、最近は人にあげても恥ずかしくない仕上がりに。"],
  ["Tatsuya_kobo", "tatsuya_kobo", "京都で工房やってます。注文家具のかたわら、自宅 DIY も。"],
  ["Shun@2x4", "shun_2x4", "2x4 と SPF があれば家全体作れる説、検証中です。"],
  ["Akira_handmade", "akira_handmade", "手作り愛好家。電動工具より手鋸派です。時間はかかるけど精度は出る。"],
  ["Masaki", null, "札幌の戸建て。冬は薪棚作りに精を出してます。北海道のDIY事情、需要あればシェアします。"],
  ["Toshi@庭づくり", "toshi_garden", "庭の整備に5年かかってます。ウッドデッキ、フェンス、物置、全部自作。"],
  ["Yuto / ユート", "yuto_diy_jp", "新卒エンジニアです。一人暮らしのワンルームでもDIYしたい。突っ張り棒最強説。"],
  ["Genki@田舎暮らし", "genki_inaka", "古民家を購入して改装中。床はり替え、漆喰壁、襖まで自分でやります。"],
  ["Kohei_carpenter", "kohei_carpenter", "本業大工です。家のことは商売道具と同じ感覚でいじってしまいます。"],
  ["Soichiro@道具沼", "soichiro_tools", "工具を集めるのが目的になってます。最近は墨壺と差し金が増えてきた。"],
  ["Atsushi_iemori", "atsushi_iemori", "築60年の実家を補修中。床下から屋根まで。父と二人三脚です。"],
  ["Junichi", null, "週末は工具触ってないと落ち着きません。最近の関心はカンナの調整。"],
  ["Ryosuke_works", "ryosuke_works", "DIY歴は浅いですが、図面ソフト(Fusion360)使えるので設計だけは得意です。"],
  ["Tetsuya@工具レビュー", "tetsuya_review", "工具レビュー記事を書いてます。日立(HiKOKI)、マキタ、京セラを比較中。"],
  ["Daisuke_workshop", "daisuke_workshop", "20代後半、最近DIYに目覚めました。とりあえず棚を作りまくってます。"],
  ["Hayato_lab", "hayato_lab", "工学部出身、計算は得意。木材の強度計算してから設計するクセがあります。"],
  ["Kenta@iemori", "kenta_iemori", "中古マンション買って自分でリノベ中。床はり、壁張り、配線まで全部DIY。"],
  ["Ryuji", null, "シニアDIYer。50代後半から始めました。年齢関係なく楽しめる趣味です。"],
  ["Shinji@リフォーム見習い", "shinji_reform", "本業は別ですがリフォームに憧れて勉強中です。施工事例を投稿していきます。"],
  ["Yusuke / ユウスケ", "yusuke_koubou", "実家の工具をもらって始めました。父の遺品の鉋を使うのが楽しい。"],
  ["Wataru_diy", "wataru_diy", "ワンルーム賃貸で精一杯DIY。工具は折りたたみワークベンチ＋電動ドライバーのみ。"],
  ["Tomoya@週末作家", "tomoya_weekend", "本業はサラリーマン、週末は陶芸＋木工。陶器を入れる棚を自作してます。"],
  ["Kazuki_atelier", "kazuki_atelier", "DIYアトリエ運営してます。月1ワークショップ開催中。"],
  ["Norio", null, "60代、工具歴30年。インパクトドライバーが世に出る前から DIY やってます。"],
  ["Yoshi@makers", "yoshi_makers", "デジファブ＋木工。3Dプリンタとレーザーカッターも使います。"],
];

const FEMALE_SEEDS: readonly UserSeedTuple[] = [
  ["Yuka@インテリア", "yuka_interior", "都内マンション暮らし。インテリア系雑誌が好きで、作るものも雑貨寄りです。"],
  ["Miki", "miki_diy_life", "DIY歴2年です。最近はオイルステインの色比較にハマってます。"],
  ["Kanae / カナエ", "kanae_kobo", "築40年戸建てに住んでます。床のリペアからスタートしました。"],
  ["Naomi_handmade", "naomi_handmade", "ハンドメイド全般好きです。木工はその一部。アクセサリーも作ります。"],
  ["Akari@木工女子", "akari_woodgirl", "20代女子。父の影響でDIY始めました。トリマー使えるのが自慢です。"],
  ["Sakura@DIY", "sakura_diy_jp", "賃貸マンションでDIY。原状回復しやすい方法だけ実験中です。"],
  ["Miho_atelier", "miho_atelier", "アトリエ持ってます。といっても自宅の一室です。陶芸＋木工＋革で雑貨制作。"],
  ["Ai / アイ", null, "30代、子供3人。子育ての合間にちょっとずつ作ってます。"],
  ["Riko_diy", "riko_diy", "DIY初心者。失敗作ばかりですが、アプリ参考にがんばってます！"],
  ["Mio@木工女子部", "mio_woodgirls", "木工女子部のメンバーです。月1で集まってワイワイ作ってます。"],
  ["Hina", null, "20代、ハンドメイド系インスタやってます。木工は最近の挑戦分野。"],
  ["Yui_diy_jp", "yui_diy_jp", "賃貸ワンルーム住まい。狭い空間を有効活用するDIYが得意になりました。"],
  ["Tomoko / トモコ", "tomoko_atelier", "40代、子供が独立してから本格的にDIY始めました。第二の人生満喫中。"],
  ["Chiaki@手作り部", "chiaki_handmade", "DIY歴5年。家族には『また何か作ってる』と言われますが楽しいです。"],
  ["Eri@田舎暮らし", "eri_inaka", "長野の田舎で古民家暮らし。薪割り、燻製、DIY全部楽しんでます。"],
  ["Yuri / ユリ", "yuri_studio", "都内で一人暮らし。狭いので作るのは小物中心です。アクセサリー収納など。"],
  ["Kana_studio", "kana_studio", "DIY系YouTuberに憧れて始めました。今は密かに撮影中です。"],
  ["Mariko@古民家", null, "古民家リノベ中。漆喰、塗装、襖張りまで自分でやってます。"],
  ["Natsumi@木工", "natsumi_woodworks", "30代後半。子供部屋の家具を全部自作してから DIY 沼にハマりました。"],
  ["Saki", "saki_diy_log", "DIYログをコツコツつけてます。失敗も含めて記録するのが趣味。"],
  ["Ayumi / アユミ", "ayumi_kobo", "DIY歴8年。最近は鉋削りの練習中です。鏡面仕上げを目指してます。"],
  ["Reina@子供と作る", "reina_kidsdiy", "小2の娘と一緒にDIYしてます。安全第一、塗料も食品衛生法適合のものを。"],
  ["Ami_workshop", "ami_workshop", "20代後半。週末はワークショップ巡り。最近は彫刻刀の使い方を習ってます。"],
  ["Honoka", null, "建築学科出身です。設計だけでなく施工もしてみたくて DIY 始めました。"],
  ["Mai / マイ", "mai_diy", "30代、夫と二人で DIY。意見が合わないときは図面を3パターン引いて選ぶ派。"],
  ["Ayano@DIY部", "ayano_diybu", "会社のDIY部部長です。社内ワークショップを月1で開催中。"],
  ["Ruka_handmade", "ruka_handmade", "ハンドメイドが趣味。最近は木工＋レジン作品を作ってます。"],
  ["Hikari / ヒカリ", "hikari_atelier", "DIYで小遣い稼ぎ始めました。ミンネとクリーマで販売中です。"],
  ["Mizuki@手作り日記", "mizuki_diary", "DIY始めて3ヶ月。何でも作りたい欲が止まりません。"],
  ["Karen", null, "20代女子、初心者DIYer。先輩方の投稿を毎日見て勉強しています。"],
];

const NEUTRAL_SEEDS: readonly UserSeedTuple[] = [
  ["woodlab.jp", "woodlab_jp", "木工系メディアです。技術ノートを蓄積中。"],
  ["diy_garden", "diy_garden", "庭づくりDIYを発信。フェンス、デッキ、プランターまで何でも。"],
  ["庭づくりラボ", "niwa_lab", "庭まわりのDIYを記録するアカウントです。"],
  ["古民家DIY", "kominka_diy", "古民家再生プロジェクト進行中。漆喰・襖・板間・畳まで全部記録。"],
  ["Sunday Carpenter", "sunday_carpenter", "日曜大工アカウント。週末しか動けないから1作業1工程ずつ。"],
  ["spf_master", "spf_master", "SPF材だけで何でも作るのを目指すアカウントです。"],
  ["ハードウッドJP", "hardwood_jp", "ウリン・イペ・イタウバなど、ハードウッド情報専門。"],
  ["賃貸DIY研究所", "rental_diy_lab", "賃貸でも諦めない。原状回復しやすいDIYのアイデア集。"],
  ["tools_collector", "tools_collector", "工具コレクター。新しい工具が出ると我慢できません。"],
  ["iemori (家守)", "iemori_jp", "家を自分で守る、自分で直す。家守としての記録。"],
  ["tiny house jp", "tinyhouse_jp", "タイニーハウス建築中。1坪でも快適に暮らす。"],
  ["plant_dad", "plant_dad", "観葉植物育てつつ、植物用什器をDIY。植木鉢台5作品目。"],
  ["zakka_works", "zakka_works", "雑貨系DIY中心です。小物作品多め。"],
  ["mokkou_log", "mokkou_log", "木工ログ。製作過程と寸法を細かく公開してます。"],
  ["BackyardLab", "backyard_lab", "裏庭で実験的なDIY中。失敗作品も載せます。"],
  ["atelier_2k", null, "築2K一軒家を改修中のアカウントです。"],
  ["家族でDIY", "kazokude_diy", "家族みんなで作るDIYアカウント。子供と一緒の作業中心。"],
  ["ほのぼのDIY", "honobono_works", "焦らずゆっくり、月1作品ペースで作ってます。"],
  ["craft_diary", "craft_diary", "DIYと工作記録を写真で残すアカウント。"],
  ["raw wood lover", "raw_wood_lover", "無垢材好きです。集成材も使うけど、メインは無垢。"],
  ["drill_addict", "drill_addict", "ドリル沼。インパクトとドリルドライバーは別物だと最近気づきました。"],
  ["WORKBENCH.jp", "workbench_jp", "作業台専門のアカウント。MFTテーブル、ホールドファスト等。"],
  ["noki_chigai", null, "屋根まわりのDIYに特化。雨樋、軒先、外壁補修など。"],
  ["工樹建", "kojuken", "工具・木材・建築の3軸でDIYを楽しむアカウント。"],
  ["roomie_diy", "roomie_diy", "ワンルーム住まいDIYer。狭い空間で何ができるか実験中。"],
  ["tsumikoki", "tsumikoki", "積み木のような家具DIYを目指してます。組み合わせ可能な箱モノが好き。"],
  ["monozukuri.lab", "monozukuri_lab", "ものづくり全般。木工、金工、革、樹脂までカバー。"],
  ["boku no kojo", "boku_no_kojo", "自分の工房を作るのが目標。今は車庫で間に合わせ。"],
  ["kanazuchi_san", "kanazuchi_san", "金槌一本でできる DIY を探求するアカウント。釘文化好き。"],
  ["庭百本", "niwa_hyappon", "庭に百本の木を植えるプロジェクト。木材調達も自分で。"],
];

function maleAvatar(seedKey: string, idx: number): string {
  const bg = BG_PALETTES[idx % BG_PALETTES.length];
  if (idx % 2 === 0) {
    return dicebear("notionists", `${seedKey}-jp`, bg, { beardProbability: "100" });
  }
  return dicebear("personas", `${seedKey}-jp-male`, bg, {
    facialHair: "beardMustache",
    facialHairProbability: "100",
  });
}

function femaleAvatar(seedKey: string, idx: number): string {
  const bg = BG_PALETTES[idx % BG_PALETTES.length];
  if (idx % 2 === 0) {
    return dicebear("lorelei", `${seedKey}-jp`, bg);
  }
  return dicebear("notionists", `${seedKey}-jp-female`, bg, { beardProbability: "0" });
}

function neutralAvatar(seedKey: string, idx: number): string {
  const bg = BG_PALETTES[idx % BG_PALETTES.length];
  switch (idx % 4) {
    case 0: return dicebear("notionists-neutral", `${seedKey}-jp`, bg);
    case 1: return dicebear("bottts-neutral", `${seedKey}-jp`, bg);
    case 2: return dicebear("fun-emoji", `${seedKey}-jp`, bg);
    default: return MOTIF_PHOTOS[idx % MOTIF_PHOTOS.length];
  }
}

function buildSeeds(
  category: "m" | "f" | "n",
  tuples: readonly UserSeedTuple[],
  avatar: (seedKey: string, idx: number) => string,
): SeedUser[] {
  return tuples.map(([name, username, bio], i) => {
    const seedKey = `gen-${category}-${String(i + 1).padStart(2, "0")}`;
    return {
      seedKey,
      username,
      name,
      bio,
      photoURL: avatar(seedKey, i),
    };
  });
}

const GENERATED_USERS: SeedUser[] = [
  ...buildSeeds("m", MALE_SEEDS, maleAvatar),
  ...buildSeeds("f", FEMALE_SEEDS, femaleAvatar),
  ...buildSeeds("n", NEUTRAL_SEEDS, neutralAvatar),
];

const USERS: SeedUser[] = [...HAND_CURATED_USERS, ...GENERATED_USERS];

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

    // ソース画像 (DiceBear / Unsplash) を Firebase Storage の users/{uid}/avatar.jpg に
    // コピーし、実ユーザーと同じ URL 形式で配信できるようにする。
    const storedPhotoURL = await uploadAvatarFromSource(u.uid, u.photoURL);

    const base = {
      displayName: u.name,
      bio: u.bio,
      photoURL: storedPhotoURL,
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
