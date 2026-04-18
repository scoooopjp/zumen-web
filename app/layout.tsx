import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "ZUMEN - つくれるDIY設計図",
    template: "%s | ZUMEN",
  },
  description:
    "設計図から資材、工程、ホームセンター別の買い物リストまで。DIYを「良さそう」で終わらせず、「ちゃんと作れる」まで支えるサービス。",
  metadataBase: new URL("https://zumen.app"),
  openGraph: {
    siteName: "ZUMEN",
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
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
