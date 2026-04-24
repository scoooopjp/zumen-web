"use client";

import Link from "next/link";
import BlueprintCard from "@/components/BlueprintCard";
import LottieIcon from "@/components/LottieIcon";
import { useBookmarks } from "@/lib/useBookmarks";
import type { UseCase } from "@/lib/data";

interface Props {
  useCases: UseCase[];
}

export default function BookmarksList({ useCases }: Props) {
  const slugs = useBookmarks();
  const bookmarked = slugs
    .map((slug) => useCases.find((uc) => uc.slug === slug))
    .filter((uc): uc is UseCase => Boolean(uc));

  if (bookmarked.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="flex justify-center mb-4">
          <LottieIcon name="bookmarkEmpty" size={180} ariaLabel="ブックマーク未登録" />
        </div>
        <p className="text-gray-500 mb-6">
          まだブックマークした設計図はありません。
        </p>
        <Link
          href="/category"
          className="btn-primary text-sm inline-flex items-center gap-1.5"
        >
          設計図を探す
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {bookmarked.map((uc) => (
        <BlueprintCard key={uc.id} useCase={uc} />
      ))}
    </div>
  );
}
