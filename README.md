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

`.env.local` を作成して環境変数を設定:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
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
  firebase.ts      # Firebase 初期化 (未設定時は null)
  firestore.ts     # Firestore データフェッチ (FSUseCase/FSExample DTO → model)
  data.ts          # UseCase モデル・モックデータ
  examples.ts      # Example モデル・モックデータ
```
