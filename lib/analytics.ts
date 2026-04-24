/**
 * 軽量な GA4 ラッパー。NEXT_PUBLIC_GA_ID 未設定時は no-op。
 * pageview は GoogleAnalytics コンポーネントの config 送信で自動記録される。
 */

type GtagParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (command: string, target: string, params?: GtagParams) => void;
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export function track(event: string, params?: GtagParams) {
  if (typeof window === "undefined") return;
  if (!GA_ID || !window.gtag) return;
  window.gtag("event", event, params);
}
