import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/og/", "/_next/"],
      },
    ],
    sitemap: "https://zumen.scoooop.com/sitemap.xml",
  };
}
