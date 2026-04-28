import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { UseCase, formatBudget, formatTime, getCategoryThumbnailURL } from "@/lib/data";

/** useCaseID固有サムネイル → カテゴリサムネイル → null の順でURL解決 */
function resolveThumbURL(useCase: UseCase): string | null {
  if (useCase.imageURL) return useCase.imageURL;
  return getCategoryThumbnailURL(useCase.category);
}

interface BlueprintCardProps {
  useCase: UseCase;
  exampleCount?: number;
}

const difficultyClass: Record<string, string> = {
  "初心者向け": "badge-beginner",
  "中級者向け": "badge-intermediate",
  "上級者向け": "badge-advanced",
};

const difficultyKey: Record<string, "beginner" | "intermediate" | "advanced"> = {
  "初心者向け": "beginner",
  "中級者向け": "intermediate",
  "上級者向け": "advanced",
};

/* Category → illustration emoji (until real illustrations exist) */
const categoryIcon: Record<string, string> = {
  "棚":             "🗄️",
  "本棚":           "📚",
  "TV台":           "📺",
  "ダイニングテーブル": "🍽️",
  "デスク・作業台":  "🧑‍💻",
  "ベンチ":         "🪑",
  "ガーデンテーブル": "🌳",
  "ウッドデッキ":   "🪵",
  "ガーデンフェンス": "🌿",
  "シューズラック":  "👟",
  "玄関収納":       "🚪",
  "フラワーボックス": "🌸",
  "プランター台":   "🪴",
  "コンポスト":     "♻️",
  "キャットウォーク": "🐈",
  "キャットタワー": "🐱",
  "犬小屋":         "🐕",
  "ペット用収納":   "🦴",
  "子供用家具":     "🧸",
  "ハンガーラック": "👔",
  "物置・収納":     "📦",
  "看板・インテリア": "🪧",
};

export default function BlueprintCard({ useCase, exampleCount = 0 }: BlueprintCardProps) {
  const thumbURL = resolveThumbURL(useCase);
  const locale = useLocale();
  const tCard = useTranslations("BlueprintCard");
  const tCommon = useTranslations("Common");
  const tFooter = useTranslations("Footer");
  const tDiff = useTranslations("Difficulty");
  const categoryLabel = (tFooter(`categories.${useCase.categorySlug}` as never) as string) || useCase.category;
  const diffKey = difficultyKey[useCase.difficulty];
  const difficultyLabel = diffKey ? tDiff(diffKey) : useCase.difficulty;

  return (
    <Link href={`/blueprint/${useCase.slug}`} className="zumen-card block overflow-hidden group">
      {/* Illustration area — 3:2 */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          aspectRatio: "3/2",
          background: "linear-gradient(135deg, #F5F0E8 0%, #EDE8DC 100%)",
        }}
      >
        {/* Blueprint grid (fallback bg) */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(184,201,217,0.22) 1px,transparent 1px)," +
              "linear-gradient(90deg,rgba(184,201,217,0.22) 1px,transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        {thumbURL ? (
          <Image
            src={thumbURL}
            alt={useCase.imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span
            className="relative text-5xl select-none"
            style={{ filter: "drop-shadow(0 2px 4px rgba(15,42,74,0.12))" }}
          >
            {categoryIcon[useCase.category] ?? "🪚"}
          </span>
        )}

        {/* Category label */}
        <span
          className="absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full z-10"
          style={{
            background: "rgba(255,255,255,0.80)",
            color: "var(--text-secondary)",
            backdropFilter: "blur(4px)",
          }}
        >
          {categoryLabel}
        </span>

        {/* 作例件数バッジ — iOS の UseCaseGridCard と揃える */}
        {exampleCount > 0 && (
          <span
            className="absolute top-3 right-3 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full z-10"
            style={{
              background: "rgba(255,255,255,0.80)",
              color: "var(--navy-deep)",
              backdropFilter: "blur(4px)",
            }}
            aria-label={tCard("exampleCountAria", { n: exampleCount })}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            {exampleCount}
          </span>
        )}

        {/* 完成イメージ label */}
        {thumbURL && (
          <span
            className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded z-10"
            style={{ background: "rgba(0,0,0,0.45)", color: "rgba(255,255,255,0.92)" }}
          >
{tCommon("completedImage")}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          className="font-bold leading-snug mb-1 transition-colors group-hover:opacity-75"
          style={{ color: "var(--navy-deep)", fontSize: "0.9375rem" }}
        >
          {useCase.name}
        </h3>
        <p className="text-sm line-clamp-2 mb-3" style={{ color: "var(--text-secondary)" }}>
          {useCase.description}
        </p>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${difficultyClass[useCase.difficulty] ?? ""}`}>
            {difficultyLabel}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--canvas)", color: "var(--text-secondary)" }}
          >
            {formatBudget(useCase.estimatedBudgetMin, useCase.estimatedBudgetMax, locale)}
          </span>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "var(--canvas)", color: "var(--text-secondary)" }}
          >
            {formatTime(useCase.estimatedTimeMinutes, locale)}
          </span>
        </div>

        {(useCase.ratingCount ?? 0) > 0 && (
          <div className="mt-2">
            <span
              className="inline-flex items-center gap-0.5 text-xs font-semibold"
              style={{ color: "var(--navy-deep)" }}
              aria-label={tCard("ratingAria", { avg: (useCase.ratingAverage ?? 0).toFixed(1), count: useCase.ratingCount ?? 0 })}
            >
              <span aria-hidden="true" style={{ color: "#E5A93B" }}>★</span>
              {(useCase.ratingAverage ?? 0).toFixed(1)}
              <span className="font-normal ml-0.5" style={{ color: "var(--text-tertiary)" }}>
                ({useCase.ratingCount})
              </span>
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
