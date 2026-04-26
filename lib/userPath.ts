/**
 * ユーザープロフィール URL の生成ロジック。
 * - username が設定済み → `/u/{username}`（公開ハンドル）
 * - 未設定 → 公開 Web ではリンクしない
 */
export function userProfilePath(
  _uid: string,
  username: string | null | undefined,
): string | null {
  if (username && username.length > 0) return `/u/${username}`;
  return null;
}
