"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [1];

  if (current > 3) {
    pages.push("...");
  }

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (current < total - 2) {
    pages.push("...");
  }

  pages.push(total);
  return pages;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("pagina");
      } else {
        params.set("pagina", String(page));
      }
      const qs = params.toString();
      router.push(qs ? `/meus-estudos?${qs}` : "/meus-estudos");
    },
    [router, searchParams],
  );

  const pages = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="Paginação" className="flex items-center justify-center gap-1">
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => goToPage(currentPage - 1)}
        className="inline-flex size-9 items-center justify-center rounded-md border border-border text-sm text-muted-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-4" />
      </button>

      {pages.map((page, idx) =>
        page === "..." ? (
          <span
            key={`ellipsis-${idx}`}
            className="inline-flex size-9 items-center justify-center text-sm text-muted-foreground"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            type="button"
            onClick={() => goToPage(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-md text-sm font-medium transition-colors",
              page === currentPage
                ? "bg-primary text-primary-foreground"
                : "border border-border text-foreground hover:bg-accent",
            )}
          >
            {page}
          </button>
        ),
      )}

      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => goToPage(currentPage + 1)}
        className="inline-flex size-9 items-center justify-center rounded-md border border-border text-sm text-muted-foreground transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        aria-label="Próxima página"
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
