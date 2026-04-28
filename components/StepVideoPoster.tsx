"use client";

/**
 * 工程動画のポスター画像 + ▶ オーバーレイ。
 *
 * Web 側では動画を直接再生せず、タップで AppGatedActionDialog を開いて
 * iOS アプリへの誘導 (App Store / Universal Link) を促す。
 *
 * 視聴可否 (リワード広告/単発購入/サブスク) はアプリ側で判定するので、
 * Web は「動画あり」の事実だけを伝えればよい。
 */

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import AppGatedActionDialog from "./AppGatedActionDialog";

interface Props {
  imageURL: string | null;
  stepOrder: number;
  /** 計測用ソース名 (例: "step_video_play") */
  source?: string;
}

export default function StepVideoPoster({
  imageURL,
  stepOrder,
  source = "step_video_play",
}: Props) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("StepVideo");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative w-full block rounded-xl overflow-hidden bg-gray-100 group"
        aria-label={t("playAriaTpl", { n: stepOrder })}
      >
        {imageURL ? (
          <Image
            src={imageURL}
            alt={t("posterAltTpl", { n: stepOrder })}
            width={1200}
            height={900}
            sizes="(max-width: 768px) 100vw, 768px"
            className="w-full h-auto"
          />
        ) : (
          <div className="w-full aspect-video bg-gray-200" aria-hidden="true" />
        )}

        {/* 半透明オーバーレイ + ▶ ボタン */}
        <div
          className="absolute inset-0 flex items-center justify-center transition-colors"
          style={{ background: "rgba(0,0,0,0.18)" }}
        >
          <span
            className="flex items-center justify-center rounded-full shadow-lg"
            style={{
              width: 64,
              height: 64,
              background: "rgba(255,255,255,0.92)",
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              style={{ color: "var(--navy-deep)" }}
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>

        <span
          className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "var(--amber-pale)", color: "var(--amber)" }}
        >
          {t("videoBadge")}
        </span>
      </button>

      <AppGatedActionDialog
        open={open}
        onClose={() => setOpen(false)}
        title={t("dialogTitle")}
        description={t("dialogDescription")}
        ctaLabel={t("dialogCta")}
        source={source}
      />
    </>
  );
}
