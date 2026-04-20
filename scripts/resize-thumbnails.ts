/**
 * resize-thumbnails.ts
 * usecase-thumbnails/ の全 PNG を取得し、
 * 600px 幅・JPEG 85% にリサイズして usecase-thumbnails-resized/ にアップロード。
 *
 * Run: npx ts-node --project tsconfig.seed.json scripts/resize-thumbnails.ts
 */
import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import sharp from "sharp";

const svcPath = path.resolve(__dirname, "../serviceAccountKey.json");
if (!fs.existsSync(svcPath)) {
  console.error("serviceAccountKey.json が見つかりません:", svcPath);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(svcPath),
  storageBucket: "zumen-d0625.firebasestorage.app",
});

const bucket = admin.storage().bucket();

const SRC_PREFIX  = "usecase-thumbnails";
const DEST_PREFIX = "usecase-thumbnails-resized";
const MAX_WIDTH   = 600;  // px
const JPEG_QUALITY = 85;

async function main() {
  // 元フォルダのファイル一覧を取得
  const [files] = await bucket.getFiles({ prefix: `${SRC_PREFIX}/` });
  const pngFiles = files.filter((f) => f.name.endsWith(".png"));
  console.log(`Found ${pngFiles.length} PNG files. Starting resize...`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "zumen-resize-"));
  let ok = 0;
  let skip = 0;
  let err = 0;

  for (const file of pngFiles) {
    const filename = path.basename(file.name, ".png");
    const destPath = `${DEST_PREFIX}/${filename}.jpg`;

    // 既にアップロード済みならスキップ
    const destFile = bucket.file(destPath);
    const [exists] = await destFile.exists();
    if (exists) {
      skip++;
      continue;
    }

    const localSrc  = path.join(tmpDir, `${filename}.png`);
    const localDest = path.join(tmpDir, `${filename}.jpg`);

    try {
      // ダウンロード
      await file.download({ destination: localSrc });

      // リサイズ & JPEG 変換
      await sharp(localSrc)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toFile(localDest);

      // アップロード
      await bucket.upload(localDest, {
        destination: destPath,
        metadata: {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000",
        },
      });

      ok++;
      if (ok % 20 === 0) console.log(`  ${ok} done (skipped: ${skip})`);
    } catch (e) {
      console.error(`  ERROR: ${file.name}`, e);
      err++;
    } finally {
      if (fs.existsSync(localSrc))  fs.unlinkSync(localSrc);
      if (fs.existsSync(localDest)) fs.unlinkSync(localDest);
    }
  }

  fs.rmdirSync(tmpDir);
  console.log(`\nComplete: ${ok} uploaded, ${skip} skipped, ${err} errors`);
  process.exit(err > 0 ? 1 : 0);
}

main();
