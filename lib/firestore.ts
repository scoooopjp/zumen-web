/**
 * Firestore データフェッチ関数 — サーバーサイド専用 (Admin SDK)
 * Firebase 未設定時はモックデータにフォールバック
 * iOS の FirestoreService.swift と DTO スキーマを合わせている
 */
import { cache } from "react";
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
}

interface FSExampleStep {
  id?: string;
  order: number;
  text: string;
  imageURL?: string | null;
  /** IllType rawValue (iOS と一致) */
  illustrationType?: string | null;
}

interface FSExample {
  id: string;
  useCaseID: string;
  useCaseName: string;
  imageURL: string | null;
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
  steps?: FSExampleStep[];
}

// ── Storage URL ベース（リサイズ済み） ────────────────────────
const STORAGE_RESIZED_BASE =
  "https://firebasestorage.googleapis.com/v0/b/zumen-d0625.firebasestorage.app/o/usecase-thumbnails-resized%2F";

/** UseCase 固有サムネイル URL — `{id}.jpg` を参照 */
function useCaseThumbnailURL(id: string): string {
  return `${STORAGE_RESIZED_BASE}${encodeURIComponent(id + ".jpg")}?alt=media`;
}

/** dto.imageURL が未設定なら UseCase 固有 URL にフォールバック */
function resolveImageURL(dto: FSUseCase): string {
  if (dto.imageURL) {
    return dto.imageURL
      .replace("usecase-thumbnails%2F", "usecase-thumbnails-resized%2F")
      .replace(/\.png(\?|$)/, ".jpg$1");
  }
  return useCaseThumbnailURL(dto.id);
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

function fsUseCaseToModel(dto: FSUseCase): UseCase | null {
  const slug = dto.id;
  const categorySlug = CATEGORY_SLUG[dto.category] ?? dto.categorySlug ?? dto.category;

  return {
    id: dto.id,
    slug,
    name: dto.name,
    category: dto.category,
    categorySlug,
    difficulty: normalizeDifficulty(dto.difficulty),
    estimatedBudgetMin: dto.estimatedBudgetMin,
    estimatedBudgetMax: dto.estimatedBudgetMax,
    estimatedTimeMinutes: dto.estimatedTimeMinutes,
    indoorOutdoor: normalizeIndoorOutdoor(dto.indoorOutdoor),
    supportedRetailers: dto.supportedRetailers as Retailer[],
    templateID: dto.templateID,
    description: dto.description ?? `${dto.name}のDIY設計図`,
    imageAlt: dto.imageAlt ?? `${dto.name}のDIY設計図`,
    imageURL: resolveImageURL(dto),
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
      illustrationType: s.illustrationType ?? null,
    }));
}

interface AuthorMeta {
  photoURL: string | null;
  username: string | null;
}

function fsExampleToModel(
  dto: FSExample,
  metaMap: Record<string, AuthorMeta> = {},
): Example {
  const useCaseSlug = getUseCaseById(dto.useCaseID)?.slug ?? dto.useCaseID;
  const meta = metaMap[dto.authorUID];

  return {
    id: dto.id,
    useCaseID: dto.useCaseID,
    useCaseName: dto.useCaseName,
    useCaseSlug,
    imageURL: dto.imageURL,
    actualWidth: dto.actualWidth,
    actualDepth: dto.actualDepth,
    actualHeight: dto.actualHeight,
    actualCost: dto.actualCost,
    actualTimeMinutes: dto.actualTimeMinutes,
    retailer: dto.retailer,
    comment: dto.comment,
    authorUID: dto.authorUID,
    authorName: dto.authorName,
    authorPhotoURL: meta?.photoURL ?? null,
    authorUsername: meta?.username ?? null,
    createdAt: dto.createdAt.toDate().toISOString().slice(0, 10),
    steps: fsExampleStepsToModel(dto.steps),
  };
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

export async function fetchUseCases(): Promise<UseCase[]> {
  const db = getAdminDb();
  if (!db) return mockUseCases;
  try {
    const snap = await db.collection("useCases").orderBy("category").get();
    if (snap.empty) {
      console.warn("[firestore] useCases collection empty — falling back to mock");
      return mockUseCases;
    }
    const results = snap.docs
      .map((d) => fsUseCaseToModel({ id: d.id, ...d.data() } as FSUseCase))
      .filter((uc): uc is UseCase => uc !== null);
    return results.length > 0 ? results : mockUseCases;
  } catch (e) {
    console.error("[firestore] fetchUseCases failed:", e);
    return mockUseCases;
  }
}

// ── Featured UseCases (人気の設計図) ─────────────────────────
// `config/featured` ドキュメント (scripts/update-featured.ts が書き込み)
// の popularUseCaseIds を参照し、ID 順で UseCase を返す。

export async function fetchFeaturedUseCases(limit = 6): Promise<UseCase[]> {
  const db = getAdminDb();
  if (!db) return mockUseCases.slice(0, limit);
  try {
    const configSnap = await db.collection("config").doc("featured").get();
    const ids = (configSnap.data()?.popularUseCaseIds ?? []) as string[];
    if (ids.length === 0) {
      const all = await fetchUseCases();
      return all.slice(0, limit);
    }

    const picked = ids.slice(0, limit);
    const refs = picked.map((id) => db.collection("useCases").doc(id));
    const docs = await db.getAll(...refs);

    const results: UseCase[] = [];
    for (const d of docs) {
      if (!d.exists) continue;
      const model = fsUseCaseToModel({ id: d.id, ...d.data() } as FSUseCase);
      if (model) results.push(model);
    }
    return results.length > 0 ? results : mockUseCases.slice(0, limit);
  } catch (e) {
    console.error("[firestore] fetchFeaturedUseCases failed:", e);
    return mockUseCases.slice(0, limit);
  }
}

// ── Single UseCase ───────────────────────────────────────────

export async function fetchUseCaseById(id: string): Promise<UseCase | null> {
  const db = getAdminDb();
  if (!db) return getUseCaseById(id) ?? null;
  try {
    const snap = await db.collection("useCases").doc(id).get();
    if (!snap.exists) return getUseCaseById(id) ?? null;
    return fsUseCaseToModel({ id: snap.id, ...snap.data() } as FSUseCase);
  } catch (e) {
    console.error(`[firestore] fetchUseCaseById(${id}) failed:`, e);
    return getUseCaseById(id) ?? null;
  }
}

// ── Blueprint ────────────────────────────────────────────────

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
}

export interface FSBlueprintPart {
  name: string;
  spec: string;
  quantity: number;
  unit: string;
  note?: string;
}

export interface FSBlueprintCutItem {
  partName: string;
  thickness: number;
  width: number;
  length: number;
  quantity: number;
}

export interface FSBlueprintDetail {
  useCaseID: string;
  templateID: string;
  name: string;
  category: string;
  indoorOutdoor: string;
  dimensions: { width: number; depth: number; height: number };
  warnings: string[];
  tools: Array<{ name: string; note?: string }>;
  steps: FSBlueprintStep[];
  parts: FSBlueprintPart[];
  cutItems: FSBlueprintCutItem[];
}

export async function fetchBlueprintByUseCaseID(useCaseID: string): Promise<FSBlueprintDetail | null> {
  const db = getAdminDb();
  if (!db) return null;
  try {
    const snap = await db.collection("blueprints").doc(useCaseID).get();
    if (!snap.exists) return null;
    return snap.data() as FSBlueprintDetail;
  } catch (e) {
    console.error(`[firestore] fetchBlueprintByUseCaseID(${useCaseID}) failed:`, e);
    return null;
  }
}

// ── Examples ────────────────────────────────────────────────

export async function fetchExamples(useCaseID?: string): Promise<Example[]> {
  const db = getAdminDb();
  if (!db) {
    return useCaseID
      ? mockExamples.filter((e) => e.useCaseID === useCaseID)
      : mockExamples;
  }
  try {
    const col = db.collection("examples");
    const q = useCaseID
      ? col.where("useCaseID", "==", useCaseID).orderBy("createdAt", "desc")
      : col.orderBy("createdAt", "desc");
    const snap = await q.get();
    if (snap.empty) {
      return useCaseID
        ? mockExamples.filter((e) => e.useCaseID === useCaseID)
        : mockExamples;
    }
    const dtos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FSExample));
    const metaMap = await fetchAuthorMetaMap(db, dtos.map((e) => e.authorUID));
    return dtos.map((dto) => fsExampleToModel(dto, metaMap));
  } catch (e) {
    console.error(`[firestore] fetchExamples(${useCaseID ?? "all"}) failed:`, e);
    return useCaseID
      ? mockExamples.filter((e) => e.useCaseID === useCaseID)
      : mockExamples;
  }
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
    if (!db) {
      const counts: Record<string, number> = {};
      for (const ex of mockExamples) {
        counts[ex.useCaseID] = (counts[ex.useCaseID] ?? 0) + 1;
      }
      return counts;
    }
    try {
      const snap = await db.collection("examples").get();
      const counts: Record<string, number> = {};
      for (const d of snap.docs) {
        const data = d.data();
        if (data.hidden === true) continue;
        const id = data.useCaseID;
        if (typeof id !== "string" || !id) continue;
        counts[id] = (counts[id] ?? 0) + 1;
      }
      return counts;
    } catch (e) {
      console.error("[firestore] fetchExampleCountsByUseCase failed:", e);
      return {};
    }
  }
);

export async function fetchExamplesByAuthor(authorUID: string): Promise<Example[]> {
  const db = getAdminDb();
  if (!db) return mockExamples.filter((e) => e.authorUID === authorUID);
  try {
    const snap = await db
      .collection("examples")
      .where("authorUID", "==", authorUID)
      .orderBy("createdAt", "desc")
      .get();
    if (snap.empty) return [];
    const metaMap = await fetchAuthorMetaMap(db, [authorUID]);
    return snap.docs.map((d) =>
      fsExampleToModel({ id: d.id, ...d.data() } as FSExample, metaMap)
    );
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
