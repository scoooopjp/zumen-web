import { defineRouting } from "next-intl/routing";

/**
 * URL prefix で locale を決定する。
 * - ja (default): /blueprint/foo
 * - en:           /en/blueprint/foo
 *
 * `as-needed` モードによりデフォルト言語は prefix なしで配信され、
 * 既存の被リンク・SEO シグナルを温存する。
 */
export const routing = defineRouting({
  locales: ["ja", "en"] as const,
  defaultLocale: "ja",
  localePrefix: "as-needed",
  // proxy 側で hreflang Link ヘッダを自動付与する (sitemap でも兄弟登録するので二重保険)。
  alternateLinks: true,
  // SSR ページでは URL から locale が確定するため cookie は不要。
  // ただし next-intl デフォルトでは visit 時に cookie を書きにいくため、
  // /en へ自動リダイレクトされて検索流入が壊れないよう off にしておく。
  localeCookie: false,
  // accept-language で勝手にリダイレクトしない (検索結果の URL を尊重する)。
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
