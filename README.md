# ZUMEN Web

ZUMEN DIY アプリの公開 Web サイト。
Next.js 14 App Router / Tailwind CSS / TypeScript / Vercel デプロイ。

## ページ構成

| パス | 内容 |
|------|------|
| `/` | LP (Issue 8-2) |
| `/blueprint/[slug]` | 設計図詳細・BOM・作例サムネイル (Issue 8-3) |
| `/example/[id]` | 作例詳細 (Issue 8-4) |
| `/category` | カテゴリ一覧 (Issue 8-5) |
| `/category/[slug]` | カテゴリ別設計図 |
| `/store/[retailer]` | ホームセンター別ページ (Issue 8-7) |
| `/og` | 動的 OGP 画像 (Edge Runtime, next/og) |

## 開発環境

```bash
npm install
npm run dev      # http://localhost:3000
npx tsc --noEmit # 型チェック
```

## Firebase 設定

`.env.local` を作成して環境変数を設定 (Firestore はサーバー側で Admin SDK 経由でのみ読む。Web はクライアント SDK を使わない):

```
FIREBASE_SERVICE_ACCOUNT_KEY=...   # サービスアカウント JSON (1 行)
```

未設定の場合は `lib/data.ts` / `lib/examples.ts` のモックデータにフォールバックします。

## デプロイ

Vercel (東京リージョン hnd1):

```bash
vercel --prod
```

`vercel.json` でセキュリティヘッダと hnd1 リージョンを設定済み。

## ライブラリ構成

```
lib/
  firebase-admin.ts # Firebase Admin SDK 初期化 (サーバー専用、未設定時は null)
  firestore.ts     # Firestore データフェッチ (FSUseCase/FSExample DTO → model)
  data.ts          # UseCase モデル・モックデータ
  examples.ts      # Example モデル・モックデータ
```
