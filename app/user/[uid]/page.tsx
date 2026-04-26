import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import UserProfileView from "@/components/UserProfileView";
import { fetchExamplesByAuthor, fetchUserProfile } from "@/lib/firestore";

interface Props {
  params: Promise<{ uid: string }>;
}

// UGC は動的に Fetch。username 設定済みは /u/{username} に正規化、
// 未設定は UID URL のままレンダリング（noindex）。
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uid } = await params;
  const profile = await fetchUserProfile(uid);
  if (!profile) return { robots: { index: false, follow: false } };
  const description =
    profile.bio.trim().length > 0
      ? profile.bio.slice(0, 120)
      : `${profile.displayName} さんの ZUMEN プロフィール`;
  const ogTitle = `${profile.displayName} | ZUMEN`;
  const canonical = profile.username ? `/u/${profile.username}` : `/user/${uid}`;
  return {
    title: `${profile.displayName}さんのプロフィール`,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description,
      type: "profile",
      url: canonical,
      ...(profile.photoURL ? { images: [profile.photoURL] } : {}),
    },
    twitter: {
      card: profile.photoURL ? "summary" : "summary_large_image",
      title: ogTitle,
      description,
      ...(profile.photoURL ? { images: [profile.photoURL] } : {}),
    },
  };
}

export default async function UserProfilePage({ params }: Props) {
  const { uid } = await params;
  const profile = await fetchUserProfile(uid);
  if (!profile) notFound();
  if (profile.username) redirect(`/u/${profile.username}`);
  const examples = await fetchExamplesByAuthor(uid);
  return <UserProfileView profile={profile} examples={examples} />;
}
