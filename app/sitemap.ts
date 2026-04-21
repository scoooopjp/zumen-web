import type { MetadataRoute } from "next";
import { categories } from "@/lib/data";
import { fetchUseCases } from "@/lib/firestore";

const BASE = "https://zumen.scoooop.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/category`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/support`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE}/category/${cat.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const useCases = await fetchUseCases();
  const blueprintRoutes: MetadataRoute.Sitemap = useCases.map((uc) => ({
    url: `${BASE}/blueprint/${uc.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const storeRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/store/cainz`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/store/komeri`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  // 作例は審査済みのものだけ index 対象（現状モックはすべて除外）
  // const exampleRoutes = mockExamples.map((e) => ({ ... }));

  return [...staticRoutes, ...categoryRoutes, ...blueprintRoutes, ...storeRoutes];
}
