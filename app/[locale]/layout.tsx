import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import "../globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing } from "@/i18n/routing";
import { SITE_BASE_URL, localizedAlternates } from "@/lib/i18nMeta";

const BASE_URL = SITE_BASE_URL;
const APP_STORE_ID = "6762496625";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Site" });
  const isEn = locale === "en";
  const alternates = localizedAlternates(locale, "/");
  return {
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    metadataBase: new URL(BASE_URL),
    keywords: [
      "DIY", "設計図", "木工", "ホームセンター", "カインズ", "コメリ",
      "材料リスト", "DIYアプリ", "棚 作り方", "ウッドデッキ 設計図",
      "ベンチ DIY", "シューズラック 手作り", "2×4材", "木材 寸法",
    ],
    openGraph: {
      siteName: "ZUMEN",
      locale: isEn ? "en_US" : "ja_JP",
      alternateLocale: isEn ? "ja_JP" : "en_US",
      type: "website",
      url: alternates.canonical,
      images: [{ url: `${BASE_URL}/opengraph-image`, width: 1200, height: 630, alt: "ZUMEN" }],
    },
    twitter: {
      card: "summary_large_image",
      site: "@zumen_diy",
      images: [`${BASE_URL}/opengraph-image`],
    },
    alternates,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "ZUMEN",
    },
    appLinks: {
      ios: {
        url: `${BASE_URL}/`,
        app_store_id: APP_STORE_ID,
      },
    },
    other: {
      "apple-itunes-app": `app-id=${APP_STORE_ID}, app-argument=${BASE_URL}/`,
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className="h-full">
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <NextIntlClientProvider>
          <GoogleAnalytics />
          <SpeedInsights />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
