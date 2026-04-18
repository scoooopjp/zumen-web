/**
 * Firestore データフェッチ関数
 * Firebase 未設定時はモックデータにフォールバック
 * iOS の FirestoreService.swift と DTO スキーマを合わせている
 */
import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import { useCases as mockUseCases } from "./data";
import { mockExamples } from "./examples";
import type { UseCase, Difficulty, IndoorOutdoor, Retailer } from "./data";
import type { Example } from "./examples";

// ── Firestore DTOs (iOS の FSUseCase / FSExample と対応) ─────

interface FSUseCase {
  id: string;
  name: string;
  category: string;
  templateID: string;
  difficulty: string;
  estimatedBudgetMin: number;
  estimatedBudgetMax: number;
  estimatedTimeMinutes: number;
  indoorOutdoor: string;
  supportedRetailers: string[];
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
  createdAt: Timestamp;
}

// ── DTO → Model 変換 ─────────────────────────────────────────

const SLUG_MAP: Record<string, string> = {
  "tpl-shelf-basic":    "kantan-wall-shelf",
  "tpl-planter-stand":  "planter-stand",
  "tpl-compost-box":    "compost-box",
};

const CATEGORY_SLUG_MAP: Record<string, string> = {
  "棚": "tana",
  "プランター台": "planter-dai",
  "コンポスト": "compost",
};

function fsUseCaseToModel(dto: FSUseCase): UseCase | null {
  const slug = SLUG_MAP[dto.templateID];
  if (!slug) return null;

  const difficulty = dto.difficulty as Difficulty;
  const indoorOutdoor = dto.indoorOutdoor as IndoorOutdoor;
  const supportedRetailers = dto.supportedRetailers as Retailer[];
  const categorySlug = CATEGORY_SLUG_MAP[dto.category] ?? dto.category;

  // 説明文は category から生成（Firestore に持たせてもよい）
  const descMap: Record<string, string> = {
    "棚": "SPF材で作るシンプルな棚。サイズを自由に調整できます。",
    "プランター台": "室内外で使える木製プランター台。",
    "コンポスト": "生ゴミを堆肥に変えるコンポストボックス。",
  };

  return {
    id: dto.id,
    slug,
    name: dto.name,
    category: dto.category,
    categorySlug,
    difficulty,
    estimatedBudgetMin: dto.estimatedBudgetMin,
    estimatedBudgetMax: dto.estimatedBudgetMax,
    estimatedTimeMinutes: dto.estimatedTimeMinutes,
    indoorOutdoor,
    supportedRetailers,
    templateID: dto.templateID,
    description: descMap[dto.category] ?? dto.name,
    imageAlt: `${dto.name}のDIY設計図`,
  };
}

function fsExampleToModel(dto: FSExample): Example {
  return {
    id: dto.id,
    useCaseID: dto.useCaseID,
    useCaseName: dto.useCaseName,
    useCaseSlug: SLUG_MAP[dto.useCaseID] ?? dto.useCaseID,
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
  if (!db) return mockUseCases;
  try {
    const snap = await getDocs(
      query(collection(db, "useCases"), orderBy("category"))
    );
    if (snap.empty) return mockUseCases;
    const results = snap.docs
      .map((d) => fsUseCaseToModel({ id: d.id, ...d.data() } as FSUseCase))
      .filter((uc): uc is UseCase => uc !== null);
    return results.length > 0 ? results : mockUseCases;
  } catch {
    return mockUseCases;
  }
}

// ── Examples ────────────────────────────────────────────────

export async function fetchExamples(useCaseID?: string): Promise<Example[]> {
  if (!db) {
    return useCaseID
      ? mockExamples.filter((e) => e.useCaseID === useCaseID)
      : mockExamples;
  }
  try {
    const col = collection(db, "examples");
    const q = useCaseID
      ? query(col, where("useCaseID", "==", useCaseID), orderBy("createdAt", "desc"))
      : query(col, orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
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
