"use client";

import { useEffect, useSyncExternalStore } from "react";

const KEY = "zumen-recent-v1";
const EVENT = "zumen-recent-changed";
const MAX = 12;

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
    // private mode quota — silent
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

export function useRecentlyViewed(): string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Mount-only hook to record the current slug as viewed. */
export function useRecordView(slug: string) {
  useEffect(() => {
    if (!slug) return;
    const current = readFresh();
    const next = [slug, ...current.filter((s) => s !== slug)].slice(0, MAX);
    write(next);
  }, [slug]);
}
