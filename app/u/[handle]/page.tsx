import type { Metadata } from "next";
import { notFound } from "next/navigation";
import UserProfileView from "@/components/UserProfileView";
import { fetchExamplesByAuthor, fetchUserProfileByUsername } from "@/lib/firestore";

interface Props {
  params: Promise<{ handle: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const profile = await fetchUserProfileByUsername(handle);
  if (!profile) return { robots: { index: false } };
  const description =
    profile.bio.trim().length > 0
      ? profile.bio.slice(0, 120)
      : `${profile.displayName} さんの ZUMEN プロフィール`;
  return {
    title: `${profile.displayName}さん（@${handle}）のプロフィール`,
    description,
    robots: { index: false },
    alternates: { canonical: `/u/${handle}` },
    openGraph: {
      title: `${profile.displayName} | ZUMEN`,
      description,
      ...(profile.photoURL ? { images: [profile.photoURL] } : {}),
    },
  };
}

export default async function UserHandlePage({ params }: Props) {
  const { handle } = await params;
  const profile = await fetchUserProfileByUsername(handle);
  if (!profile) notFound();
  const examples = await fetchExamplesByAuthor(profile.uid);
  return <UserProfileView profile={profile} examples={examples} />;
}
