"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/analytics";
import type { CutItem } from "@/lib/data";

const APP_STORE_URL =
  "https://apps.apple.com/us/app/zumen-diy%E8%A8%AD%E8%A8%88%E5%9B%B3-%E6%9C%A8%E6%9D%90%E3%83%AA%E3%82%B9%E3%83%88/id6762496625";

interface Props {
  slug: string;
  baseDimensions: { width: number; depth: number; height: number };
  cutItems: CutItem[];
  retailers: string[];
}

type Axis = "W" | "D" | "H";

const MIN_MM = 100;
const MAX_MM = 3000;

function classifyAxis(length: number, base: { width: number; depth: number; height: number }): Axis {
  const dw = Math.abs(length - base.width);
  const dd = Math.abs(length - base.depth);
  const dh = Math.abs(length - base.height);
  const m = Math.min(dw, dd, dh);
  if (m === dw) return "W";
  if (m === dd) return "D";
  return "H";
}

function clampDim(n: number): number {
  if (!Number.isFinite(n)) return MIN_MM;
  return Math.max(MIN_MM, Math.min(MAX_MM, Math.round(n)));
}

export default function CustomDesignPreview({
  slug,
  baseDimensions,
  cutItems,
  retailers,
}: Props) {
  const t = useTranslations("CustomDesign");
  const [w, setW] = useState<number>(baseDimensions.width);
  const [d, setD] = useState<number>(baseDimensions.depth);
  const [h, setH] = useState<number>(baseDimensions.height);

  const scaled = useMemo(() => {
    const ratios: Record<Axis, number> = {
      W: w / baseDimensions.width,
      D: d / baseDimensions.depth,
      H: h / baseDimensions.height,
    };
    return cutItems.map((item) => {
      const axis = classifyAxis(item.length, baseDimensions);
      const scaledLen = Math.round(item.length * ratios[axis]);
      return { ...item, axis, scaledLength: scaledLen };
    });
  }, [w, d, h, baseDimensions, cutItems]);

  const totalBoardMeters = useMemo(() => {
    const totalMm = scaled.reduce((sum, it) => sum + it.scaledLength * it.quantity, 0);
    return Math.round(totalMm / 100) / 10;
  }, [scaled]);

  const hasChanged =
    w !== baseDimensions.width || d !== baseDimensions.depth || h !== baseDimensions.height;

  const onCalcFocus = () => {
    if (!hasChanged) return;
    track("custom_design_calc", {
      slug,
      width: w,
      depth: d,
      height: h,
    });
  };

  const onCtaClick = () => {
    track("app_store_click", { variant: "custom_design_preview" });
  };

  const renderInput = (
    label: string,
    value: number,
    setter: (v: number) => void,
  ) => (
    <div>
      <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</p>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => setter(clampDim(Number(e.target.value)))}
        onBlur={onCalcFocus}
        min={MIN_MM}
        max={MAX_MM}
        className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2"
        style={{
          background: "var(--surface)",
          color: "var(--navy-deep)",
          border: "1px solid var(--border)",
        }}
      />
    </div>
  );

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid var(--border)", background: "var(--surface)" }}
    >
      <div className="p-5 space-y-5">
        {/* Inputs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold" style={{ color: "var(--navy-deep)" }}>
              {t("inputsTitle")}
            </p>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "var(--amber-pale)", color: "var(--amber)" }}
            >
              {t("roughEstimate")}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {renderInput(t("widthW"), w, setW)}
            {renderInput(t("depthD"), d, setD)}
            {renderInput(t("heightH"), h, setH)}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
            {t("baseDimsTpl", { w: baseDimensions.width, d: baseDimensions.depth, h: baseDimensions.height })}
          </p>
        </div>

        {/* Scaled cut list */}
        <div>
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--navy-deep)" }}>
            {t("cutListTitle")}
          </p>
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--border)", background: "var(--canvas)" }}
          >
            <div
              className="grid text-xs font-bold px-3 py-2"
              style={{
                gridTemplateColumns: "1fr 110px 40px",
                color: "var(--text-secondary)",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span>{t("partName")}</span>
              <span>{t("partSpec")}</span>
              <span className="text-right">{t("partQty")}</span>
            </div>
            {scaled.map((item, idx) => {
              const changed = item.scaledLength !== item.length;
              return (
                <div
                  key={idx}
                  className="grid items-center px-3 py-2.5"
                  style={{
                    gridTemplateColumns: "1fr 110px 40px",
                    borderBottom: idx < scaled.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <span className="text-sm" style={{ color: "var(--navy-deep)" }}>
                    {item.partName}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: changed ? "var(--amber)" : "var(--text-secondary)" }}
                  >
                    {item.thickness}×{item.width}×{item.scaledLength}
                  </span>
                  <span className="text-sm font-bold text-right" style={{ color: "var(--navy-deep)" }}>
                    ×{item.quantity}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
            {t("totalLengthTpl", { meters: totalBoardMeters })}
            {retailers.length > 0 && t("supportedTpl", { retailers: retailers.join(" / ") })}
          </p>
        </div>

        {/* App CTA */}
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{
            background: "linear-gradient(135deg, var(--navy-deep) 0%, var(--navy-mid) 100%)",
          }}
        >
          <div>
            <p className="text-xs font-bold mb-1" style={{ color: "var(--amber-light)" }}>
              {t("ctaHeadline")}
            </p>
            <p className="text-sm text-white leading-relaxed">
              {t("ctaBody")}
            </p>
          </div>
          <a
            href={APP_STORE_URL}
            onClick={onCtaClick}
            className="btn-amber text-sm w-full justify-center"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            {t("ctaButton")}
          </a>
        </div>
      </div>
    </div>
  );
}
