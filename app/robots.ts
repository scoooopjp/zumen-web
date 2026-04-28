import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/og/", "/api/", "/_next/", "/user/"],
      },
    ],
    sitemap: "https://zumen.scoooop.com/sitemap.xml",
  };
}
