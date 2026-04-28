import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

/**
 * Next.js 16 の `proxy` ファイル規約 (旧 `middleware`) で next-intl の
 * URL prefix ベースのロケール解決を有効化する。
 */
export default createMiddleware(routing);

export const config = {
  // 静的ファイル・API・SEO 系メタはプロキシしない。
  matcher: [
    "/((?!api|_next|_vercel|opengraph-image|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
