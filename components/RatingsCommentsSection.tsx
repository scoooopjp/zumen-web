import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { Comment, RatingSummary } from "@/lib/firestore";
import { userProfilePath } from "@/lib/userPath";

/**
 * 5 段階評価の星表示 (Read 専用)。
 * 入力 UI はアプリ側のみで提供。
 */
function Stars({ value, size = 16 }: { value: number; size?: number }) {
  // 0.5 単位で塗り分け
  const stars = [1, 2, 3, 4, 5].map((i) => {
    if (value >= i) return "full";
    if (value >= i - 0.5) return "half";
    return "empty";
  });
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {stars.map((kind, idx) => (
        <Star key={idx} kind={kind} size={size} />
      ))}
    </span>
  );
}

function Star({ kind, size }: { kind: "full" | "half" | "empty"; size: number }) {
  const fill = kind === "empty" ? "none" : "var(--amber)";
  const stroke = "var(--amber)";
  if (kind === "half") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <defs>
          <linearGradient id="half-fill">
            <stop offset="50%" stopColor="var(--amber)" />
            <stop offset="50%" stopColor="transparent" />
          </linearGradient>
        </defs>
        <path
          d="M12 2.5l2.95 6.55 7.05.7-5.3 4.85 1.55 6.95L12 17.85l-6.25 3.7L7.3 14.6 2 9.75l7.05-.7L12 2.5z"
          fill="url(#half-fill)"
          stroke={stroke}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5l2.95 6.55 7.05.7-5.3 4.85 1.55 6.95L12 17.85l-6.25 3.7L7.3 14.6 2 9.75l7.05-.7L12 2.5z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatDate(iso: string): string {
  // ISO → YYYY/MM/DD（タイムゾーン依存を避けるため UTC 切り出し）
  return iso.slice(0, 10).replace(/-/g, "/");
}

const APP_STORE_URL =
  "https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625";

interface Props {
  rating: RatingSummary;
  /** 新→古の順 (createdAt desc) で渡されることを期待。`fetchCommentSummary` の出力をそのまま流す。 */
  comments: Comment[];
  /**
   * コメント総数。`comments.length` ではなく親 doc 配下の本当の件数を渡す。
   * `fetchCommentSummary().total` から取る。省略時は comments.length にフォールバック。
   */
  commentTotal?: number;
  /** 表示する最大コメント数。これを超えた分はアプリ誘導 CTA に置き換える。既定 3 件。 */
  maxComments?: number;
}

/**
 * 図面 / 作例ページ末尾に挿入する評価 + コメントセクション。
 * Web は Read のみ提供し、投稿はアプリへ誘導する。
 * コメントは maxComments 件までを表示し、それ以上はアプリで全件閲覧してもらう。
 */
export default function RatingsCommentsSection({
  rating,
  comments,
  commentTotal,
  maxComments = 3,
}: Props) {
  const t = useTranslations("RatingsComments");
  const avg = rating.count > 0 ? rating.average : 0;
  const avgLabel = avg > 0 ? avg.toFixed(1) : "–";
  const visibleComments = comments.slice(0, maxComments);
  const total = typeof commentTotal === "number" ? commentTotal : comments.length;
  const hiddenCount = Math.max(0, total - visibleComments.length);
  return (
    <section className="mt-10 no-print">
      {/* 評価 */}
      <h2 className="text-xl font-bold text-gray-900 mb-3">{t("ratingsHeading")}</h2>
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <Stars value={avg} size={20} />
        <div className="flex items-baseline gap-1">
          <span className="font-bold text-gray-900">{avgLabel}</span>
          <span className="text-sm text-gray-500">{t("outOf")}</span>
        </div>
        <span className="text-sm text-gray-500">{t("ratingCount", { count: rating.count })}</span>
        <span
          className="ml-auto text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          {t("ratingsAppOnly")}
        </span>
      </div>

      {/* コメント */}
      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">
        {t("commentsHeading")}
        {total > 0 && (
          <span
            className="ml-2 text-sm font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            {t("commentCount", { count: total })}
          </span>
        )}
      </h2>

      {comments.length === 0 ? (
        <div
          className="rounded-xl px-4 py-6 text-sm text-center"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
        >
          {t("empty")}
        </div>
      ) : (
        <ul
          className="rounded-xl divide-y overflow-hidden"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          {visibleComments.map((c) => {
            const profileHref = userProfilePath(c.authorUID, c.authorUsername);
            const avatar = (
              <div
                className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                style={{ background: "var(--amber-pale)" }}
              >
                {c.authorPhotoURL ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={c.authorPhotoURL}
                    alt={t("avatarAltTpl", { name: c.authorName })}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm" aria-hidden="true">👤</span>
                )}
              </div>
            );
            const name = (
              <span className="font-medium text-gray-900">{c.authorName}</span>
            );
            return (
              <li key={c.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3 mb-1.5">
                  {profileHref ? (
                    <Link href={profileHref} className="flex items-center gap-2 hover:opacity-80 min-w-0">
                      {avatar}
                      {name}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      {avatar}
                      {name}
                    </div>
                  )}
                  <span className="text-xs text-gray-400 shrink-0">{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.text}</p>
              </li>
            );
          })}
        </ul>
      )}

      {/* 続きはアプリで／コメント投稿動線 */}
      {total > 0 && (
        <div
          className="mt-3 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {hiddenCount > 0
              ? t("remainingInApp", { n: hiddenCount })
              : t("postInApp")}
          </p>
          <a
            href={APP_STORE_URL}
            className="btn-amber text-xs shrink-0"
          >
            {t("openInApp")}
          </a>
        </div>
      )}
    </section>
  );
}
