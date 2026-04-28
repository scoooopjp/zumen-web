import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export interface Crumb {
  name: string;
  href?: string;
}

const BASE_URL = "https://zumen.scoooop.com";

/**
 * 視覚パンくず + schema.org BreadcrumbList JSON-LD。
 * 最後の要素 (現在地) は href なしで渡す。
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const t = useTranslations("Common");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.href ? `${BASE_URL}${c.href}` : undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label={t("breadcrumbAria")}
        className="text-sm text-gray-400 mb-6 flex items-center gap-1.5 flex-wrap"
      >
        {items.map((c, i) => (
          <span key={`${c.name}-${i}`} className="flex items-center gap-1.5">
            {c.href ? (
              <Link href={c.href} className="hover:text-gray-600">
                {c.name}
              </Link>
            ) : (
              <span className="text-gray-600">{c.name}</span>
            )}
            {i < items.length - 1 && <span aria-hidden="true">/</span>}
          </span>
        ))}
      </nav>
    </>
  );
}
