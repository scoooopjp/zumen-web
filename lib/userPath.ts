/**
 * ユーザープロフィール URL の生成ロジック。
 * - username が設定済み → `/u/{username}`（公開ハンドル、indexable）
 * - 未設定 → `/user/{uid}` (UID fallback、noindex)
 */
export function userProfilePath(
  uid: string,
  username: string | null | undefined,
): string | null {
  if (username && username.length > 0) return `/u/${username}`;
  if (uid && uid.length > 0) return `/user/${uid}`;
  return null;
}
