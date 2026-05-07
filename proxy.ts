import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlProxy = createMiddleware(routing);

// AI 学習クローラーと攻撃的 SEO クローラー。robots.txt を無視して
// `<img srcset>` を踏み、Vercel Image Optimization の transformations を
// 食い潰すため、`/_next/image` に対してだけ 403 で返す。
const BLOCKED_UA =
  /(GPTBot|ClaudeBot|anthropic-ai|Claude-Web|PerplexityBot|Bytespider|CCBot|Google-Extended|FacebookBot|meta-externalagent|Amazonbot|Applebot-Extended|cohere-ai|Diffbot|ImagesiftBot|Omgilibot|Omgili|YouBot|AhrefsBot|SemrushBot|MJ12bot|DotBot|DataForSeoBot|BLEXBot|PetalBot|SeznamBot)/i;

// `/search` は force-dynamic で毎リクエスト Firestore (useCases / exampleCounts) を叩く。
// ロケールプレフィックス込み (`/search` `/en/search` 等) を全て一致させる。
function isDynamicSearchPath(pathname: string): boolean {
  return /^\/(?:[a-z]{2}\/)?search(?:\/|$|\?)/i.test(pathname);
}

export default function proxy(request: NextRequest) {
  const ua = request.headers.get("user-agent") ?? "";
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/_next/image")) {
    if (BLOCKED_UA.test(ua)) {
      return new NextResponse(null, { status: 403 });
    }
    return NextResponse.next();
  }

  // クローラーが `?q=...` を投げ続けると Firestore reads が直撃するため、
  // 動的検索は AI/SEO bot に対して 403 で即返す。
  if (isDynamicSearchPath(pathname) && BLOCKED_UA.test(ua)) {
    return new NextResponse(null, { status: 403 });
  }

  return intlProxy(request);
}

export const config = {
  matcher: [
    "/_next/image",
    "/((?!api|_next|_vercel|opengraph-image|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
