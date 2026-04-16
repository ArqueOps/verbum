"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  useBibleBooks,
  type BibleBookWithId,
} from "@/hooks/use-bible-books";
import type { Testament } from "@/types/bible";

export interface BlogFilterValues {
  testament: string | null;
  bookId: string | null;
}

interface BlogFiltersProps {
  testament: string | null;
  bookId: string | null;
  onFilterChange: (filters: BlogFilterValues) => void;
}

export function BlogFilters({
  testament,
  bookId,
  onFilterChange,
}: BlogFiltersProps) {
  const { books, booksByTestament, loading } = useBibleBooks();

  const filteredBooks: BibleBookWithId[] = useMemo(() => {
    if (!testament) return books;
    if (testament === "old" || testament === "new") {
      return booksByTestament[testament as Testament];
    }
    return books;
  }, [testament, books, booksByTestament]);

  function handleTestamentChange(value: string) {
    const newTestament = value || null;
    onFilterChange({
      testament: newTestament,
      bookId: null,
    });
  }

  function handleBookChange(value: string) {
    onFilterChange({
      testament,
      bookId: value || null,
    });
  }

  function handleClearFilters() {
    onFilterChange({
      testament: null,
      bookId: null,
    });
  }

  const hasActiveFilters = testament !== null || bookId !== null;

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4" data-testid="blog-filters">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="testament-filter"
          className="text-xs font-medium text-muted-foreground"
        >
          Testamento
        </label>
        <select
          id="testament-filter"
          value={testament ?? ""}
          onChange={(e) => handleTestamentChange(e.target.value)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          data-testid="testament-filter"
        >
          <option value="">Todos</option>
          <option value="old">Antigo Testamento</option>
          <option value="new">Novo Testamento</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="book-filter"
          className="text-xs font-medium text-muted-foreground"
        >
          Livro
        </label>
        <select
          id="book-filter"
          value={bookId ?? ""}
          onChange={(e) => handleBookChange(e.target.value)}
          disabled={loading}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground disabled:opacity-50"
          data-testid="book-filter"
        >
          <option value="">
            {loading ? "Carregando..." : "Todos os livros"}
          </option>
          {filteredBooks.map((book) => (
            <option key={book.id} value={book.id}>
              {book.name}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          data-testid="clear-filters"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
