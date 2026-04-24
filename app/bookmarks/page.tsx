import type { Metadata } from "next";
import BookmarksList from "@/components/BookmarksList";
import Breadcrumbs from "@/components/Breadcrumbs";
import { fetchUseCases } from "@/lib/firestore";

export const metadata: Metadata = {
  title: "ブックマーク",
  description: "ブックマークした DIY 設計図の一覧。",
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const useCases = await fetchUseCases();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Breadcrumbs
        items={[{ name: "TOP", href: "/" }, { name: "ブックマーク" }]}
      />
      <h1 className="text-3xl font-bold text-gray-900 mb-2">ブックマーク</h1>
      <p className="text-gray-500 mb-8">
        このブラウザに保存した設計図の一覧です。アプリからもサインインすると端末間で同期できます。
      </p>
      <BookmarksList useCases={useCases} />
    </div>
  );
}
