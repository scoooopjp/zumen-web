/**
 * upload-thumbnails.ts
 * /Users/tochiba/Downloads/zumen-thumbnail/ 配下の PNG を
 * Firebase Storage usecase-thumbnails/{useCaseID}.png にアップロードし、
 * Firestore useCases/{useCaseID}.imageURL を更新する
 *
 * Run: npx ts-node --project tsconfig.seed.json scripts/upload-thumbnails.ts
 */
import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";

const svcPath = path.resolve(__dirname, "../serviceAccountKey.json");
if (!fs.existsSync(svcPath)) {
  console.error("serviceAccountKey.json が見つかりません:", svcPath);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(svcPath),
  storageBucket: "zumen-d0625.firebasestorage.app",
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

const THUMB_DIR = "/Users/tochiba/Downloads/zumen-thumbnail";
const STORAGE_PREFIX = "usecase-thumbnails";

async function main() {
  const files = fs.readdirSync(THUMB_DIR).filter((f) => f.endsWith(".png"));
  console.log(`Found ${files.length} images. Uploading...`);

  let ok = 0;
  let err = 0;

  for (const file of files) {
    const useCaseID = path.basename(file, ".png");
    const localPath = path.join(THUMB_DIR, file);
    const storagePath = `${STORAGE_PREFIX}/${file}`;

    try {
      // Firebase Storage にアップロード
      await bucket.upload(localPath, {
        destination: storagePath,
        metadata: {
          contentType: "image/png",
          cacheControl: "public, max-age=31536000",
        },
      });

      // 公開 URL を生成（Firebase Storage の直接 URL）
      const encodedPath = encodeURIComponent(storagePath);
      const imageURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;

      // Firestore の useCases/{useCaseID} に imageURL を書き込む
      await db.collection("useCases").doc(useCaseID).set(
        { imageURL },
        { merge: true }
      );

      ok++;
      if (ok % 20 === 0) console.log(`  ${ok}/${files.length} done`);
    } catch (e) {
      console.error(`  ERROR: ${file}`, e);
      err++;
    }
  }

  console.log(`\nComplete: ${ok} uploaded, ${err} errors`);
  process.exit(err > 0 ? 1 : 0);
}

main();
