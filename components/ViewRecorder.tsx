"use client";

import { useRecordView } from "@/lib/useRecentlyViewed";

export default function ViewRecorder({ slug }: { slug: string }) {
  useRecordView(slug);
  return null;
}
