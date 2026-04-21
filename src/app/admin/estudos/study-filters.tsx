"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Book {
  id: number;
  name: string;
  abbr: string;
}

interface Version {
  id: number;
  name: string;
  abbr: string;
}

interface User {
  id: string;
  label: string;
}

interface StudyFiltersProps {
  books: Book[];
  versions: Version[];
  users: User[];
  currentSearch: string;
  currentBookId: number | null;
  currentVersionId: number | null;
  currentUserId: string | null;
  currentPerPage: number;
}

export function StudyFilters({
  books,
  versions,
  users,
  currentSearch,
  currentBookId,
  currentVersionId,
  currentUserId,
}: StudyFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      params.delete("page");
      const qs = params.toString();
      router.push(qs ? `/admin/estudos?${qs}` : "/admin/estudos");
    },
    [router, searchParams],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchValue !== currentSearch) {
        updateParams({ search: searchValue || null });
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchValue, currentSearch, updateParams]);

  const hasFilters = currentSearch || currentBookId || currentVersionId || currentUserId;

  function clearFilters() {
    setSearchValue("");
    router.push("/admin/estudos");
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por título ou referência…"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="usuario-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Usuário
          </label>
          <select
            id="usuario-filter"
            value={currentUserId ?? ""}
            onChange={(e) => updateParams({ usuario: e.target.value || null })}
            className="h-9 min-w-[180px] rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">Todos os usuários</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="livro-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Livro Bíblico
          </label>
          <select
            id="livro-filter"
            value={currentBookId ?? ""}
            onChange={(e) => updateParams({ livro: e.target.value || null })}
            className="h-9 min-w-[160px] rounded-md border border-input bg-background px-3 text-sm text-foreground"
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
          <label
            htmlFor="versao-filter"
            className="text-xs font-medium text-muted-foreground"
          >
            Versão da Bíblia
          </label>
          <select
            id="versao-filter"
            value={currentVersionId ?? ""}
            onChange={(e) => updateParams({ versao: e.target.value || null })}
            className="h-9 min-w-[160px] rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value="">Todas as versões</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.name} ({version.abbr})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-2">
          <Button
            onClick={() => updateParams({})}
            size="sm"
          >
            Filtrar
          </Button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
              Limpar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
