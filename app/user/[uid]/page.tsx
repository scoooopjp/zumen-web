import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { fetchUserProfile } from "@/lib/firestore";

interface Props {
  params: Promise<{ uid: string }>;
}

// UGC は動的に Fetch、UGC のため検索エンジンには noindex
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uid } = await params;
  const profile = await fetchUserProfile(uid);
  if (!profile?.username) return { robots: { index: false, follow: false } };
  const description =
    profile.bio.trim().length > 0
      ? profile.bio.slice(0, 120)
      : `${profile.displayName} さんの ZUMEN プロフィール`;
  const ogTitle = `${profile.displayName} | ZUMEN`;
  return {
    title: `${profile.displayName}さんのプロフィール`,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical: `/u/${profile.username}` },
    openGraph: {
      title: ogTitle,
      description,
      type: "profile",
      url: `/u/${profile.username}`,
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
  if (!profile?.username) notFound();
  redirect(`/u/${profile.username}`);
}
