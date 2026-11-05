# ZUMEN Web

ZUMEN DIY アプリの公開 Web サイト。
Next.js 16 App Router / Tailwind CSS / TypeScript / Firebase App Hosting。

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

Firebase App Hosting（プロジェクト `zumen-d0625`、backend `zumen-web`、リージョン `asia-east1`）。
設定は `apphosting.yaml`（台数・メモリ）と `firebase.json`（アップロードから除くファイル）。

```bash
firebase deploy --only apphosting --project zumen-d0625
```

Firestore は App Hosting の実行サービスアカウントの既定の認証情報で読むので、本番に鍵は置かない。
2026-11 に Vercel（Hobby の CPU 無料枠超過で停止）から移した。

## ライブラリ構成

```
lib/
  firebase-admin.ts # Firebase Admin SDK 初期化 (サーバー専用、未設定時は null)
  firestore.ts     # Firestore データフェッチ (FSUseCase/FSExample DTO → model)
  data.ts          # UseCase モデル・モックデータ
  examples.ts      # Example モデル・モックデータ
```
