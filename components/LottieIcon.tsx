"use client";

import { useEffect, useRef, useState } from "react";

type LottieLike = { loadAnimation: (opts: unknown) => { destroy: () => void } };

interface Props {
  name: string;
  size?: number | string;
  ariaLabel?: string;
  loop?: boolean;
  className?: string;
}

export default function LottieIcon({ name, size = 48, ariaLabel, loop = true, className }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    let cancelled = false;
    let anim: { destroy: () => void } | null = null;
    (async () => {
      try {
        const [mod, res] = await Promise.all([
          import("lottie-web"),
          fetch(`/lottie/${name}.json`, { cache: "default" }),
        ]);
        if (cancelled || !ref.current || !res.ok) { if (!res.ok) setFailed(true); return; }
        const animationData = await res.json();
        if (cancelled || !ref.current) return;
        const lottie = ((mod as unknown as { default?: LottieLike }).default ?? (mod as unknown as LottieLike));
        anim = lottie.loadAnimation({
          container: ref.current,
          renderer: "svg",
          loop,
          autoplay: true,
          animationData,
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, [name, loop]);
  if (failed) return null;
  const dim = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      ref={ref}
      className={className}
      style={{ width: dim, aspectRatio: "180 / 140" }}
      role="img"
      aria-label={ariaLabel ?? name}
    />
  );
}
