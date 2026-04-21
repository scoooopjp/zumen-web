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
  if (!keyJson) {
    console.warn("[firebase-admin] FIREBASE_SERVICE_ACCOUNT_KEY not set — falling back to mock data");
    return null;
  }

  try {
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
