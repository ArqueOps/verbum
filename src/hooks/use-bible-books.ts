"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/browser";
import type { BibleBook, Testament } from "@/types/bible";

export interface BibleBookWithId extends BibleBook {
  id: string;
}

export interface BibleBooksByTestament {
  old: BibleBookWithId[];
  new: BibleBookWithId[];
}

export function useBibleBooks() {
  const [books, setBooks] = useState<BibleBookWithId[]>([]);
  const [booksByTestament, setBooksByTestament] =
    useState<BibleBooksByTestament>({ old: [], new: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserClient();

    async function fetchBooks() {
      const { data, error: queryError } = await supabase
        .from("bible_books")
        .select("id, name, abbreviation, testament, total_chapters, position")
        .order("position");

      if (queryError) {
        setError(queryError.message);
        setLoading(false);
        return;
      }

      const mapped: BibleBookWithId[] = (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        abbreviation: row.abbreviation,
        testament: (row.position <= 39 ? "old" : "new") as Testament,
        chapters: row.total_chapters,
        order: row.position,
      }));

      const grouped: BibleBooksByTestament = {
        old: mapped.filter((b) => b.testament === "old"),
        new: mapped.filter((b) => b.testament === "new"),
      };

      setBooks(mapped);
      setBooksByTestament(grouped);
      setLoading(false);
    }

    fetchBooks();
  }, []);

  return { books, booksByTestament, loading, error };
}
