/**
 * Firestore データフェッチ関数 — サーバーサイド専用 (Admin SDK)
 * Firebase 未設定時はモックデータにフォールバック
 * iOS の FirestoreService.swift と DTO スキーマを合わせている
 */
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "./firebase-admin";
import { useCases as mockUseCases } from "./data";
import { getUseCaseById } from "./data";
import { mockExamples } from "./examples";
import type { UseCase, Difficulty, IndoorOutdoor, Retailer } from "./data";
import type { Example, ExampleStep } from "./examples";

// ── Firestore DTOs (iOS の FSUseCase / FSExample と対応) ─────

interface FSUseCase {
  id: string;
  name: string;
  category: string;
  categorySlug?: string;
  templateID: string;
  difficulty: string;
  estimatedBudgetMin: number;
  estimatedBudgetMax: number;
  estimatedTimeMinutes: number;
  indoorOutdoor: string;
  supportedRetailers: string[];
  description?: string;
  imageAlt?: string;
  imageURL?: string;
  exampleCount?: number;
  // i18n: 英語版のテキスト。`scripts/translate-firestore-en.ts` が書き込む。
  // 未設定 (undefined / 空文字) なら日本語にフォールバックする。
  nameEn?: string;
  descriptionEn?: string;
  imageAltEn?: string;
  // Cloud Function `recomputeRatingAggregate` が書き戻す denormalized フィールド。
  ratingCount?: number;
  ratingAverage?: number;
  popularityScore?: number;
}

interface FSExampleStep {
  id?: string;
  order: number;
  text: string;
  imageURL?: string | null;
  /** 一覧・詳細表示用の縮小版 (960px max, JPEG q=0.76)。なければ imageURL にフォールバック。 */
  thumbnailURL?: string | null;
  /** IllType rawValue (iOS と一致) */
  illustrationType?: string | null;
  /** Storage 上の動画パス。Web からは再生せず ▶ オーバーレイ & アプリ誘導のみに使う。 */
  videoPath?: string | null;
}

interface FSExample {
  id: string;
  useCaseID: string;
  useCaseName: string;
  /** UseCase 名の英語版を denormalize したもの (UseCase.nameEn と同期)。
   *  UGC である comment や steps[].text は翻訳しない。 */
  useCaseNameEn?: string;
  imageURL: string | null;
  /** 一覧表示用の縮小版 (960px max, JPEG q=0.76)。なければ imageURL にフォールバック。 */
  thumbnailURL?: string | null;
  actualWidth: number | null;
  actualDepth: number | null;
  actualHeight: number | null;
  actualCost: number;
  actualTimeMinutes: number;
  retailer: string;
  comment: string;
  authorUID: string;
  authorName: string;
  createdAt: FirebaseFirestore.Timestamp;
  hidden?: boolean;
  steps?: FSExampleStep[];
  // Cloud Function `recomputeRatingAggregate` が書き戻す denormalized フィールド。
  ratingCount?: number;
  ratingAverage?: number;
  popularityScore?: number;
}

interface ExampleCountsDoc {
  counts?: Record<string, number>;
  updatedAt?: FirebaseFirestore.Timestamp;
}

// ── Storage URL ベース（リサイズ済み） ────────────────────────
const STORAGE_RESIZED_BASE =
  "https://firebasestorage.googleapis.com/v0/b/zumen-d0625.firebasestorage.app/o/usecase-thumbnails-resized%2F";

/** UseCase 固有サムネイル URL — `{id}.jpg` を参照 */
function getUseCaseThumbnailURL(id: string): string {
  return `${STORAGE_RESIZED_BASE}${encodeURIComponent(id + ".jpg")}?alt=media`;
}

/** dto.imageURL が未設定なら UseCase 固有 URL にフォールバック */
function resolveImageURL(dto: FSUseCase): string {
  if (dto.imageURL) {
    return dto.imageURL
      .replace("usecase-thumbnails%2F", "usecase-thumbnails-resized%2F")
      .replace(/\.png(\?|$)/, ".jpg$1");
  }
  return getUseCaseThumbnailURL(dto.id);
}

// ── i18n フォールバック ──────────────────────────────────────

/**
 * locale="en" かつ英語値が空でない場合は英語、それ以外は日本語を返す。
 * Firestore に翻訳バッチが書き込んだ `*En` フィールドが未設定でも安全に日本語に戻る。
 */
export function pickI18n(ja: string, en: string | null | undefined, locale: string): string {
  if (locale === "en" && typeof en === "string" && en.length > 0) return en;
  return ja;
}

/** 配列版: locale="en" かつ英語配列が non-empty なら英語、それ以外は日本語を返す。 */
export function pickI18nArray(
  ja: string[],
  en: string[] | null | undefined,
  locale: string,
): string[] {
  if (locale === "en" && Array.isArray(en) && en.length > 0) return en;
  return ja;
}

// ── DTO → Model 変換 ─────────────────────────────────────────

/** iOS enum rawValue → Web Difficulty 型 */
function normalizeDifficulty(d: string): Difficulty {
  if (d === "初心者") return "初心者向け";
  if (d === "中級者") return "中級者向け";
  if (d === "上級者") return "上級者向け";
  return d as Difficulty; // already normalized
}

/** iOS enum rawValue → Web IndoorOutdoor 型 */
function normalizeIndoorOutdoor(v: string): IndoorOutdoor {
  if (v === "屋内") return "室内";
  if (v === "屋内・屋外") return "両用";
  return v as IndoorOutdoor; // "屋外" / "両用" already match
}

/** 日本語カテゴリ名 → URL 用 slug（lib/data.ts の categories と一致） */
const CATEGORY_SLUG: Record<string, string> = {
  "棚":             "tana",
  "本棚":           "bookshelf",
  "TV台":           "tv-stand",
  "ダイニングテーブル": "dining-table",
  "デスク・作業台":  "desk",
  "ベンチ":         "bench",
  "ガーデンテーブル": "garden-table",
  "ウッドデッキ":   "deck",
  "ガーデンフェンス": "garden-fence",
  "シューズラック":  "shoe-rack",
  "玄関収納":       "entrance-storage",
  "フラワーボックス": "flower-box",
  "プランター台":   "planter-dai",
  "コンポスト":     "compost",
  "キャットウォーク": "cat-walk",
  "キャットタワー": "cat-tower",
  "犬小屋":         "dog-house",
  "ペット用収納":   "pet-storage",
  "子供用家具":     "kids-furniture",
  "ハンガーラック": "hanger-rack",
  "物置・収納":     "storage-shed",
  "看板・インテリア": "sign",
};

function fsUseCaseToModel(dto: FSUseCase, locale: string): UseCase | null {
  const slug = dto.id;
  const categorySlug = CATEGORY_SLUG[dto.category] ?? dto.categorySlug ?? dto.category;
  const name = pickI18n(dto.name, dto.nameEn, locale);
  const fallbackDescription = locale === "en"
    ? `${name} — DIY blueprint`
    : `${name}のDIY設計図`;
  const fallbackAlt = fallbackDescription;
  const description = pickI18n(
    dto.description ?? fallbackDescription,
    dto.descriptionEn,
    locale,
  );
  const imageAlt = pickI18n(
    dto.imageAlt ?? fallbackAlt,
    dto.imageAltEn,
    locale,
  );

  return {
    id: dto.id,
    slug,
    name,
    category: dto.category,
    categorySlug,
    difficulty: normalizeDifficulty(dto.difficulty),
    estimatedBudgetMin: dto.estimatedBudgetMin,
    estimatedBudgetMax: dto.estimatedBudgetMax,
    estimatedTimeMinutes: dto.estimatedTimeMinutes,
    indoorOutdoor: normalizeIndoorOutdoor(dto.indoorOutdoor),
    supportedRetailers: dto.supportedRetailers as Retailer[],
    templateID: dto.templateID,
    description,
    imageAlt,
    imageURL: resolveImageURL(dto),
    ratingCount: typeof dto.ratingCount === "number" ? dto.ratingCount : 0,
    ratingAverage: typeof dto.ratingAverage === "number" ? dto.ratingAverage : 0,
    popularityScore: typeof dto.popularityScore === "number" ? dto.popularityScore : 0,
  };
}

function fsExampleStepsToModel(steps: FSExampleStep[] | undefined): ExampleStep[] {
  if (!Array.isArray(steps) || steps.length === 0) return [];
  return [...steps]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s, idx) => ({
      id: s.id ?? `step-${idx + 1}`,
      order: typeof s.order === "number" ? s.order : idx + 1,
      text: s.text ?? "",
      imageURL: s.imageURL ?? null,
      thumbnailURL: s.thumbnailURL ?? null,
      illustrationType: s.illustrationType ?? null,
      videoPath: s.videoPath ?? null,
    }));
}

interface AuthorMeta {
  photoURL: string | null;
  username: string | null;
}

function fsExampleToModel(
  dto: FSExample,
  metaMap: Record<string, AuthorMeta> = {},
  locale: string = "ja",
): Example {
  const useCaseID = dto.useCaseID ?? "";
  const useCaseSlug = getUseCaseById(useCaseID)?.slug ?? useCaseID;
  const authorUID = dto.authorUID ?? "";
  const meta = metaMap[authorUID];
  const createdAtTs = dto.createdAt;
  const createdAt =
    createdAtTs && typeof createdAtTs.toDate === "function"
      ? createdAtTs.toDate().toISOString().slice(0, 10)
      : "";

  return {
    id: dto.id,
    useCaseID,
    useCaseName: pickI18n(dto.useCaseName ?? "", dto.useCaseNameEn, locale),
    useCaseSlug,
    imageURL: dto.imageURL ?? null,
    thumbnailURL: dto.thumbnailURL ?? null,
    actualWidth: dto.actualWidth ?? null,
    actualDepth: dto.actualDepth ?? null,
    actualHeight: dto.actualHeight ?? null,
    actualCost: typeof dto.actualCost === "number" ? dto.actualCost : 0,
    actualTimeMinutes:
      typeof dto.actualTimeMinutes === "number" ? dto.actualTimeMinutes : 0,
    retailer: dto.retailer ?? "",
    comment: dto.comment ?? "",
    authorUID,
    authorName: dto.authorName ?? "",
    authorPhotoURL: meta?.photoURL ?? null,
    authorUsername: meta?.username ?? null,
    createdAt,
    steps: fsExampleStepsToModel(dto.steps),
    ratingCount: typeof dto.ratingCount === "number" ? dto.ratingCount : 0,
    ratingAverage: typeof dto.ratingAverage === "number" ? dto.ratingAverage : 0,
    popularityScore: typeof dto.popularityScore === "number" ? dto.popularityScore : 0,
  };
}

function isPublicExample(dto: Pick<FSExample, "hidden">): boolean {
  return dto.hidden !== true;
}

/**
 * 与えられた authorUID 群について users/{uid} の photoURL / username を 1 ラウンドトリップで取得する。
 * Example を表示する画面で投稿者アイコン・公開ハンドルを表示するための join 用ヘルパー。
 */
async function fetchAuthorMetaMap(
  db: FirebaseFirestore.Firestore,
  uids: string[],
): Promise<Record<string, AuthorMeta>> {
  const unique = Array.from(new Set(uids.filter((u) => typeof u === "string" && u.length > 0)));
  if (unique.length === 0) return {};
  try {
    const refs = unique.map((uid) => db.collection("users").doc(uid));
    const docs = await db.getAll(...refs);
    const map: Record<string, AuthorMeta> = {};
    for (const d of docs) {
      if (!d.exists) continue;
      const data = d.data() ?? {};
      map[d.id] = {
        photoURL: (data.photoURL as string | null) ?? null,
        username: (data.username as string | null) ?? null,
      };
    }
    return map;
  } catch (e) {
    console.error("[firestore] fetchAuthorMetaMap failed:", e);
    return {};
  }
}

// ── UseCases ────────────────────────────────────────────────

// useCases コレクションの生 DTO を 1 時間キャッシュ。`/search` が force-dynamic なため、
// クローラーや高頻度アクセスでも 1 時間に 1 回の collection scan (約 50 reads) で済むようにする。
// locale を引数に取らない (= ロケール非依存の DTO のみ) ことで、ja/en のレンダリングが
// キャッシュを共有する。書き込みは scripts/translate-firestore-en.ts などの管理バッチからのみ。
const fetchUseCaseDocsRaw = unstable_cache(
  async (): Promise<FSUseCase[]> => {
    const db = getAdminDb();
    if (!db) return [];
    try {
      const snap = await db.collection("useCases").get();
      if (snap.empty) return [];
      return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSUseCase));
    } catch (e) {
      console.error("[firestore] fetchUseCaseDocsRaw failed:", e);
      return [];
    }
  },
  ["firestore-usecases-raw-v1"],
  { revalidate: 3600 }
);

const fetchFeaturedConfigRaw = unstable_cache(
  async (): Promise<string[]> => {
    const db = getAdminDb();
    if (!db) return [];
    try {
      const snap = await db.collection("config").doc("featured").get();
      const ids = (snap.data()?.popularUseCaseIds ?? []) as string[];
      return Array.isArray(ids) ? ids : [];
    } catch (e) {
      console.error("[firestore] fetchFeaturedConfigRaw failed:", e);
      return [];
    }
  },
  ["firestore-featured-config-v1"],
  { revalidate: 3600 }
);

export async function fetchUseCases(locale: string = "ja"): Promise<UseCase[]> {
  const dtos = await fetchUseCaseDocsRaw();
  if (dtos.length === 0) return mockUseCases;
  // 一覧トップは人気順 (popularityScore 降順 → category)。useCases は ~50 件と少ないので
  // 全件取得してクライアント (= server component) 側でソートし、popularityScore 未設定 doc を
  // 取りこぼさない。iOS の fetchUseCases と同じ挙動。
  const results = dtos
    .map((dto) => fsUseCaseToModel(dto, locale))
    .filter((uc): uc is UseCase => uc !== null);
  results.sort((a, b) => {
    const sa = a.popularityScore ?? 0;
    const sb = b.popularityScore ?? 0;
    if (sa !== sb) return sb - sa;
    return a.category.localeCompare(b.category, "ja");
  });
  return results.length > 0 ? results : mockUseCases;
}

// ── Featured UseCases (人気の設計図) ─────────────────────────
// `config/featured` ドキュメント (scripts/update-featured.ts が書き込み)
// の popularUseCaseIds を参照し、ID 順で UseCase を返す。

export async function fetchFeaturedUseCases(
  limit = 6,
  locale: string = "ja",
): Promise<UseCase[]> {
  try {
    const ids = await fetchFeaturedConfigRaw();
    const dtos = await fetchUseCaseDocsRaw();
    if (dtos.length === 0) return mockUseCases.slice(0, limit);

    if (ids.length === 0) {
      // featured 未設定時は通常一覧の先頭を返す
      const all = await fetchUseCases(locale);
      return all.slice(0, limit);
    }

    // キャッシュ済みの全 useCase 辞書から ID 引き。db.getAll を回避し、追加 read ゼロで返す。
    const byId = new Map(dtos.map((d) => [d.id, d]));
    const results: UseCase[] = [];
    for (const id of ids.slice(0, limit)) {
      const dto = byId.get(id);
      if (!dto) continue;
      const model = fsUseCaseToModel(dto, locale);
      if (model) results.push(model);
    }
    return results.length > 0 ? results : mockUseCases.slice(0, limit);
  } catch (e) {
    console.error("[firestore] fetchFeaturedUseCases failed:", e);
    return mockUseCases.slice(0, limit);
  }
}

// ── Single UseCase ───────────────────────────────────────────

export async function fetchUseCaseById(
  id: string,
  locale: string = "ja",
): Promise<UseCase | null> {
  const db = getAdminDb();
  if (!db) return getUseCaseById(id) ?? null;
  try {
    const snap = await db.collection("useCases").doc(id).get();
    if (!snap.exists) return getUseCaseById(id) ?? null;
    return fsUseCaseToModel({ id: snap.id, ...snap.data() } as FSUseCase, locale);
  } catch (e) {
    console.error(`[firestore] fetchUseCaseById(${id}) failed:`, e);
    return getUseCaseById(id) ?? null;
  }
}

// ── Blueprint ────────────────────────────────────────────────

export interface FSBlueprintTool {
  name: string;
  note?: string;
  nameEn?: string;
  noteEn?: string;
}

export interface FSBlueprintStep {
  order: number;
  title: string;
  description: string;
  /** IllType rawValue (e.g. "measure", "cut", "screw") */
  illustrationType?: string;
  /** コツ・時短テクニック (enrich-blueprints で追加) */
  tips?: string[];
  /** 失敗例とリカバリ方法 (enrich-blueprints で追加) */
  pitfalls?: string[];
  /** 想定所要時間（分） */
  estimatedMinutes?: number;
  // i18n
  titleEn?: string;
  descriptionEn?: string;
  tipsEn?: string[];
  pitfallsEn?: string[];
}

export interface FSBlueprintPart {
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  note?: string;
  // i18n
  nameEn?: string;
  specEn?: string;
  noteEn?: string;
}

export interface FSBlueprintCutItem {
  partName: string;
  thickness: number;
  width: number;
  length: number;
  quantity: number;
  // i18n
  partNameEn?: string;
}

export interface FSBlueprintDetail {
  useCaseID: string;
  templateID: string;
  name: string;
  category: string;
  indoorOutdoor: string;
  dimensions: { width: number; depth: number; height: number };
  warnings: string[];
  tools: FSBlueprintTool[];
  steps: FSBlueprintStep[];
  parts: FSBlueprintPart[];
  cutItems: FSBlueprintCutItem[];
  // i18n
  nameEn?: string;
  warningsEn?: string[];
}

/**
 * FSBlueprintDetail の翻訳可能フィールドを locale に応じて差し替えた新オブジェクトを返す。
 * `*En` が空または locale==="ja" のときは日本語値にフォールバックする。
 * 翻訳バッチ未実行のドキュメントでもクラッシュせず、JA で表示できる。
 */
export function localizeBlueprint(
  fs: FSBlueprintDetail,
  locale: string,
): FSBlueprintDetail {
  if (locale !== "en") return fs;
  return {
    ...fs,
    name: pickI18n(fs.name, fs.nameEn, locale),
    warnings: pickI18nArray(fs.warnings, fs.warningsEn, locale),
    tools: fs.tools.map((tool) => ({
      ...tool,
      name: pickI18n(tool.name, tool.nameEn, locale),
      note: tool.note !== undefined
        ? pickI18n(tool.note, tool.noteEn, locale)
        : tool.note,
    })),
    steps: fs.steps.map((s) => ({
      ...s,
      title: pickI18n(s.title, s.titleEn, locale),
      description: pickI18n(s.description, s.descriptionEn, locale),
      tips: s.tips ? pickI18nArray(s.tips, s.tipsEn, locale) : s.tips,
      pitfalls: s.pitfalls
        ? pickI18nArray(s.pitfalls, s.pitfallsEn, locale)
        : s.pitfalls,
    })),
    parts: fs.parts.map((p) => ({
      ...p,
      name: pickI18n(p.name, p.nameEn, locale),
      spec: pickI18n(p.spec, p.specEn, locale),
      note: p.note !== undefined ? pickI18n(p.note, p.noteEn, locale) : p.note,
    })),
    cutItems: fs.cutItems.map((c) => ({
      ...c,
      partName: pickI18n(c.partName, c.partNameEn, locale),
    })),
  };
}

export async function fetchBlueprintByUseCaseID(
  useCaseID: string,
  locale: string = "ja",
): Promise<FSBlueprintDetail | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const snap = await db.collection("blueprints").doc(useCaseID).get();
    if (!snap.exists) return null;
    const fs = snap.data() as FSBlueprintDetail;
    return localizeBlueprint(fs, locale);
  } catch (e) {
    console.error(`[firestore] fetchBlueprintByUseCaseID(${useCaseID}) failed:`, e);
    return null;
  }
}

// ── Examples ────────────────────────────────────────────────

// 作例一覧の取得上限。`examples` は 6M reads/月 (= 全 reads の 90%) を占めていたため、
// limit() 必須の規約を撹回避策として default で強制する。呼び出し側は表示に必要な分だけ
// 上書きで指定すること。デフォルトは「/example 一覧の 1 ページ分」相当。
const DEFAULT_EXAMPLE_LIST_LIMIT = 60;
const DEFAULT_EXAMPLES_BY_USECASE_LIMIT = 24;
const DEFAULT_EXAMPLES_BY_AUTHOR_LIMIT = 60;

export async function fetchExamples(
  useCaseID?: string,
  locale: string = "ja",
  limit?: number,
): Promise<Example[]> {
  const effectiveLimit =
    typeof limit === "number" && limit > 0
      ? limit
      : useCaseID
        ? DEFAULT_EXAMPLES_BY_USECASE_LIMIT
        : DEFAULT_EXAMPLE_LIST_LIMIT;

  const db = getAdminDb();
  if (!db) {
    const all = useCaseID
      ? mockExamples.filter((e) => e.useCaseID === useCaseID)
      : mockExamples;
    return all.slice(0, effectiveLimit);
  }
  try {
    // 一覧トップ (作例 list / blueprint カテゴリ詳細) は人気順:
    // popularityScore 降順 → createdAt 降順。pickup は fetchRecentExamples を使うこと。
    const col = db.collection("examples");
    const base = useCaseID
      ? col
          .where("useCaseID", "==", useCaseID)
          .orderBy("popularityScore", "desc")
          .orderBy("createdAt", "desc")
      : col
          .orderBy("popularityScore", "desc")
          .orderBy("createdAt", "desc");
    // `hidden==true` は filter() で落としているので、limit にバッファを乗せて取りこぼしを防ぐ。
    const q = base.limit(effectiveLimit + 5);
    const snap = await q.get();
    if (snap.empty) return [];

    const dtos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as FSExample))
      .filter(isPublicExample)
      .slice(0, effectiveLimit);
    if (dtos.length === 0) return [];

    const metaMap = await fetchAuthorMetaMap(db, dtos.map((e) => e.authorUID));
    return dtos.map((dto) => fsExampleToModel(dto, metaMap, locale));
  } catch (e) {
    console.error(`[firestore] fetchExamples(${useCaseID ?? "all"}) failed:`, e);
    const fallback = useCaseID
      ? mockExamples.filter((e) => e.useCaseID === useCaseID)
      : mockExamples;
    return fallback.slice(0, effectiveLimit);
  }
}

/**
 * /example 一覧のページネーション用。`popularityScore desc, createdAt desc` を
 * keyset (startAfter) で進めることで、毎ページ Firestore 既知の最大 N+5 reads に抑えられる。
 * popularityScore + createdAt がタイの 2 件は事実上ほぼ無いが、衝突しても 1 件取り逃がす程度
 * (= 表示順が安定しない) で済む。
 */
export interface ExampleCursor {
  popularityScore: number;
  /** ISO 8601 (full precision)。クライアントから受け取るので serializable で渡す。 */
  createdAtISO: string;
}

export interface ExamplePage {
  examples: Example[];
  /** 次ページが存在しなければ null。これをそのまま次の fetchExamplePage に渡す。 */
  nextCursor: ExampleCursor | null;
}

export async function fetchExamplePage(opts: {
  locale?: string;
  limit?: number;
  cursor?: ExampleCursor | null;
}): Promise<ExamplePage> {
  const limit = opts.limit && opts.limit > 0 ? opts.limit : 24;
  const locale = opts.locale ?? "ja";
  const cursor = opts.cursor ?? null;

  const db = getAdminDb();
  if (!db) {
    // mock fallback はカーソル無視 (= 1 ページ目のみ)。本番では発生しない。
    if (cursor) return { examples: [], nextCursor: null };
    return { examples: mockExamples.slice(0, limit), nextCursor: null };
  }

  try {
    let q = db
      .collection("examples")
      .orderBy("popularityScore", "desc")
      .orderBy("createdAt", "desc");

    if (cursor) {
      const ts = Timestamp.fromDate(new Date(cursor.createdAtISO));
      q = q.startAfter(cursor.popularityScore, ts);
    }

    const snap = await q.limit(limit + 5).get();
    if (snap.empty) return { examples: [], nextCursor: null };

    const allDtos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSExample));
    const visible = allDtos.filter(isPublicExample).slice(0, limit);
    if (visible.length === 0) return { examples: [], nextCursor: null };

    const metaMap = await fetchAuthorMetaMap(db, visible.map((e) => e.authorUID));
    const examples = visible.map((dto) => fsExampleToModel(dto, metaMap, locale));

    // hasMore: 取れた raw 件数 (hidden 込み) が要求 limit を超えていれば次がある可能性あり。
    const hasMore = allDtos.length > limit;
    const lastDto = visible[visible.length - 1];
    const nextCursor: ExampleCursor | null =
      hasMore && lastDto?.createdAt
        ? {
            popularityScore:
              typeof lastDto.popularityScore === "number" ? lastDto.popularityScore : 0,
            createdAtISO: lastDto.createdAt.toDate().toISOString(),
          }
        : null;

    return { examples, nextCursor };
  } catch (e) {
    console.error("[firestore] fetchExamplePage failed:", e);
    return { examples: [], nextCursor: null };
  }
}

export const fetchExampleById = cache(
  async (id: string, locale: string = "ja"): Promise<Example | null> => {
    const db = getAdminDb();
    if (!db) return mockExamples.find((e) => e.id === id) ?? null;

    try {
      const snap = await db.collection("examples").doc(id).get();
      if (!snap.exists) return null;

      const dto = { id: snap.id, ...snap.data() } as FSExample;
      if (!isPublicExample(dto)) return null;

      const metaMap = await fetchAuthorMetaMap(db, [dto.authorUID]);
      return fsExampleToModel(dto, metaMap, locale);
    } catch (e) {
      console.error(`[firestore] fetchExampleById(${id}) failed:`, e);
      return mockExamples.find((e) => e.id === id) ?? null;
    }
  }
);

export async function fetchRecentExamples(
  limit = 3,
  locale: string = "ja",
): Promise<Example[]> {
  const db = getAdminDb();
  if (!db) return mockExamples.slice(0, limit);

  try {
    const snap = await db
      .collection("examples")
      .orderBy("createdAt", "desc")
      .limit(Math.max(limit * 2, limit))
      .get();
    if (snap.empty) return [];

    const dtos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as FSExample))
      .filter(isPublicExample)
      .slice(0, limit);
    if (dtos.length === 0) return [];

    const metaMap = await fetchAuthorMetaMap(db, dtos.map((e) => e.authorUID));
    return dtos.map((dto) => fsExampleToModel(dto, metaMap, locale));
  } catch (e) {
    console.error(`[firestore] fetchRecentExamples(${limit}) failed:`, e);
    return mockExamples.slice(0, limit);
  }
}

function buildExampleCounts(examples: Array<{ useCaseID: string }>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const ex of examples) {
    counts[ex.useCaseID] = (counts[ex.useCaseID] ?? 0) + 1;
  }
  return counts;
}

// `config/exampleCounts` doc の鮮度 TTL。これを過ぎたら recompute を発火する。
// 旧実装は 15 分 + 全件 scan で `examples` reads を 6M/月レベルまで膨らませていた。
// 24 時間 + count() 集約で 1 日 1 回 (= 約 50 reads) に抑え込む。
const EXAMPLE_COUNTS_TTL_MS = 24 * 60 * 60 * 1000;

const loadExampleCountsDoc = unstable_cache(
  async (): Promise<ExampleCountsDoc | null> => {
    const db = getAdminDb();
    if (!db) return null;
    try {
      const snap = await db.collection("config").doc("exampleCounts").get();
      return snap.exists ? (snap.data() as ExampleCountsDoc) : null;
    } catch (e) {
      console.error("[firestore] loadExampleCountsDoc failed:", e);
      return null;
    }
  },
  ["firestore-example-counts-doc-v2"],
  { revalidate: 600 }
);

/**
 * useCase ごとに count() 集約を投げて作例件数を再計算する。
 * 旧実装は examples コレクションの全件 select() で N reads を消費していたが、
 * count() を使うと「マッチしたインデックスエントリ 1k 件あたり 1 read」課金なので
 * 50 useCases × 約 1 read = 50 reads/recompute まで圧縮できる。
 *
 * トレードオフ: hidden==true の doc も 1 件としてカウントしてしまう (count() に
 * 不等価フィルタを掛けると複合 index が必要になり運用負担が増えるため)。hidden は
 * 通報対応など極めて稀なので、表示上の作例件数が稀に +1 ずれてもユーザー影響は小さい。
 * 厳密性が必要になったら scripts/recompute-example-counts.ts を別途バッチで回す。
 */
async function recomputeExampleCounts(
  db: FirebaseFirestore.Firestore,
): Promise<Record<string, number>> {
  const useCaseDtos = await fetchUseCaseDocsRaw();
  if (useCaseDtos.length === 0) return {};

  const counts: Record<string, number> = {};
  await Promise.all(
    useCaseDtos.map(async (uc) => {
      try {
        const agg = await db
          .collection("examples")
          .where("useCaseID", "==", uc.id)
          .count()
          .get();
        counts[uc.id] = agg.data().count ?? 0;
      } catch (e) {
        console.warn(`[firestore] count(useCaseID==${uc.id}) failed:`, e);
        counts[uc.id] = 0;
      }
    }),
  );
  return counts;
}

/**
 * useCaseID 別の作例件数を返す（厳密性は recomputeExampleCounts のコメント参照）。
 * 実体は `config/exampleCounts` の denormalized doc。stale なら count() 集約で再計算。
 * 同一リクエスト内で複数ページから呼ばれても React `cache` で重複取得を防ぐ。
 */
export const fetchExampleCountsByUseCase = cache(
  async (): Promise<Record<string, number>> => {
    const db = getAdminDb();
    if (!db) return buildExampleCounts(mockExamples);

    try {
      const doc = await loadExampleCountsDoc();
      const updatedAt = doc?.updatedAt?.toDate?.();
      const isFresh =
        updatedAt instanceof Date &&
        Date.now() - updatedAt.getTime() < EXAMPLE_COUNTS_TTL_MS;
      if (doc?.counts && isFresh) {
        return doc.counts;
      }

      const counts = await recomputeExampleCounts(db);
      // doc が空のまま recompute も失敗 (= 全 useCase が 0) は既存値を返してフォールバック。
      if (Object.keys(counts).length === 0 && doc?.counts) {
        return doc.counts;
      }
      void db
        .collection("config")
        .doc("exampleCounts")
        .set({ counts, updatedAt: new Date() }, { merge: true })
        .catch((e) => {
          console.warn("[firestore] exampleCounts write failed:", e);
        });
      return counts;
    } catch (e) {
      console.error("[firestore] fetchExampleCountsByUseCase failed:", e);
      return buildExampleCounts(mockExamples);
    }
  },
);

export async function fetchExamplesByAuthor(
  authorUID: string,
  locale: string = "ja",
  limit: number = DEFAULT_EXAMPLES_BY_AUTHOR_LIMIT,
): Promise<Example[]> {
  const db = getAdminDb();
  if (!db) {
    return mockExamples.filter((e) => e.authorUID === authorUID).slice(0, limit);
  }
  try {
    const snap = await db
      .collection("examples")
      .where("authorUID", "==", authorUID)
      .orderBy("createdAt", "desc")
      .limit(limit + 5)
      .get();
    if (snap.empty) return [];
    const dtos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as FSExample))
      .filter(isPublicExample)
      .slice(0, limit);
    if (dtos.length === 0) return [];

    const metaMap = await fetchAuthorMetaMap(db, [authorUID]);
    return dtos.map((dto) => fsExampleToModel(dto, metaMap, locale));
  } catch (e) {
    console.error(`[firestore] fetchExamplesByAuthor(${authorUID}) failed:`, e);
    return [];
  }
}

// ── Users ────────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  displayName: string;
  bio: string;
  photoURL: string | null;
  /** 公開ハンドル。null の場合は UID ベースの URL にフォールバックする */
  username: string | null;
  createdAt: string; // ISO date string
  followingCount: number;
  followerCount: number;
}

function userDocToProfile(uid: string, data: FirebaseFirestore.DocumentData): UserProfile {
  const created = data.createdAt as FirebaseFirestore.Timestamp | undefined;
  return {
    uid,
    displayName: (data.displayName as string) ?? "ユーザー",
    bio: (data.bio as string) ?? "",
    photoURL: (data.photoURL as string | null) ?? null,
    username: (data.username as string | null) ?? null,
    createdAt: created ? created.toDate().toISOString().slice(0, 10) : "",
    followingCount: (data.followingCount as number) ?? 0,
    followerCount: (data.followerCount as number) ?? 0,
  };
}

// プロフィールは「displayName / bio / photoURL の更新は数日に 1 回」レベルで変動が穏やかなので
// 10 分の cross-request cache で十分。/u/[handle] (revalidate=300) や OG 画像 (revalidate=86400)
// 経由のリクエストが SNS unfurl などで集中したときの users / usernames reads を抑える。
const PROFILE_CACHE_TTL_S = 600;

export const fetchUserProfile = unstable_cache(
  async (uid: string): Promise<UserProfile | null> => {
    const db = getAdminDb();
    if (!db) return null;
    try {
      const snap = await db.collection("users").doc(uid).get();
      if (!snap.exists) return null;
      return userDocToProfile(uid, snap.data() ?? {});
    } catch (e) {
      console.error(`[firestore] fetchUserProfile(${uid}) failed:`, e);
      return null;
    }
  },
  ["firestore-user-profile-v1"],
  { revalidate: PROFILE_CACHE_TTL_S },
);

/**
 * `usernames/{handle}` 逆引きから UID を解決し、users/{uid} を取得する。
 * 二段読みになるが、ハンドルは変更可能なので逆引きを介すのが正しい運用。
 */
export const fetchUserProfileByUsername = unstable_cache(
  async (username: string): Promise<UserProfile | null> => {
    const db = getAdminDb();
    if (!db) return null;
    try {
      const handleSnap = await db.collection("usernames").doc(username).get();
      if (!handleSnap.exists) return null;
      const uid = handleSnap.data()?.uid as string | undefined;
      if (!uid) return null;
      const userSnap = await db.collection("users").doc(uid).get();
      if (!userSnap.exists) return null;
      return userDocToProfile(uid, userSnap.data() ?? {});
    } catch (e) {
      console.error(`[firestore] fetchUserProfileByUsername(${username}) failed:`, e);
      return null;
    }
  },
  ["firestore-user-profile-by-username-v1"],
  { revalidate: PROFILE_CACHE_TTL_S },
);

// ── Comments / Ratings ───────────────────────────────────────
// iOS の ContentTarget(.example / .useCase) と対応。
// 親コレクション配下の `comments` / `ratings` サブコレクションを参照する。

export type ContentTargetKind = "example" | "useCase";

export interface ContentTarget {
  kind: ContentTargetKind;
  id: string;
}

function targetCollection(kind: ContentTargetKind): "examples" | "useCases" {
  return kind === "example" ? "examples" : "useCases";
}

export interface Comment {
  id: string;
  text: string;
  authorUID: string;
  authorName: string;
  /** 投稿時点の投稿者プロフィール画像 URL。投稿後にプロフィール画像が更新されても遡及しない。 */
  authorPhotoURL: string | null;
  /** users/{uid}.username を join した値(投稿時点のスナップショットではなく現在値) */
  authorUsername: string | null;
  /** ISO 文字列 (Date オブジェクトはサーバー→クライアント境界で扱いづらいため文字列化) */
  createdAt: string;
}

export interface RatingSummary {
  count: number;
  /** 1-5 の平均値。count==0 の場合は 0 */
  average: number;
}

export interface CommentSummary {
  /** 表示用の最新コメント (createdAt 降順, 最大 COMMENTS_DISPLAY_LIMIT 件)。 */
  comments: Comment[];
  /** 親 doc 配下のコメント総数。limit に達していない場合は comments.length と一致。 */
  total: number;
}

// 表示は通常 3 件 + アプリ誘導なので 50 件分の余剰を確保する。これを超える分は
// 「アプリで続きを見る」CTA に集約する。limit を超えた場合のみ count() で正確な総数を取る。
const COMMENTS_DISPLAY_LIMIT = 50;

/**
 * 旧実装は `comments` サブコレクションを `.get()` で全件取得しており、人気図面に
 * コメントが溜まると線形に reads が増える危険があった。最新 N 件 + count() 集約に置換。
 *
 * 表示順の変更に注意: 旧実装は `orderBy("createdAt","asc")` だったので「最も古い 3 件」
 * が表示されていた。新実装では新 → 古の順を返すので、UI 側は先頭から表示すれば
 * 「最新 3 件」になる。
 */
export const fetchCommentSummary = cache(
  async (target: ContentTarget): Promise<CommentSummary> => {
    const db = getAdminDb();
    if (!db) return { comments: [], total: 0 };
    try {
      const parentDoc = db.collection(targetCollection(target.kind)).doc(target.id);
      const snap = await parentDoc
        .collection("comments")
        .orderBy("createdAt", "desc")
        .limit(COMMENTS_DISPLAY_LIMIT)
        .get();

      if (snap.empty) return { comments: [], total: 0 };

      const dtos = snap.docs
        .map((d) => {
          const data = d.data();
          const text = data.text as string | undefined;
          const authorUID = data.authorUID as string | undefined;
          const authorName = data.authorName as string | undefined;
          const ts = data.createdAt as FirebaseFirestore.Timestamp | undefined;
          if (!text || !authorUID || !authorName || !ts) return null;
          return {
            id: d.id,
            text,
            authorUID,
            authorName,
            authorPhotoURL: (data.authorPhotoURL as string | null) ?? null,
            createdAt: ts.toDate().toISOString(),
          };
        })
        .filter((c): c is Omit<Comment, "authorUsername"> => c !== null);
      if (dtos.length === 0) return { comments: [], total: 0 };

      // 取得分が limit に達していなければ取得数 = 総数。達していれば count() で取り直す
      // (count() は1k マッチあたり 1 read)。
      let total = dtos.length;
      if (snap.docs.length >= COMMENTS_DISPLAY_LIMIT) {
        try {
          const agg = await parentDoc.collection("comments").count().get();
          total = agg.data().count ?? dtos.length;
        } catch (e) {
          console.warn(
            `[firestore] commentCount(${target.kind}/${target.id}) failed:`,
            e,
          );
        }
      }

      // username/photoURL を users から join。photoURL は投稿時点のスナップショット優先。
      const metaMap = await fetchAuthorMetaMap(db, dtos.map((c) => c.authorUID));
      const comments: Comment[] = dtos.map((c) => ({
        ...c,
        authorPhotoURL: c.authorPhotoURL ?? metaMap[c.authorUID]?.photoURL ?? null,
        authorUsername: metaMap[c.authorUID]?.username ?? null,
      }));
      return { comments, total };
    } catch (e) {
      console.error(`[firestore] fetchCommentSummary(${target.kind}/${target.id}) failed:`, e);
      return { comments: [], total: 0 };
    }
  },
);

/**
 * 後方互換。新規呼び出しは fetchCommentSummary を使うこと (総数を併せて取得できる)。
 */
export const fetchComments = cache(
  async (target: ContentTarget): Promise<Comment[]> => {
    const summary = await fetchCommentSummary(target);
    return summary.comments;
  },
);

/**
 * 評価集計を取得する。
 * 1. `<parent>/<id>/aggregates/ratings` を優先で読む(Cloud Functions が再計算する集計 doc)。
 * 2. 集計 doc が未生成のときだけ subcollection を全件スキャンしてフォールバック。
 *    バックフィル後や新規評価が付き次第、自動で集計 doc が作られる。
 */
export const fetchRatingSummary = cache(
  async (target: ContentTarget): Promise<RatingSummary> => {
    const db = getAdminDb();
    if (!db) return { count: 0, average: 0 };
    try {
      const parentDoc = db.collection(targetCollection(target.kind)).doc(target.id);
      const aggSnap = await parentDoc.collection("aggregates").doc("ratings").get();
      if (aggSnap.exists) {
        const data = aggSnap.data() ?? {};
        const count = typeof data.count === "number" ? data.count : 0;
        const average = typeof data.average === "number" ? data.average : 0;
        return { count, average };
      }

      // フォールバック: 集計 doc 未生成 → subcollection 全件スキャン
      const snap = await parentDoc.collection("ratings").get();
      let sum = 0;
      let count = 0;
      for (const d of snap.docs) {
        const value = d.data().value as number | undefined;
        if (typeof value !== "number" || value < 1 || value > 5) continue;
        sum += value;
        count += 1;
      }
      const average = count > 0 ? sum / count : 0;
      return { count, average };
    } catch (e) {
      console.error(`[firestore] fetchRatingSummary(${target.kind}/${target.id}) failed:`, e);
      return { count: 0, average: 0 };
    }
  }
);
