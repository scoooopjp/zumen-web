/**
 * 作例ピックアップに「動画あり」テストデータを 1 件用意する。
 *
 * 背景:
 *   アプリ側で作例工程に動画をつけられるようになった。Web 表示の
 *   StepVideoPoster (▶ オーバーレイ + アプリ誘導) を実データで確認するため、
 *   最新の作例 (= ホームの「作例ピックアップ」) のうち 1 件のステップに
 *   videoPath を付与する。
 *
 * 仕様:
 *   - Web は videoPath の有無だけ見て表示するので、実 mp4 アップロードは不要
 *   - iOS と同じパス規約 `examples/{exampleID}/steps/{stepID}.mp4` を使う
 *   - imageURL を持つステップを優先 (StepVideoPoster はポスター画像必須)
 *   - 既に videoPath が付いた step がある作例はスキップ (二重適用防止)
 *
 * 実行:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json \
 *     npx ts-node --project tsconfig.seed.json scripts/add-test-video-to-example.ts [--dry-run]
 *
 * Revert:
 *   同じ examples doc の steps 配列で対象 step の videoPath を削除すれば元に戻る
 *   (本スクリプトは更新前後の値を出力するので revert 用にメモしておくこと)
 */

import { initializeApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";

const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!keyPath) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS 未設定");
  process.exit(1);
}

initializeApp({
  credential: cert(require(path.resolve(keyPath)) as ServiceAccount),
});
const db = getFirestore();

const DRY = process.argv.includes("--dry-run");

interface Step {
  id?: string;
  order: number;
  text?: string;
  imageURL?: string | null;
  illustrationType?: string | null;
  videoPath?: string | null;
}

async function main() {
  console.log("Fetching recent examples (top 10 by createdAt desc)...");
  const snap = await db
    .collection("examples")
    .orderBy("createdAt", "desc")
    .limit(10)
    .get();

  if (snap.empty) {
    console.error("examples コレクションが空です");
    process.exit(1);
  }

  // ホームの「作例ピックアップ」は fetchRecentExamples(3) — hidden==true は除外して上から 3 件
  const candidates = snap.docs
    .filter((d) => d.data().hidden !== true)
    .slice(0, 3);

  console.log(`pickup candidates (hidden 除外後 上位 3 件):`);
  for (const d of candidates) {
    const data = d.data();
    console.log(`  - ${d.id} / ${data.useCaseName} / ${data.authorName}`);
  }

  // imageURL 付き step を持ち、まだ videoPath が付いていない作例を選ぶ
  type Picked = {
    docId: string;
    docRef: FirebaseFirestore.DocumentReference;
    steps: Step[];
    targetIndex: number;
    useCaseName: string;
    authorName: string;
  };

  let picked: Picked | null = null;
  for (const d of candidates) {
    const data = d.data();
    const steps = (data.steps ?? []) as Step[];
    if (!Array.isArray(steps) || steps.length === 0) continue;
    if (steps.some((s) => typeof s.videoPath === "string" && s.videoPath.length > 0)) {
      console.log(`  skip ${d.id}: already has videoPath`);
      continue;
    }
    const idx = steps.findIndex((s) => typeof s.imageURL === "string" && s.imageURL.length > 0);
    if (idx < 0) {
      console.log(`  skip ${d.id}: no step with imageURL`);
      continue;
    }
    picked = {
      docId: d.id,
      docRef: d.ref,
      steps,
      targetIndex: idx,
      useCaseName: (data.useCaseName as string) ?? "",
      authorName: (data.authorName as string) ?? "",
    };
    break;
  }

  if (!picked) {
    console.error(
      "\n動画を付与できる候補が見つからない (上位 3 件すべて videoPath 付き or imageURL 無し)。\n" +
      "fallback: pickup 範囲外でも構わない場合は --any-recent などのフラグを足す。"
    );
    process.exit(2);
  }

  const targetStep = picked.steps[picked.targetIndex];
  // iOS と同じパス規約。実ファイルは未アップロードでよい (Web は存在しか見ない)
  const stepID = targetStep.id ?? `step-${targetStep.order}`;
  const videoPath = `examples/${picked.docId}/steps/${stepID}.mp4`;

  const newSteps = picked.steps.map((s, i) =>
    i === picked!.targetIndex ? { ...s, videoPath } : s
  );

  console.log("\n----- target -----");
  console.log("example:", picked.docId);
  console.log("useCase:", picked.useCaseName);
  console.log("author:", picked.authorName);
  console.log("step order:", targetStep.order, "stepID:", stepID);
  console.log("step text:", (targetStep.text ?? "").slice(0, 80));
  console.log("step imageURL:", targetStep.imageURL);
  console.log("→ videoPath:", videoPath);

  if (DRY) {
    console.log("\n[dry-run] Firestore には書き込みません");
    process.exit(0);
  }

  await picked.docRef.update({ steps: newSteps });

  console.log("\n✅ updated");
  console.log(`example detail: https://zumen.scoooop.com/example/${picked.docId}`);
  console.log("revert: 同 doc の steps[" + picked.targetIndex + "].videoPath を削除");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
