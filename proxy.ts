import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlProxy = createMiddleware(routing);

// AI 学習クローラーと攻撃的 SEO クローラー。robots.txt を無視して
// `<img srcset>` を踏み、Vercel Image Optimization の transformations を
// 食い潰すため、`/_next/image` に対してだけ 403 で返す。
const BLOCKED_IMAGE_UA =
  /(GPTBot|ClaudeBot|anthropic-ai|Claude-Web|PerplexityBot|Bytespider|CCBot|Google-Extended|FacebookBot|meta-externalagent|Amazonbot|Applebot-Extended|cohere-ai|Diffbot|ImagesiftBot|Omgilibot|Omgili|YouBot|AhrefsBot|SemrushBot|MJ12bot|DotBot|DataForSeoBot|BLEXBot|PetalBot|SeznamBot)/i;

export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/_next/image")) {
    const ua = request.headers.get("user-agent") ?? "";
    if (BLOCKED_IMAGE_UA.test(ua)) {
      return new NextResponse(null, { status: 403 });
    }
    return NextResponse.next();
  }

  return intlProxy(request);
}

export const config = {
  matcher: [
    "/_next/image",
    "/((?!api|_next|_vercel|opengraph-image|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
