"use client";

import { useEffect } from "react";

interface ViewTrackerProps {
  slug: string;
}

export function ViewTracker({ slug }: ViewTrackerProps) {
  useEffect(() => {
    fetch(`/api/view/${slug}`, { method: "POST" }).catch(() => {});
  }, [slug]);

  return null;
}
