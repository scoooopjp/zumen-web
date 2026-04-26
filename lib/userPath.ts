/**
 * ユーザープロフィール URL の生成ロジック。
 * - username が設定済み → `/u/{username}`（公開ハンドル）
 * - 未設定 → `/user/{uid}` にフォールバック
 *
 * 公開ハンドルが優先される設計だが、UID 直 URL は永続的に有効
 * （ハンドル削除 / 未設定ユーザーへの fallback パスとして）。
 */
export function userProfilePath(
  uid: string,
  username: string | null | undefined,
): string {
  if (username && username.length > 0) return `/u/${username}`;
  return `/user/${uid}`;
}
