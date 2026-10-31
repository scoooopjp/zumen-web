/**
 * JSON-LD を `<script type="application/ld+json">` に埋め込むための文字列化。
 * JSON.stringify は `<` をエスケープしないため、作例タイトルやプロフィール等の
 * ユーザー入力に `</script>` が含まれると script を抜けて XSS になる。
 * Next.js の JSON-LD ガイドに従い `<` を `<` に置換する。
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
