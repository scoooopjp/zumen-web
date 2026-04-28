"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";

interface Props {
  placeholder?: string;
  className?: string;
}

export default function SearchInput({
  placeholder,
  className,
}: Props) {
  const t = useTranslations("SearchInput");
  const router = useRouter();
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  const [value, setValue] = useState(query);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setValue(query);
  }, [query]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    startTransition(() => {
      router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    });
  };

  return (
    <form
      role="search"
      onSubmit={onSubmit}
      className={`relative flex items-center gap-2 ${className ?? ""}`}
    >
      <div
        className="flex-1 flex items-center rounded-xl px-3"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          style={{ color: "var(--text-tertiary)" }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          type="search"
          name="q"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder ?? t("placeholder")}
          aria-label={t("ariaLabel")}
          className="flex-1 bg-transparent py-2.5 px-2 text-sm outline-none"
          style={{ color: "var(--navy-deep)" }}
        />
      </div>
      <button
        type="submit"
        className="btn-primary text-sm"
        style={{ padding: "9px 16px", borderRadius: "10px" }}
        disabled={isPending}
      >
        {t("submit")}
      </button>
    </form>
  );
}
