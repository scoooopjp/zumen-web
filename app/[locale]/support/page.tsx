import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedAlternates } from "@/lib/i18nMeta";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Support");
  const locale = await getLocale();
  return {
    title: t("metaTitle"),
    robots: { index: true, follow: false },
    alternates: localizedAlternates(locale, "/support"),
  };
}

interface FaqItem {
  q: string;
  a: string;
}

export default async function SupportPage() {
  const t = await getTranslations("Support");
  const faqs = t.raw("faq") as FaqItem[];

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("h1")}</h1>
      <p className="text-sm text-gray-500 mb-10">{t("lead")}</p>

      <div className="space-y-8">

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("faqHeading")}</h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                <p className="font-medium text-gray-800 mb-1">{q}</p>
                <p className="text-sm text-gray-600">{a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">{t("contactHeading")}</h2>
          <p className="text-sm text-gray-600 mb-4">
            {t("contactBody")}
          </p>
          <a
            href="mailto:scoooop.team@gmail.com"
            className="inline-block bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {t("contactCta")}
          </a>
          <p className="text-xs text-gray-400 mt-3">
            {t("contactNote")}
          </p>
        </section>

        <div className="text-center">
          <a href="https://www.scoooop.com/privacy-policy/" className="text-sm text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
            {t("privacyLink")}
          </a>
        </div>

      </div>
    </div>
  );
}
