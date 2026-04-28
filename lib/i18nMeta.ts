import { routing } from "@/i18n/routing";

export const SITE_BASE_URL = "https://zumen.scoooop.com";

function pathFor(locale: string, path: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  if (locale === routing.defaultLocale) return `${SITE_BASE_URL}${clean}` || SITE_BASE_URL;
  return `${SITE_BASE_URL}/${locale}${clean}`;
}

export function localizedAlternates(locale: string, path: string) {
  return {
    canonical: pathFor(locale, path),
    languages: {
      ja: pathFor("ja", path),
      en: pathFor("en", path),
      "x-default": pathFor(routing.defaultLocale, path),
    },
  };
}

export function ogUrl(locale: string, path: string) {
  return pathFor(locale, path);
}
