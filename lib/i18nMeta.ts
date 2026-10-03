import { routing } from "@/i18n/routing";

export const SITE_BASE_URL = "https://zumen.scoooop.com";

function pathFor(locale: string, path: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) return `${SITE_BASE_URL}${clean}` || SITE_BASE_URL;
  return `${SITE_BASE_URL}/${locale}${clean}`;
}

// 英語版は noindex（proxy.ts の X-Robots-Tag）なので hreflang の相手に載せない。
// noindex のページを hreflang で指すと Search Console で「代替ページ」エラーになる。
export function localizedAlternates(locale: string, path: string) {
  return {
    canonical: pathFor(locale, path),
    languages: {
      ja: pathFor("ja", path),
      "x-default": pathFor(routing.defaultLocale, path),
    },
  };
}

export function ogUrl(locale: string, path: string) {
  return pathFor(locale, path);
}
