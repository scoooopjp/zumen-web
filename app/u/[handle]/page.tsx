import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import UserProfileView from "@/components/UserProfileView";
import { fetchExamplesByAuthor, fetchUserProfileByUsername } from "@/lib/firestore";

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
  const description =
    profile.bio.trim().length > 0
      ? profile.bio.slice(0, 120)
      : t("metaDescriptionFallbackTpl", { name: profile.displayName });
  const ogTitle = t("ogTitleTpl", { name: profile.displayName });
  return {
    title: t("metaTitleTpl", { name: profile.displayName }),
    description,
    robots: { index: false },
    alternates: { canonical: `/u/${handle}` },
    openGraph: {
      title: ogTitle,
      description,
      type: "profile",
      url: `/u/${handle}`,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
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
