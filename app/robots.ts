import type { MetadataRoute } from "next";

// OG 画像の URL は `/og?title=...` なので、`/og/` ではなく `/og` で止める。
// ただし SNS のカード取得ボットは robots.txt に従うため、OG 画像を取れるよう別に許可する。
const SOCIAL_PREVIEW_BOTS = [
  "Twitterbot",
  "facebookexternalhit",
  "Slackbot-LinkExpanding",
  "Discordbot",
  "LinkedInBot",
  "Line",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: SOCIAL_PREVIEW_BOTS,
        allow: "/",
        disallow: ["/api/", "/user/"],
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/og", "/api/", "/_next/", "/user/"],
      },
    ],
    sitemap: "https://zumen.scoooop.com/sitemap.xml",
  };
}
