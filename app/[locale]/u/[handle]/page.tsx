import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import UserProfileView from "@/components/UserProfileView";
import { fetchExamplesByAuthor, fetchUserProfileByUsername } from "@/lib/firestore";
import { localizedAlternates, SITE_BASE_URL } from "@/lib/i18nMeta";

interface Props {
  params: Promise<{ handle: string }>;
}

// プロフィールは表示頻度が高い割に書込頻度が低いので 5 分 ISR。
// 投稿が増えた時の表示遅延は 5 分以内に収まる。
export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await fetchUserProfileByUsername(handle);
  if (!profile) return { robots: { index: false } };
  const t = await getTranslations("User");
  const locale = await getLocale();
  const alternates = localizedAlternates(locale, `/u/${handle}`);
  const description =
    profile.bio.trim().length > 0
      ? profile.bio.slice(0, 120)
      : t("metaDescriptionFallbackTpl", { name: profile.displayName });
  const ogTitle = t("ogTitleTpl", { name: profile.displayName });
  const ogImage = `${SITE_BASE_URL}/u/${handle}/opengraph-image`;
  return {
    title: t("metaTitleTpl", { name: profile.displayName }),
    description,
    robots: { index: false },
    alternates,
    openGraph: {
      title: ogTitle,
      description,
      type: "profile",
      url: alternates.canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: ogTitle }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [ogImage],
    },
  };
}

export default async function UserHandlePage({ params }: Props) {
  const { handle } = await params;
  const profile = await fetchUserProfileByUsername(handle);
  if (!profile) notFound();
  const locale = await getLocale();
  const examples = await fetchExamplesByAuthor(profile.uid, locale);
  return <UserProfileView profile={profile} examples={examples} />;
}
