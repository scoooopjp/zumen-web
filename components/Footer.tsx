import Link from "next/link";

const indoor = [
  { slug: "tana", name: "棚" },
  { slug: "bookshelf", name: "本棚" },
  { slug: "tv-stand", name: "TV台" },
  { slug: "dining-table", name: "ダイニングテーブル" },
  { slug: "desk", name: "デスク・作業台" },
  { slug: "shoe-rack", name: "シューズラック" },
  { slug: "entrance-storage", name: "玄関収納" },
  { slug: "hanger-rack", name: "ハンガーラック" },
];

const outdoor = [
  { slug: "bench", name: "ベンチ" },
  { slug: "garden-table", name: "ガーデンテーブル" },
  { slug: "deck", name: "ウッドデッキ" },
  { slug: "garden-fence", name: "ガーデンフェンス" },
  { slug: "flower-box", name: "フラワーボックス" },
  { slug: "planter-dai", name: "プランター台" },
  { slug: "compost", name: "コンポスト" },
  { slug: "storage-shed", name: "物置・収納" },
];

const petKidsOther = [
  { slug: "cat-walk", name: "キャットウォーク" },
  { slug: "cat-tower", name: "キャットタワー" },
  { slug: "dog-house", name: "犬小屋" },
  { slug: "pet-storage", name: "ペット用収納" },
  { slug: "kids-furniture", name: "子供用家具" },
  { slug: "sign", name: "看板・インテリア" },
];

const stores = [
  { slug: "cainz", name: "カインズ" },
  { slug: "komeri", name: "コメリ" },
  { slug: "kohnan", name: "コーナン" },
  { slug: "dcm", name: "DCM" },
];

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 mt-24">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col gap-10">
          <div>
            <p className="font-bold text-lg text-gray-900">ZUMEN</p>
            <p className="text-sm text-gray-500 mt-1">つくりたいを、つくれるに。</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm text-gray-600">
            <div className="flex flex-col gap-2">
              <p className="font-medium text-gray-900">室内・収納</p>
              {indoor.map((c) => (
                <Link key={c.slug} href={`/category/${c.slug}`} className="hover:text-gray-900">
                  {c.name}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-gray-900">屋外・ガーデン</p>
              {outdoor.map((c) => (
                <Link key={c.slug} href={`/category/${c.slug}`} className="hover:text-gray-900">
                  {c.name}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-gray-900">ペット・子供・装飾</p>
              {petKidsOther.map((c) => (
                <Link key={c.slug} href={`/category/${c.slug}`} className="hover:text-gray-900">
                  {c.name}
                </Link>
              ))}
              <Link href="/category" className="hover:text-gray-900 text-gray-500 mt-1">
                すべて見る →
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-gray-900">ホームセンター</p>
              {stores.map((s) => (
                <Link key={s.slug} href={`/store/${s.slug}`} className="hover:text-gray-900">
                  {s.name}
                </Link>
              ))}
              <Link href="/example" className="hover:text-gray-900 mt-3 font-medium text-gray-900">
                作例ギャラリー
              </Link>
              <Link href="/search" className="hover:text-gray-900">
                検索
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">© 2025 ZUMEN. All rights reserved.</p>
          <a href="https://www.scoooop.com/privacy-policy/" className="text-xs text-gray-400 hover:text-gray-600" target="_blank" rel="noopener noreferrer">プライバシーポリシー</a>
          <Link href="/support" className="text-xs text-gray-400 hover:text-gray-600">サポート</Link>
        </div>
      </div>
    </footer>
  );
}
