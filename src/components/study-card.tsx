"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface StudyCardProps {
  id: string;
  title: string;
  verseReference: string;
  createdAt: string;
  isPublic: boolean;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  slug: string;
}

function formatDatePtBr(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function StudyCard({
  id,
  title,
  verseReference,
  createdAt,
  isPublic,
  isFavorite,
  onToggleFavorite,
  slug,
}: StudyCardProps) {
  return (
    <Link href={`/estudos/${slug}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle>{title}</CardTitle>
            <button
              type="button"
              aria-label={isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite(id);
              }}
              className="shrink-0 p-1"
            >
              <Star
                className={`h-5 w-5 ${
                  isFavorite
                    ? "fill-[#C8963E] text-[#C8963E]"
                    : "text-neutral-400"
                }`}
                data-testid="star-icon"
              />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{verseReference}</p>
          <div className="mt-2 flex items-center justify-between">
            <time dateTime={createdAt} className="text-xs text-muted-foreground">
              {formatDatePtBr(createdAt)}
            </time>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                isPublic
                  ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
              }`}
            >
              {isPublic ? "Publicado" : "Rascunho"}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function StudyCardSkeleton() {
  return (
    <Card className="animate-pulse" data-testid="study-card-skeleton">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="h-5 w-3/4 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-5 w-5 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-4 w-1/2 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="mt-2 flex items-center justify-between">
          <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-5 w-16 rounded-full bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </CardContent>
    </Card>
  );
}
