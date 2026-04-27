import Image from "next/image";
import Link from "next/link";
import { type Example, formatTime } from "@/lib/examples";

interface Props {
  example: Example;
}

export default function ExampleCard({ example: ex }: Props) {
  return (
    <Link href={`/example/${ex.id}`} className="zumen-card block overflow-hidden group">
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          aspectRatio: "3/2",
          background: "linear-gradient(135deg, #F5F0E8 0%, #EDE8DC 100%)",
        }}
      >
        {ex.imageURL ? (
          <Image
            src={ex.imageURL}
            alt={`${ex.authorName}さんの${ex.useCaseName}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <span className="text-5xl select-none">📷</span>
        )}
        <span
          className="absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full z-10"
          style={{
            background: "rgba(255,255,255,0.80)",
            color: "var(--text-secondary)",
            backdropFilter: "blur(4px)",
          }}
        >
          {ex.useCaseName}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-xs shrink-0"
            style={{ background: "var(--canvas)" }}
          >
            {ex.authorPhotoURL ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={ex.authorPhotoURL}
                alt={`${ex.authorName} のアバター`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <span aria-hidden="true">👤</span>
            )}
          </div>
          <span className="font-medium text-sm" style={{ color: "var(--navy-deep)" }}>
            {ex.authorName}
          </span>
          {ex.ratingCount > 0 && (
            <span
              className="inline-flex items-center gap-0.5 text-xs font-semibold"
              style={{ color: "var(--navy-deep)" }}
              aria-label={`平均評価 ${ex.ratingAverage.toFixed(1)} / ${ex.ratingCount}件`}
            >
              <span aria-hidden="true" style={{ color: "#E5A93B" }}>★</span>
              {ex.ratingAverage.toFixed(1)}
              <span className="font-normal" style={{ color: "var(--text-tertiary)" }}>
                ({ex.ratingCount})
              </span>
            </span>
          )}
          <span className="text-xs ml-auto" style={{ color: "var(--text-tertiary)" }}>
            {ex.createdAt}
          </span>
        </div>

        <div
          className="grid grid-cols-3 gap-2 text-center rounded-xl py-3 mb-3"
          style={{ background: "var(--canvas)" }}
        >
          <div>
            <p className="text-[10px] mb-0.5" style={{ color: "var(--text-tertiary)" }}>実費</p>
            <p className="text-sm font-bold" style={{ color: "var(--navy-deep)" }}>
              ¥{ex.actualCost.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] mb-0.5" style={{ color: "var(--text-tertiary)" }}>時間</p>
            <p className="text-sm font-bold" style={{ color: "var(--navy-deep)" }}>
              {formatTime(ex.actualTimeMinutes)}
            </p>
          </div>
          <div>
            <p className="text-[10px] mb-0.5" style={{ color: "var(--text-tertiary)" }}>店舗</p>
            <p className="text-sm font-bold" style={{ color: "var(--navy-deep)" }}>
              {ex.retailer}
            </p>
          </div>
        </div>

        <p
          className="text-sm leading-relaxed line-clamp-2"
          style={{ color: "var(--text-secondary)" }}
        >
          {ex.comment}
        </p>
      </div>
    </Link>
  );
}
