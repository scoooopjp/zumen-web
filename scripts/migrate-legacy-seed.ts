/**
 * 旧 seed データ (UID prefix が `seed-` のもの) を一掃するワンショット移行スクリプト。
 * v1 (seedTag = "zumen-seed-v1") に切り替える前段階で 1 度だけ実行する想定。
 *
 * 削除対象:
 *   - users/{uid}                     where uid startsWith "seed-user-"
 *   - examples/{*}                    where authorUID startsWith "seed-"
 *     その下の comments/{*} も再帰的に削除
 *   - usernames/{*}                   旧データには存在しないので no-op
 *
 * 実行:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     npx ts-node --project tsconfig.seed.json scripts/migrate-legacy-seed.ts
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS が未設定です");
  process.exit(1);
}

initializeApp({ credential: cert(require(path.resolve(keyPath)) as ServiceAccount) });
const db = getFirestore();

async function deleteLegacyExamples(): Promise<number> {
  const snap = await db.collection("examples")
    .where("authorUID", ">=", "seed-")
    .where("authorUID", "<", "seed-zzzz")
    .get();
  let deleted = 0;
  for (const doc of snap.docs) {
    const commentsSnap = await doc.ref.collection("comments").get();
    for (const c of commentsSnap.docs) await c.ref.delete();
    await doc.ref.delete();
    deleted++;
  }
  return deleted;
}

async function deleteLegacyUsers(): Promise<number> {
  const snap = await db.collection("users")
    .where("__name__", ">=", "seed-user-")
    .where("__name__", "<", "seed-user-zzzz")
    .get();
  let deleted = 0;
  for (const doc of snap.docs) {
    await doc.ref.delete();
    deleted++;
  }
  return deleted;
}

(async () => {
  console.log("🧹  旧 seed examples を削除します...");
  const exDeleted = await deleteLegacyExamples();
  console.log(`  → examples: ${exDeleted} 件削除`);

  console.log("🧹  旧 seed users を削除します...");
  const userDeleted = await deleteLegacyUsers();
  console.log(`  → users: ${userDeleted} 件削除`);

  console.log("✅  legacy seed data 削除完了");
  process.exit(0);
})().catch((e) => {
  console.error("❌  失敗:", e);
  process.exit(1);
});
