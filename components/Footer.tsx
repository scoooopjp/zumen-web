import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

const indoor = ["tana", "bookshelf", "tv-stand", "dining-table", "desk", "shoe-rack", "entrance-storage", "hanger-rack"] as const;
const outdoor = ["bench", "garden-table", "deck", "garden-fence", "flower-box", "planter-dai", "compost", "storage-shed"] as const;
const petKidsOther = ["cat-walk", "cat-tower", "dog-house", "pet-storage", "kids-furniture", "sign"] as const;
const stores = ["cainz", "komeri", "kohnan", "dcm"] as const;

export default function Footer() {
  const t = useTranslations("Footer");
  const tSite = useTranslations("Site");
  return (
    <footer className="border-t border-gray-100 mt-24">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex flex-col gap-10">
          <div>
            <p className="font-bold text-lg text-gray-900">ZUMEN</p>
            <p className="text-sm text-gray-500 mt-1">{tSite("tagline")}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm text-gray-600">
            <div className="flex flex-col gap-2">
              <p className="font-medium text-gray-900">{t("indoor")}</p>
              {indoor.map((slug) => (
                <Link key={slug} href={`/category/${slug}`} className="hover:text-gray-900">
                  {t(`categories.${slug}`)}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-gray-900">{t("outdoor")}</p>
              {outdoor.map((slug) => (
                <Link key={slug} href={`/category/${slug}`} className="hover:text-gray-900">
                  {t(`categories.${slug}`)}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-gray-900">{t("petKidsOther")}</p>
              {petKidsOther.map((slug) => (
                <Link key={slug} href={`/category/${slug}`} className="hover:text-gray-900">
                  {t(`categories.${slug}`)}
                </Link>
              ))}
              <Link href="/category" className="hover:text-gray-900 text-gray-500 mt-1">
                {t("viewAll")}
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-medium text-gray-900">{t("stores")}</p>
              {stores.map((slug) => (
                <Link key={slug} href={`/store/${slug}`} className="hover:text-gray-900">
                  {t(`retailers.${slug}`)}
                </Link>
              ))}
              <Link href="/example" className="hover:text-gray-900 mt-3 font-medium text-gray-900">
                {t("exampleGallery")}
              </Link>
              <Link href="/search" className="hover:text-gray-900">
                {t("search")}
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-10 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-400">{t("copyright")}</p>
          <a href="https://www.scoooop.com/privacy-policy/" className="text-xs text-gray-400 hover:text-gray-600" target="_blank" rel="noopener noreferrer">{t("privacyPolicy")}</a>
          <Link href="/support" className="text-xs text-gray-400 hover:text-gray-600">{t("support")}</Link>
        </div>
      </div>
    </footer>
  );
}
