import Link from "next/link";
import { useTranslations } from "next-intl";
import LottieIcon from "@/components/LottieIcon";

export default function NotFound() {
  const t = useTranslations("NotFound");
  return (
    <div className="max-w-5xl mx-auto px-4 py-32 text-center">
      <div className="flex justify-center mb-4">
        <LottieIcon name="notFound" size={200} ariaLabel={t("ariaLabel")} />
      </div>
      <p className="text-6xl font-bold text-gray-200">404</p>
      <h1 className="text-2xl font-bold text-gray-900 mt-4">{t("title")}</h1>
      <p className="text-gray-500 mt-2">{t("body")}</p>
      <Link href="/" className="btn-primary mt-8">
        {t("backHome")}
      </Link>
    </div>
  );
}
