"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "zumen-bookmarks-v1";
const EVENT = "zumen-bookmarks-changed";

function read(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

function write(next: string[]) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(onChange: () => void) {
  const h = () => onChange();
  window.addEventListener(EVENT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
}

export function useBookmarks(): string[] {
  return useSyncExternalStore(subscribe, read, () => []);
}

export function useIsBookmarked(slug: string): boolean {
  const list = useBookmarks();
  return list.includes(slug);
}

export function useToggleBookmark(slug: string): () => void {
  return useCallback(() => {
    const current = read();
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    write(next);
  }, [slug]);
}
