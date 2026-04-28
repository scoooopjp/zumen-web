import type { MetadataRoute } from "next";
import { categories } from "@/lib/data";
import { fetchUseCases } from "@/lib/firestore";
import { routing } from "@/i18n/routing";

const BASE = "https://zumen.scoooop.com";

function urlFor(locale: string, path: string): string {
  const clean = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return locale === routing.defaultLocale
    ? `${BASE}${clean}` || BASE
    : `${BASE}/${locale}${clean}`;
}

function localizedEntries(
  path: string,
  meta: Omit<MetadataRoute.Sitemap[number], "url" | "alternates">,
): MetadataRoute.Sitemap {
  const languages = {
    ja: urlFor("ja", path),
    en: urlFor("en", path),
    "x-default": urlFor(routing.defaultLocale, path),
  } as const;
  return routing.locales.map((loc) => ({
    ...meta,
    url: urlFor(loc, path),
    alternates: { languages },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    ...localizedEntries("/", { lastModified: now, changeFrequency: "weekly", priority: 1.0 }),
    ...localizedEntries("/category", { lastModified: now, changeFrequency: "weekly", priority: 0.9 }),
    ...localizedEntries("/search", { lastModified: now, changeFrequency: "weekly", priority: 0.5 }),
    ...localizedEntries("/support", { lastModified: now, changeFrequency: "yearly", priority: 0.3 }),
    ...localizedEntries("/privacy", { lastModified: now, changeFrequency: "yearly", priority: 0.3 }),
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.flatMap((cat) =>
    localizedEntries(`/category/${cat.slug}`, {
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }),
  );

  const useCases = await fetchUseCases();
  const blueprintRoutes: MetadataRoute.Sitemap = useCases.flatMap((uc) =>
    localizedEntries(`/blueprint/${uc.slug}`, {
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    }),
  );

  const storeRoutes: MetadataRoute.Sitemap = ["cainz", "komeri", "kohnan", "dcm"].flatMap((slug) =>
    localizedEntries(`/store/${slug}`, {
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    }),
  );

  return [...staticRoutes, ...categoryRoutes, ...blueprintRoutes, ...storeRoutes];
}
