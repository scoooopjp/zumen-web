/**
 * Firestore データフェッチ関数 — サーバーサイド専用 (Admin SDK)
 * Firebase 未設定時はモックデータにフォールバック
 * iOS の FirestoreService.swift と DTO スキーマを合わせている
 */
import { cache } from "react";
import { unstable_cache } from "next/cache";
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

export async function fetchUseCases(locale: string = "ja"): Promise<UseCase[]> {
  const db = getAdminDb();
  if (!db) return mockUseCases;
  try {
    // 一覧トップは人気順 (popularityScore 降順 → category)。useCases は ~50 件と少ないので
    // 全件取得してクライアント (= server component) 側でソートし、
    // popularityScore 未設定 doc を取りこぼさない。iOS の fetchUseCases と同じ挙動。
    const snap = await db.collection("useCases").get();
    if (snap.empty) {
      console.warn("[firestore] useCases collection empty — falling back to mock");
      return mockUseCases;
    }
    const results = snap.docs
      .map((d) => fsUseCaseToModel({ id: d.id, ...d.data() } as FSUseCase, locale))
      .filter((uc): uc is UseCase => uc !== null);
    results.sort((a, b) => {
      const sa = a.popularityScore ?? 0;
      const sb = b.popularityScore ?? 0;
      if (sa !== sb) return sb - sa;
      return a.category.localeCompare(b.category, "ja");
    });
    return results.length > 0 ? results : mockUseCases;
  } catch (e) {
    console.error("[firestore] fetchUseCases failed:", e);
    return mockUseCases;
  }
}

// ── Featured UseCases (人気の設計図) ─────────────────────────
// `config/featured` ドキュメント (scripts/update-featured.ts が書き込み)
// の popularUseCaseIds を参照し、ID 順で UseCase を返す。

export async function fetchFeaturedUseCases(
  limit = 6,
  locale: string = "ja",
): Promise<UseCase[]> {
  const db = getAdminDb();
  if (!db) return mockUseCases.slice(0, limit);
  try {
    const configSnap = await db.collection("config").doc("featured").get();
    const ids = (configSnap.data()?.popularUseCaseIds ?? []) as string[];
    if (ids.length === 0) {
      const all = await fetchUseCases(locale);
      return all.slice(0, limit);
    }

    const picked = ids.slice(0, limit);
    const refs = picked.map((id) => db.collection("useCases").doc(id));
    const docs = await db.getAll(...refs);

    const results: UseCase[] = [];
    for (const d of docs) {
      if (!d.exists) continue;
      const model = fsUseCaseToModel({ id: d.id, ...d.data() } as FSUseCase, locale);
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

export async function fetchExamples(
  useCaseID?: string,
  locale: string = "ja",
): Promise<Example[]> {
  const db = getAdminDb();
  if (!db) {
    return useCaseID
      ? mockExamples.filter((e) => e.useCaseID === useCaseID)
      : mockExamples;
  }
  try {
    // 一覧トップ (作例 list / blueprint カテゴリ詳細) は人気順:
    // popularityScore 降順 → createdAt 降順。pickup は fetchRecentExamples を使うこと。
    const col = db.collection("examples");
    const q = useCaseID
      ? col
          .where("useCaseID", "==", useCaseID)
          .orderBy("popularityScore", "desc")
          .orderBy("createdAt", "desc")
      : col
          .orderBy("popularityScore", "desc")
          .orderBy("createdAt", "desc");
    const snap = await q.get();
    if (snap.empty) return [];

    const dtos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as FSExample))
      .filter(isPublicExample);
    if (dtos.length === 0) return [];

    const metaMap = await fetchAuthorMetaMap(db, dtos.map((e) => e.authorUID));
    return dtos.map((dto) => fsExampleToModel(dto, metaMap, locale));
  } catch (e) {
    console.error(`[firestore] fetchExamples(${useCaseID ?? "all"}) failed:`, e);
    return useCaseID
      ? mockExamples.filter((e) => e.useCaseID === useCaseID)
      : mockExamples;
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

const EXAMPLE_COUNTS_TTL_MS = 15 * 60 * 1000;

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
  ["firestore-example-counts-doc"],
  { revalidate: 60 }
);

async function recomputeExampleCounts(db: FirebaseFirestore.Firestore): Promise<Record<string, number>> {
  const snap = await db.collection("examples").select("useCaseID", "hidden").get();
  const counts: Record<string, number> = {};
  for (const d of snap.docs) {
    const data = d.data();
    if (data.hidden === true) continue;
    const id = data.useCaseID;
    if (typeof id !== "string" || !id) continue;
    counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

/**
 * useCaseID 別の作例件数を返す（hidden==true は除外）。
 * iOS の FirestoreService.fetchExampleCountsByUseCase と同じく、
 * 1 クエリで全件取得して呼び出し側で集計する単純実装。
 * 同一リクエスト内で複数ページから呼ばれてもキャッシュで重複取得を防ぐ。
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
      void db.collection("config").doc("exampleCounts").set(
        {
          counts,
          updatedAt: new Date(),
        },
        { merge: true }
      ).catch((e) => {
        console.warn("[firestore] exampleCounts write failed:", e);
      });
      return counts;
    } catch (e) {
      console.error("[firestore] fetchExampleCountsByUseCase failed:", e);
      return buildExampleCounts(mockExamples);
    }
  }
);

export async function fetchExamplesByAuthor(
  authorUID: string,
  locale: string = "ja",
): Promise<Example[]> {
  const db = getAdminDb();
  if (!db) return mockExamples.filter((e) => e.authorUID === authorUID);
  try {
    const snap = await db
      .collection("examples")
      .where("authorUID", "==", authorUID)
      .orderBy("createdAt", "desc")
      .get();
    if (snap.empty) return [];
    const dtos = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as FSExample))
      .filter(isPublicExample);
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

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
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
}

/**
 * `usernames/{handle}` 逆引きから UID を解決し、users/{uid} を取得する。
 * 二段読みになるが、ハンドルは変更可能なので逆引きを介すのが正しい運用。
 */
export async function fetchUserProfileByUsername(username: string): Promise<UserProfile | null> {
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
}

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

export const fetchComments = cache(
  async (target: ContentTarget): Promise<Comment[]> => {
    const db = getAdminDb();
    if (!db) return [];
    try {
      const snap = await db
        .collection(targetCollection(target.kind))
        .doc(target.id)
        .collection("comments")
        .orderBy("createdAt", "asc")
        .get();
      if (snap.empty) return [];

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
      if (dtos.length === 0) return [];

      // username/photoURL を users から join。photoURL は投稿時点のスナップショット優先。
      const metaMap = await fetchAuthorMetaMap(db, dtos.map((c) => c.authorUID));
      return dtos.map((c) => ({
        ...c,
        authorPhotoURL: c.authorPhotoURL ?? metaMap[c.authorUID]?.photoURL ?? null,
        authorUsername: metaMap[c.authorUID]?.username ?? null,
      }));
    } catch (e) {
      console.error(`[firestore] fetchComments(${target.kind}/${target.id}) failed:`, e);
      return [];
    }
  }
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
