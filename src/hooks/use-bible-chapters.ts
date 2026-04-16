"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";

export function useBibleChapters(bookId: string | null) {
  const [chapterCount, setChapterCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedBookId, setFetchedBookId] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId) return;

    let cancelled = false;

    async function fetchChapters() {
      setLoading(true);
      setError(null);

      const supabase = createBrowserClient();
      const { data, error: queryError } = await supabase
        .from("bible_books")
        .select("total_chapters")
        .eq("id", bookId!)
        .single();

      if (cancelled) return;

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      setChapterCount(data?.total_chapters ?? 0);
      setFetchedBookId(bookId);
      setLoading(false);
    }

    fetchChapters();
    return () => {
      cancelled = true;
    };
  }, [bookId]);

  const chapters = useMemo(() => {
    if (!bookId || fetchedBookId !== bookId || chapterCount === null) return [];
    return Array.from({ length: chapterCount }, (_, i) => i + 1);
  }, [bookId, fetchedBookId, chapterCount]);

  return { chapters, loading, error };
}
