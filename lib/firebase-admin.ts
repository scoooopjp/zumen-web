/**
 * Firebase Admin SDK — サーバーサイド専用
 * Next.js の Server Components / Route Handlers から使用する。
 * クライアント側では絶対にimportしないこと。
 */
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

const APP_NAME = "zumen-admin";

function getAdminApp() {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;

  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  // Firebase App Hosting (Cloud Run) では鍵を置かず、実行サービスアカウントの
  // 既定の認証情報 (ADC) を使う。FIREBASE_CONFIG / K_SERVICE は App Hosting が設定する。
  const onGoogleCloud = Boolean(process.env.FIREBASE_CONFIG || process.env.K_SERVICE);
  if (!keyJson && !onGoogleCloud) {
    console.warn("[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY not set — falling back to mock data");
    return null;
  }

  try {
    if (!keyJson) return initializeApp(undefined, APP_NAME);
    const serviceAccount = JSON.parse(keyJson);
    return initializeApp({ credential: cert(serviceAccount) }, APP_NAME);
  } catch (e) {
    console.error("[firebase-admin] init failed:", e);
    return null;
  }
}

let cachedDb: Firestore | null = null;

export function getAdminDb(): Firestore | null {
  if (cachedDb) return cachedDb;
  const app = getAdminApp();
  if (!app) return null;
  cachedDb = getFirestore(app);
  return cachedDb;
}
