"use client";

import Link from "next/link";
import { Eye, Globe, GlobeLock, Loader2, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudyCardProps {
  title: string;
  book?: string;
  chapter?: number;
  verseStart?: number;
  verseEnd?: number;
  verseReference?: string;
  createdAt: string;
  isPublic: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onTogglePublish?: () => void;
  publishLoading?: boolean;
  viewCount?: number;
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
  verseReference,
  createdAt,
  isPublic,
  isFavorite,
  onToggleFavorite,
  onTogglePublish,
  publishLoading,
  viewCount,
  href,
}: StudyCardProps) {
  const passage =
    verseReference ??
    formatPassage(book ?? "", chapter ?? 0, verseStart ?? 0, verseEnd ?? 0);
  const formattedDate = formatDatePtBr(createdAt);

  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/50"
    >
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium text-primary/70">{passage}</span>
        {onToggleFavorite != null && (
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
        )}
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold text-card-foreground group-hover:text-primary">
        {title}
      </h3>

      <div className="mt-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <time className="text-xs text-muted-foreground" dateTime={createdAt}>
            {formattedDate}
          </time>
          {viewCount != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="size-3" />
              {viewCount.toLocaleString("pt-BR")} {viewCount === 1 ? "visualização" : "visualizações"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {onTogglePublish && (
            <button
              type="button"
              aria-label={isPublic ? "Despublicar estudo" : "Publicar estudo"}
              disabled={publishLoading}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePublish();
              }}
              className="relative z-10 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-primary disabled:opacity-50"
            >
              {publishLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : isPublic ? (
                <GlobeLock className="size-3.5" />
              ) : (
                <Globe className="size-3.5" />
              )}
            </button>
          )}
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
      </div>
    </Link>
  );
}
