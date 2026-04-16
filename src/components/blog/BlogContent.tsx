"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SearchBar } from "@/components/search-bar";
import { BlogFilters, type BlogFilterValues } from "@/components/blog/BlogFilters";
import { BlogCard } from "@/components/blog/BlogCard";
import { createBrowserClient } from "@/lib/supabase/browser";

interface StudyResult {
  id: string;
  title: string;
  slug: string;
  verse_reference: string;
  published_at: string | null;
  book_name: string | null;
  book_abbreviation: string | null;
  book_testament: string | null;
}

async function fetchStudies(
  searchQuery: string,
  filterTestament: string | null,
  filterBookId: string | null,
): Promise<StudyResult[]> {
  const supabase = createBrowserClient();

  const args: Record<string, string> = {};
  if (searchQuery.trim()) {
    args.query = searchQuery.trim();
  }
  if (filterTestament) {
    args.testament = filterTestament;
  }
  if (filterBookId) {
    args.book_id = filterBookId;
  }

  const { data, error } = await supabase.rpc("search_published_studies", args);

  if (error) {
    console.error("Error fetching studies:", error.message);
    return [];
  }
  return (data as StudyResult[]) ?? [];
}

export function BlogContent() {
  const [studies, setStudies] = useState<StudyResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [testament, setTestament] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);

  const queryRef = useRef("");
  const testamentRef = useRef<string | null>(null);
  const bookIdRef = useRef<string | null>(null);

  const doFetch = useCallback(async () => {
    setLoading(true);
    const results = await fetchStudies(
      queryRef.current,
      testamentRef.current,
      bookIdRef.current,
    );
    setStudies(results);
    setLoading(false);
  }, []);

  // Subscribe: initial data load
  useEffect(() => {
    doFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    queryRef.current = value;
    doFetch();
  }, [doFetch]);

  const handleFilterChange = useCallback((filters: BlogFilterValues) => {
    testamentRef.current = filters.testament;
    bookIdRef.current = filters.bookId;
    setTestament(filters.testament);
    setBookId(filters.bookId);
    doFetch();
  }, [doFetch]);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SearchBar onChange={handleSearchChange} />
        <BlogFilters
          testament={testament}
          bookId={bookId}
          onFilterChange={handleFilterChange}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !studies || studies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum estudo encontrado
          </p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {studies.map((study) => (
            <BlogCard
              key={study.id}
              title={study.title}
              verseReference={study.verse_reference}
              publishedAt={study.published_at}
              bookName={study.book_name}
              slug={study.slug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
