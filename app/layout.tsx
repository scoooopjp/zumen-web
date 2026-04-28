import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import { SpeedInsights } from "@vercel/speed-insights/next";

const BASE_URL = "https://zumen.scoooop.com";
const APP_STORE_ID = "6762496625";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = await getTranslations("Site");
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
      locale: locale === "en" ? "en_US" : "ja_JP",
      type: "website",
      url: BASE_URL,
    },
    twitter: {
      card: "summary_large_image",
      site: "@zumen_diy",
    },
    alternates: {
      canonical: BASE_URL,
    },
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
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
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
