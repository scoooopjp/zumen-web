import type { CSSProperties } from "react";

interface Props {
  href: string;
  label: string;
  style: CSSProperties;
  loading?: boolean;
  price?: number | null;
}

export default function PartPriceTag({ href, label, style, loading = false, price }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-full"
      style={style}
    >
      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM7.82 13h7.86l1.79-7H5.21l-.94-4H1v2h2l3.6 7.59L5.25 13c-.16.28-.25.61-.25.95C5 15.1 5.9 16 7 16h13v-2H7.42z" />
      </svg>
      {label}
      {loading && <span className="opacity-50 text-[10px]">…</span>}
      {!loading && price != null && (
        <span className="ml-0.5 font-normal opacity-80">¥{price.toLocaleString()}</span>
      )}
    </a>
  );
}
