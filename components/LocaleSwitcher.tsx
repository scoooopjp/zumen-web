"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export default function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400" aria-label="Language switcher">
      <Link
        href={pathname}
        locale="ja"
        prefetch={false}
        className={locale === "ja" ? "text-gray-700 font-medium" : "hover:text-gray-600"}
        aria-current={locale === "ja" ? "true" : undefined}
      >
        日本語
      </Link>
      <span aria-hidden="true">/</span>
      <Link
        href={pathname}
        locale="en"
        prefetch={false}
        className={locale === "en" ? "text-gray-700 font-medium" : "hover:text-gray-600"}
        aria-current={locale === "en" ? "true" : undefined}
      >
        English
      </Link>
    </div>
  );
}
