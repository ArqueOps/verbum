"use client";

import { useOptimistic, useTransition, useState } from "react";
import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { StudyCard } from "@/components/study-card";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { toggleFavorite } from "./actions";
import type { StudyWithBookmark } from "./actions";

interface StudyListProps {
  studies: StudyWithBookmark[];
}

function parseVerseReference(ref: string): {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
} {
  const match = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) {
    return { book: ref, chapter: 1, verseStart: 1, verseEnd: 1 };
  }
  return {
    book: match[1]!,
    chapter: Number(match[2]),
    verseStart: Number(match[3]),
    verseEnd: match[4] ? Number(match[4]) : Number(match[3]),
  };
}

type BookmarkAction = { studyId: string };

export function StudyList({ studies: initialStudies }: StudyListProps) {
  const [studies, setStudies] = useState(initialStudies);
  const [fadingId, setFadingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [, startTransition] = useTransition();

  const [optimisticBookmarks, addOptimisticBookmark] = useOptimistic<
    Record<string, boolean>,
    BookmarkAction
  >({}, (state, action) => ({
    ...state,
    [action.studyId]: !(state[action.studyId] ?? studies.find((s) => s.id === action.studyId)?.is_bookmarked ?? false),
  }));

  function getBookmarkStatus(studyId: string): boolean {
    if (studyId in optimisticBookmarks) {
      return optimisticBookmarks[studyId]!;
    }
    return studies.find((s) => s.id === studyId)?.is_bookmarked ?? false;
  }

  function handleToggleFavorite(studyId: string) {
    startTransition(async () => {
      addOptimisticBookmark({ studyId });
      const result = await toggleFavorite(studyId);
      if (!result.success) {
        toast.error("Erro ao atualizar favorito.");
      }
    });
  }

  async function handleDelete(studyId: string) {
    setDeleting(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.from("studies").delete().eq("id", studyId);

    if (error) {
      toast.error("Erro ao excluir estudo.");
      setDeleting(false);
      return;
    }

    setFadingId(studyId);
    setTimeout(() => {
      setStudies((prev) => prev.filter((s) => s.id !== studyId));
      setFadingId(null);
      setDeleting(false);
      toast.success("Estudo excluído com sucesso");
    }, 300);
  }

  if (studies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" strokeWidth={1.5} />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhum estudo ainda. Gere seu primeiro!
        </p>
        <Link href="/generate">
          <Button variant="default" size="sm" className="mt-4">
            <Sparkles className="mr-2 size-4" />
            Gerar estudo
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {studies.map((study) => {
        const parsed = parseVerseReference(study.verse_reference);
        return (
          <li
            key={study.id}
            className={`relative transition-all duration-300 ${
              fadingId === study.id ? "scale-95 opacity-0" : "opacity-100"
            }`}
          >
            <StudyCard
              title={study.title}
              book={parsed.book}
              chapter={parsed.chapter}
              verseStart={parsed.verseStart}
              verseEnd={parsed.verseEnd}
              createdAt={study.created_at}
              isPublic={study.is_published}
              isFavorite={getBookmarkStatus(study.id)}
              onToggleFavorite={() => handleToggleFavorite(study.id)}
              href={`/estudos/${study.slug}`}
            />
            <div className="absolute right-2 top-8 z-20">
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                    />
                  }
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </AlertDialogTrigger>
                <AlertDialogPopup>
                  <AlertDialogTitle>Excluir estudo</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                  <div className="mt-6 flex justify-end gap-3">
                    <AlertDialogClose
                      render={
                        <Button variant="outline" size="sm" />
                      }
                    >
                      Cancelar
                    </AlertDialogClose>
                    <AlertDialogClose
                      render={
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={deleting}
                          onClick={() => handleDelete(study.id)}
                        />
                      }
                    >
                      {deleting ? "Excluindo…" : "Excluir"}
                    </AlertDialogClose>
                  </div>
                </AlertDialogPopup>
              </AlertDialog>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
