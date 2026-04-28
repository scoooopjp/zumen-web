import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

const SUPPORTED_LOCALES = ["ja", "en"] as const;
const DEFAULT_LOCALE = "ja";
type Locale = (typeof SUPPORTED_LOCALES)[number];

function isSupported(value: string | undefined): value is Locale {
  return value !== undefined && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

function pickFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header.split(",").map((t) => t.trim().split(";")[0].toLowerCase());
  for (const tag of tags) {
    const primary = tag.split("-")[0];
    if (isSupported(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  let locale: Locale = isSupported(cookieLocale) ? cookieLocale : DEFAULT_LOCALE;
  if (!isSupported(cookieLocale)) {
    const headersList = await headers();
    locale = pickFromAcceptLanguage(headersList.get("accept-language"));
  }
  const messages = (await import(`../messages/${locale}.json`)).default;
  return { locale, messages };
});
