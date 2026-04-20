/**
 * Firestore データフェッチ関数 — サーバーサイド専用 (Admin SDK)
 * Firebase 未設定時はモックデータにフォールバック
 * iOS の FirestoreService.swift と DTO スキーマを合わせている
 */
import { getAdminDb } from "./firebase-admin";
import { useCases as mockUseCases } from "./data";
import { getUseCaseById } from "./data";
import { mockExamples } from "./examples";
import type { UseCase, Difficulty, IndoorOutdoor, Retailer } from "./data";
import type { Example } from "./examples";

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

/** templateID → categorySlug */
const TEMPLATE_CATEGORY_SLUG: Record<string, string> = {
  "tpl-shelf-basic":   "tana",
  "tpl-planter-stand": "planter-dai",
  "tpl-compost-box":   "compost",
  "tpl-bench":         "bench",
  "tpl-wood-deck":     "deck",
  "tpl-shoe-rack":     "shoe-rack",
  "tpl-flower-box":    "flower-box",
  "tpl-hanger-rack":   "hanger-rack",
  "tpl-garden-table":  "garden-table",
  "tpl-tv-stand":      "tv-stand",
  "tpl-cat-walk":      "cat-walk",
};

function fsUseCaseToModel(dto: FSUseCase): UseCase | null {
  const slug = dto.id;
  const categorySlug =
    dto.categorySlug ??
    TEMPLATE_CATEGORY_SLUG[dto.templateID] ??
    dto.category;

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
    imageURL: dto.imageURL,
  };
}

function fsExampleToModel(dto: FSExample): Example {
  const useCaseSlug = getUseCaseById(dto.useCaseID)?.slug ?? dto.useCaseID;

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
    authorName: dto.authorName,
    createdAt: dto.createdAt.toDate().toISOString().slice(0, 10),
  };
}

// ── UseCases ────────────────────────────────────────────────

export async function fetchUseCases(): Promise<UseCase[]> {
  const db = getAdminDb();
  if (!db) return mockUseCases;
  try {
    const snap = await db.collection("useCases").orderBy("category").get();
    if (snap.empty) return mockUseCases;
    const results = snap.docs
      .map((d) => fsUseCaseToModel({ id: d.id, ...d.data() } as FSUseCase))
      .filter((uc): uc is UseCase => uc !== null);
    return results.length > 0 ? results : mockUseCases;
  } catch {
    return mockUseCases;
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
  } catch {
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
  } catch {
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
    return snap.docs.map((d) =>
      fsExampleToModel({ id: d.id, ...d.data() } as FSExample)
    );
  } catch {
    return useCaseID
      ? mockExamples.filter((e) => e.useCaseID === useCaseID)
      : mockExamples;
  }
}
