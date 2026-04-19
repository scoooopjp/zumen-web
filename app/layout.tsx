import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const BASE_URL = "https://zumen.scoooop.com";
const APP_STORE_ID = "6762496625";

export const metadata: Metadata = {
  title: {
    default: "ZUMEN - つくれるDIY設計図",
    template: "%s | ZUMEN",
  },
  description:
    "設計図から資材、工程、ホームセンター別の買い物リストまで。DIYを「良さそう」で終わらせず、「ちゃんと作れる」まで支えるiOSアプリ＆Webサービス。",
  metadataBase: new URL(BASE_URL),
  keywords: [
    "DIY", "設計図", "木工", "ホームセンター", "カインズ", "コメリ",
    "材料リスト", "DIYアプリ", "棚 作り方", "ウッドデッキ 設計図",
    "ベンチ DIY", "シューズラック 手作り", "2×4材", "木材 寸法",
  ],
  openGraph: {
    siteName: "ZUMEN",
    locale: "ja_JP",
    type: "website",
    url: BASE_URL,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "ZUMEN - つくれるDIY設計図",
      },
    ],
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
