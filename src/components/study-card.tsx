"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudyCardProps {
  title: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  createdAt: string;
  isPublic: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  href: string;
}

function formatPassage(
  book: string,
  chapter: number,
  verseStart: number,
  verseEnd: number,
): string {
  if (verseStart === verseEnd) {
    return `${book} ${chapter}:${verseStart}`;
  }
  return `${book} ${chapter}:${verseStart}-${verseEnd}`;
}

function formatDatePtBr(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function StudyCard({
  title,
  book,
  chapter,
  verseStart,
  verseEnd,
  createdAt,
  isPublic,
  isFavorite,
  onToggleFavorite,
  href,
}: StudyCardProps) {
  const passage = formatPassage(book, chapter, verseStart, verseEnd);
  const formattedDate = formatDatePtBr(createdAt);

  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/50"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-primary/70">{passage}</span>
        <button
          type="button"
          aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="relative z-10 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-amber-500"
        >
          <Star
            className={cn(
              "size-4 transition-colors",
              isFavorite
                ? "fill-amber-500 text-amber-500"
                : "fill-none text-muted-foreground",
            )}
          />
        </button>
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold text-card-foreground group-hover:text-primary">
        {title}
      </h3>

      <div className="mt-auto flex items-center justify-between">
        <time className="text-xs text-muted-foreground" dateTime={createdAt}>
          {formattedDate}
        </time>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight",
            isPublic
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-muted text-muted-foreground",
          )}
        >
          {isPublic ? "Publicado" : "Rascunho"}
        </span>
      </div>
    </Link>
  );
}
