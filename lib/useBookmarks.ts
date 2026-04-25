"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "zumen-bookmarks-v1";
const EVENT = "zumen-bookmarks-changed";

const EMPTY: string[] = [];

let cached: string[] | null = null;

function readFresh(): string[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const filtered = parsed.filter((s): s is string => typeof s === "string");
    return filtered.length === 0 ? EMPTY : filtered;
  } catch {
    return EMPTY;
  }
}

function getSnapshot(): string[] {
  if (cached === null) cached = readFresh();
  return cached;
}

function getServerSnapshot(): string[] {
  return EMPTY;
}

function invalidate() {
  cached = null;
}

function write(next: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private mode quota or disabled storage — fail silently
  }
  invalidate();
  window.dispatchEvent(new CustomEvent(EVENT));
}

function subscribe(onChange: () => void) {
  const handler = () => {
    invalidate();
    onChange();
  };
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function useBookmarks(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsBookmarked(slug: string): boolean {
  const list = useBookmarks();
  return list.includes(slug);
}

export function useToggleBookmark(slug: string): () => void {
  return useCallback(() => {
    const current = readFresh();
    const next = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    write(next);
  }, [slug]);
}
