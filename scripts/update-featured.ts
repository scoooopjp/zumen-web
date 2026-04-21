/**
 * update-featured.ts
 * useCases を category 毎にグループ化し、ラウンドロビンで 1 件ずつ選抜して
 * 多様性のある 12 件を `config/featured` ドキュメントに書き込む。
 *
 * Web (app/page.tsx「人気の設計図」) と iOS (HomeView) の両方で同じ ID 配列を参照する。
 *
 * Run: npx ts-node --project tsconfig.seed.json scripts/update-featured.ts
 *
 * 事前準備:
 *   export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import * as path from "path";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS が未設定です");
  process.exit(1);
}

initializeApp({ credential: cert(require(path.resolve(keyPath)) as ServiceAccount) });
const db = getFirestore();

const FEATURED_COUNT = 12;
const STRATEGY = "diverse-categories-v1";

/** 難易度別の重み（中級者を若干優先） */
function difficultyWeight(difficulty: string): number {
  if (difficulty === "初心者") return 2;
  if (difficulty === "中級者") return 3;
  if (difficulty === "上級者") return 1;
  return 1;
}

/** 決定論的シャッフル — 文字列ハッシュをシードにした Fisher-Yates */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const rand = () => {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    hash ^= hash >>> 16;
    return (hash >>> 0) / 0xffffffff;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function main() {
  console.log("Fetching useCases...");
  const snap = await db.collection("useCases").get();
  if (snap.empty) {
    console.error("useCases コレクションが空です");
    process.exit(1);
  }

  // category -> UseCase[] グループ化
  const byCategory: Record<string, Array<{ id: string; difficulty: string }>> = {};
  for (const doc of snap.docs) {
    const data = doc.data();
    const cat = data.category as string | undefined;
    if (!cat) continue;
    (byCategory[cat] ??= []).push({ id: doc.id, difficulty: data.difficulty ?? "初心者" });
  }

  const categories = Object.keys(byCategory);
  console.log(`Found ${snap.size} useCases across ${categories.length} categories`);

  // 日別シードで安定した並び（毎日シャッフル変化）
  const today = new Date().toISOString().slice(0, 10);
  const shuffledCategories = seededShuffle(categories, today);

  // 各カテゴリ内は難易度重み付けでソート（同重みなら日別シャッフル）
  const perCategoryQueues = new Map<string, string[]>();
  for (const cat of shuffledCategories) {
    const items = byCategory[cat];
    const shuffled = seededShuffle(items, `${today}:${cat}`);
    shuffled.sort((a, b) => difficultyWeight(b.difficulty) - difficultyWeight(a.difficulty));
    perCategoryQueues.set(cat, shuffled.map((x) => x.id));
  }

  // ラウンドロビンで選抜
  const selected: string[] = [];
  let round = 0;
  while (selected.length < FEATURED_COUNT) {
    let pickedThisRound = 0;
    for (const cat of shuffledCategories) {
      const q = perCategoryQueues.get(cat)!;
      if (q.length === 0) continue;
      selected.push(q.shift()!);
      pickedThisRound++;
      if (selected.length >= FEATURED_COUNT) break;
    }
    if (pickedThisRound === 0) break;
    round++;
  }

  console.log(`Selected ${selected.length} useCases (${round} rounds):`);
  for (const id of selected) console.log(`  - ${id}`);

  await db.collection("config").doc("featured").set({
    popularUseCaseIds: selected,
    strategy: STRATEGY,
    updatedAt: FieldValue.serverTimestamp(),
    count: selected.length,
  });

  console.log(`\nWrote config/featured (${selected.length} items, strategy=${STRATEGY})`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
