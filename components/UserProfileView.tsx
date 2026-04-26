import Link from "next/link";
import AppOnlyGate from "@/components/AppOnlyGate";
import Breadcrumbs from "@/components/Breadcrumbs";
import type { Example } from "@/lib/examples";
import type { UserProfile } from "@/lib/firestore";

interface Props {
  profile: UserProfile;
  examples: Example[];
}

export default function UserProfileView({ profile, examples }: Props) {
  const BASE = "https://zumen.scoooop.com";
  const canonicalPath = profile.username ? `/u/${profile.username}` : `/user/${profile.uid}`;
  const personLd = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name: profile.displayName,
      ...(profile.username ? { alternateName: `@${profile.username}` } : {}),
      ...(profile.bio ? { description: profile.bio } : {}),
      ...(profile.photoURL ? { image: profile.photoURL } : {}),
      url: `${BASE}${canonicalPath}`,
    },
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personLd) }}
      />
      <Breadcrumbs
        items={[
          { name: "TOP", href: "/" },
          { name: "プロフィール" },
        ]}
      />

      <div className="flex flex-col items-center text-center gap-3 mt-2">
        <div
          className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center"
          style={{ background: "var(--canvas)", border: "1px solid var(--border)" }}
        >
          {profile.photoURL ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={profile.photoURL}
              alt={`${profile.displayName} のアバター`}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-3xl select-none">👤</span>
          )}
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile.displayName}</h1>
          {profile.username && (
            <p className="text-sm mt-0.5" style={{ color: "var(--text-tertiary)" }}>
              @{profile.username}
            </p>
          )}
        </div>
        {profile.bio && (
          <p className="text-sm text-gray-600 leading-relaxed max-w-md whitespace-pre-wrap">
            {profile.bio}
          </p>
        )}
      </div>

      <div
        className="grid grid-cols-3 gap-3 mt-6 rounded-2xl p-4 text-center"
        style={{ background: "var(--canvas)" }}
      >
        <div>
          <p className="font-bold text-gray-900">{examples.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">投稿</p>
        </div>
        <div>
          <p className="font-bold text-gray-900">{profile.followingCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">フォロー中</p>
        </div>
        <div>
          <p className="font-bold text-gray-900">{profile.followerCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">フォロワー</p>
        </div>
      </div>

      <div className="mt-6 no-print">
        <AppOnlyGate
          title="フォローする"
          description="ユーザーをフォローして新着の作例を逃さずチェック。フォロー操作はアプリ限定です。"
          ctaLabel="アプリでフォローする"
        >
          <div className="p-4">
            <div
              className="rounded-lg px-3 py-2 text-sm text-center"
              style={{ background: "var(--canvas)", color: "var(--text-tertiary)" }}
            >
              + フォロー
            </div>
          </div>
        </AppOnlyGate>
      </div>

      <div className="mt-10">
        <h2 className="font-bold text-gray-900 mb-3">投稿した作例</h2>
        {examples.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">
            まだ作例の投稿がありません
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {examples.map((ex) => (
              <Link
                key={ex.id}
                href={`/example/${ex.id}`}
                className="block aspect-square overflow-hidden bg-gray-100 group"
              >
                {ex.imageURL ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={ex.imageURL}
                    alt={ex.useCaseName}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl select-none">
                    📷
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-10">
        <div
          className="rounded-2xl p-6 text-center"
          style={{ background: "linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-mid) 100%)" }}
        >
          <p className="font-bold text-white mb-1">あなたも作例を投稿する</p>
          <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.65)" }}>
            アプリでプロフィールを作成して、作品を投稿・フォローしよう。
          </p>
          <a
            href="https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625"
            className="btn-amber text-sm"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            App Store でダウンロード（無料）
          </a>
        </div>
      </div>
    </div>
  );
}
