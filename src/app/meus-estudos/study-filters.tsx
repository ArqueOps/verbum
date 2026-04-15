"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Book {
  id: number;
  name: string;
  abbr: string;
}

interface StudyFiltersProps {
  books: Book[];
  currentBookId: number | null;
  currentFavoritos: boolean;
  currentDateFrom: string | null;
  currentDateTo: string | null;
}

export function StudyFilters({
  books,
  currentBookId,
  currentFavoritos,
  currentDateFrom,
  currentDateTo,
}: StudyFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null || value === "" || value === "false") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.push(qs ? `/meus-estudos?${qs}` : "/meus-estudos");
    },
    [router, searchParams],
  );

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          checked={currentFavoritos}
          onChange={(e) =>
            updateParams("favoritos", e.target.checked ? "true" : null)
          }
          className="h-4 w-4 rounded border-border text-primary accent-primary"
        />
        Somente favoritos
      </label>

      <div className="flex flex-col gap-1">
        <label htmlFor="livro-filter" className="text-xs font-medium text-muted-foreground">
          Livro
        </label>
        <select
          id="livro-filter"
          value={currentBookId ?? ""}
          onChange={(e) =>
            updateParams("livro", e.target.value || null)
          }
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        >
          <option value="">Todos os livros</option>
          {books.map((book) => (
            <option key={book.id} value={book.id}>
              {book.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="date-from" className="text-xs font-medium text-muted-foreground">
          De
        </label>
        <input
          id="date-from"
          type="date"
          value={currentDateFrom ?? ""}
          onChange={(e) => updateParams("de", e.target.value || null)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="date-to" className="text-xs font-medium text-muted-foreground">
          Até
        </label>
        <input
          id="date-to"
          type="date"
          value={currentDateTo ?? ""}
          onChange={(e) => updateParams("ate", e.target.value || null)}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
        />
      </div>
    </div>
  );
}
