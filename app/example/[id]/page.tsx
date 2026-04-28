import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import AppOnlyGate from "@/components/AppOnlyGate";
import Breadcrumbs from "@/components/Breadcrumbs";
import LottieIcon from "@/components/LottieIcon";
import SaveButton from "@/components/SaveButton";
import ShareButton from "@/components/ShareButton";
import StepIllustration from "@/components/StepIllustration";
import StepVideoPoster from "@/components/StepVideoPoster";
import RatingsCommentsSection from "@/components/RatingsCommentsSection";
import { fetchExampleById, formatTime } from "@/lib/examples";
import { fetchComments, fetchRatingSummary } from "@/lib/firestore";
import { userProfilePath } from "@/lib/userPath";

interface Props {
  params: Promise<{ id: string }>;
}

// UGC (作例 + コメント + 評価) は 5 分 ISR。書込は iOS アプリ主導なので
// 5 分の鮮度ラグは許容。CDN キャッシュが効くので多数アクセス時のコストを抑えられる。
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const ex = await fetchExampleById(id, locale);
  if (!ex) return {};
  const t = await getTranslations("ExampleDetail");
  const flatComment = ex.comment.replace(/\s+/g, " ").trim();
  const description = t("metaDescriptionTpl", {
    cost: ex.actualCost.toLocaleString(),
    time: formatTime(ex.actualTimeMinutes, locale),
    comment: flatComment.slice(0, 80),
  });
  const title = t("metaTitleTpl", { author: ex.authorName, useCase: ex.useCaseName });
  const ogTitle = t("ogTitleTpl", { author: ex.authorName, useCase: ex.useCaseName });
  const ogImageAlt = t("ogImageAltTpl", { author: ex.authorName, useCase: ex.useCaseName });
  const images = ex.imageURL ? [{ url: ex.imageURL, alt: ogImageAlt }] : undefined;
  return {
    title,
    description,
    robots: { index: false }, // UGC は審査後に個別で index 化
    alternates: { canonical: `/example/${id}` },
    openGraph: {
      title: ogTitle,
      description: flatComment.slice(0, 200),
      type: "article",
      url: `/example/${id}`,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: flatComment.slice(0, 200),
      ...(ex.imageURL ? { images: [ex.imageURL] } : {}),
    },
  };
}

export default async function ExampleDetailPage({ params }: Props) {
  const { id } = await params;
  const locale = await getLocale();
  const ex = await fetchExampleById(id, locale);
  if (!ex) notFound();

  const t = await getTranslations("ExampleDetail");
  const tCommon = await getTranslations("Common");

  const [rating, comments] = await Promise.all([
    fetchRatingSummary({ kind: "example", id }),
    fetchComments({ kind: "example", id }),
  ]);

  const dimensionsLabel =
    ex.actualWidth && ex.actualDepth && ex.actualHeight
      ? `W${ex.actualWidth} × D${ex.actualDepth} × H${ex.actualHeight} mm`
      : null;

  const headline = t("metaTitleTpl", { author: ex.authorName, useCase: ex.useCaseName });
  const ogImageAlt = t("ogImageAltTpl", { author: ex.authorName, useCase: ex.useCaseName });

  const BASE = "https://zumen.scoooop.com";
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description: ex.comment,
    ...(ex.imageURL ? { image: ex.imageURL } : {}),
    datePublished: ex.createdAt,
    author: { "@type": "Person", name: ex.authorName },
    publisher: {
      "@type": "Organization",
      name: "ZUMEN",
      logo: {
        "@type": "ImageObject",
        url: `${BASE}/images/zumen_logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE}/example/${ex.id}`,
    },
    ...(ex.useCaseSlug
      ? { about: { "@type": "Thing", name: ex.useCaseName, url: `${BASE}/blueprint/${ex.useCaseSlug}` } }
      : {}),
    ...(rating.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average.toFixed(1),
            ratingCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <Breadcrumbs
        items={[
          { name: tCommon("breadcrumbHome"), href: "/" },
          { name: t("breadcrumbExampleList"), href: "/example" },
          ...(ex.useCaseSlug
            ? [{ name: ex.useCaseName, href: `/blueprint/${ex.useCaseSlug}` }]
            : []),
          { name: t("breadcrumbCurrent") },
        ]}
      />

      {/* 画像 */}
      <div className="relative aspect-video bg-gray-100 rounded-2xl flex items-center justify-center mb-6 overflow-hidden">
        {ex.imageURL ? (
          <Image
            src={ex.imageURL}
            alt={ogImageAlt}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        ) : (
          <LottieIcon name="photoEmpty" size={160} ariaLabel={t("noImageAria")} />
        )}
      </div>

      {/* 投稿者・日付 */}
      <div className="flex items-center justify-between mb-4">
        {(() => {
          const avatar = (
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0"
              style={{ background: "var(--amber-pale)" }}
            >
              {ex.authorPhotoURL ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={ex.authorPhotoURL}
                  alt={t("avatarAltTpl", { name: ex.authorName })}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-sm" aria-hidden="true">👤</span>
              )}
            </div>
          );
          const name = <span className="font-medium text-gray-900">{ex.authorName}</span>;
          const profileHref = userProfilePath(ex.authorUID, ex.authorUsername);
          return profileHref ? (
            <Link href={profileHref} className="flex items-center gap-2 hover:opacity-80">
              {avatar}
              {name}
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              {avatar}
              {name}
            </div>
          );
        })()}
        <span className="text-sm text-gray-400">{ex.createdAt}</span>
      </div>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 mb-1 flex-1 min-w-0">{ex.useCaseName}</h1>
        <div className="flex items-center gap-2 shrink-0 no-print">
          <ShareButton title={headline} text={ex.comment} />
          <SaveButton kind="example" />
        </div>
      </div>
      {ex.useCaseSlug && (
        <Link href={`/blueprint/${ex.useCaseSlug}`} className="text-sm font-semibold" style={{ color: "var(--amber)" }}>
          {t("blueprintLink")}
        </Link>
      )}

      {/* スタッツ */}
      <div
        className="grid grid-cols-3 gap-3 mt-6 rounded-2xl p-4 text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div>
          <p className="text-xs text-gray-400">{t("actualBudget")}</p>
          <p className="font-bold text-gray-900 mt-0.5">¥{ex.actualCost.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{t("actualTime")}</p>
          <p className="font-bold text-gray-900 mt-0.5">{formatTime(ex.actualTimeMinutes, locale)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">{t("store")}</p>
          <p className="font-bold text-gray-900 mt-0.5">{ex.retailer}</p>
        </div>
      </div>

      {/* 実寸 */}
      {dimensionsLabel && (
        <div className="mt-4 rounded-xl px-4 py-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-xs text-gray-400">{t("actualSize")}</p>
          <p className="font-medium text-gray-700 mt-0.5">{dimensionsLabel}</p>
        </div>
      )}

      {/* コメント */}
      <div className="mt-6">
        <h2 className="font-bold text-gray-900 mb-2">{t("comments")}</h2>
        <p className="text-gray-600 leading-relaxed">{ex.comment}</p>
      </div>

      {/* 工程 */}
      {ex.steps.length > 0 && (() => {
        const stepDimensions =
          ex.actualWidth && ex.actualDepth && ex.actualHeight
            ? { width: ex.actualWidth, depth: ex.actualDepth, height: ex.actualHeight }
            : undefined;
        return (
          <div className="mt-8">
            <h2 className="font-bold text-gray-900 mb-3">{t("stepsHeading")}</h2>
            <div className="space-y-5">
              {ex.steps.map((step) => (
                <div key={step.id} className="space-y-2">
                  <StepIllustration
                    stepTitle={t("stepNumberTpl", { n: step.order })}
                    stepDescription={step.text}
                    stepOrder={step.order}
                    totalSteps={ex.steps.length}
                    illustrationType={step.illustrationType}
                    dimensions={stepDimensions}
                  />
                  {(step.thumbnailURL || step.imageURL) && (
                    step.videoPath ? (
                      <StepVideoPoster
                        imageURL={step.thumbnailURL ?? step.imageURL!}
                        stepOrder={step.order}
                        source={`step_video_play_example_${ex.id}`}
                      />
                    ) : (
                      <div className="rounded-xl overflow-hidden bg-gray-100">
                        <Image
                          src={step.thumbnailURL ?? step.imageURL!}
                          alt={t("stepImageAltTpl", { n: step.order })}
                          width={1200}
                          height={900}
                          sizes="(max-width: 768px) 100vw, 768px"
                          className="w-full h-auto"
                        />
                      </div>
                    )
                  )}
                  {step.text && (
                    <p className="text-gray-700 leading-relaxed text-sm">{step.text}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 評価・コメント */}
      <RatingsCommentsSection rating={rating} comments={comments} />

      {/* 作例の投稿ゲート */}
      <div className="mt-10">
        <h2 className="font-bold text-gray-900 mb-3">{t("postSectionTitle")}</h2>
        <AppOnlyGate
          title={t("postTitle")}
          description={t("postDescription")}
          ctaLabel={t("postCta")}
        >
          <div className="p-4 space-y-2" style={{ background: "var(--surface)" }}>
            <div className="rounded-lg px-3 py-2 text-sm" style={{ background: "var(--canvas)", color: "var(--text-tertiary)" }}>
              {t("postPlaceholder")}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[t("postFieldCost"), t("postFieldTime"), t("postFieldStore")].map((l) => (
                <div key={l} className="rounded-lg px-2 py-2 text-xs text-center" style={{ background: "var(--canvas)", color: "var(--text-tertiary)" }}>{l}</div>
              ))}
            </div>
          </div>
        </AppOnlyGate>
      </div>

      {/* App CTA */}
      <div className="mt-10">
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-mid) 100%)" }}
        >
          <p className="font-bold text-white mb-1">{t("appCtaTitle")}</p>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.65)" }}>
            {t("appCtaDescription")}
          </p>
          <a
            href="https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625"
            className="btn-amber text-sm"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            {t("appCtaButton")}
          </a>
        </div>
      </div>
    </div>
  );
}
