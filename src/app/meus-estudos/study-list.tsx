"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Trash2, Lock } from "lucide-react";
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

interface Study {
  id: string;
  title: string;
  verse_reference: string;
  created_at: string;
  slug: string;
  is_published: boolean;
  view_count: number;
}

interface StudyListProps {
  studies: Study[];
  hasSubscription: boolean;
  freeHistoryLimit: number;
  isFirstPage: boolean;
}

export function StudyList({
  studies: initialStudies,
  hasSubscription,
  freeHistoryLimit,
  isFirstPage,
}: StudyListProps) {
  const [studies, setStudies] = useState(initialStudies);
  const [fadingId, setFadingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);

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

  async function handleTogglePublish(
    studyId: string,
    currentlyPublished: boolean,
  ) {
    if (!hasSubscription) {
      toast.error(
        "Controle de visibilidade é exclusivo para assinantes. No plano gratuito, estudos são sempre públicos.",
      );
      return;
    }
    setPublishingId(studyId);
    const action = currentlyPublished ? "unpublish" : "publish";

    try {
      const res = await fetch("/api/publish-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ study_id: studyId, action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Erro desconhecido");
      }

      setStudies((prev) =>
        prev.map((s) =>
          s.id === studyId ? { ...s, is_published: !currentlyPublished } : s,
        ),
      );

      toast.success(
        currentlyPublished
          ? "Estudo marcado como privado"
          : "Estudo marcado como público",
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao alterar visibilidade";
      toast.error(message);
    } finally {
      setPublishingId(null);
    }
  }

  if (studies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <BookOpen
          className="mb-3 h-10 w-10 text-muted-foreground/50"
          strokeWidth={1.5}
        />
        <p className="text-sm font-medium text-muted-foreground">
          Você ainda não gerou nenhum estudo.
        </p>
        <Link
          href="/generate"
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          Gerar meu primeiro estudo
        </Link>
      </div>
    );
  }

  // On the first page, free users see:
  //   positions 0..freeHistoryLimit-1 unlocked; freeHistoryLimit+ blurred with paywall CTA.
  // On pages after the first, free users always see blur (everything is beyond limit).
  function isLocked(index: number): boolean {
    if (hasSubscription) return false;
    if (!isFirstPage) return true;
    return index >= freeHistoryLimit;
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {studies.map((study, index) => {
        const locked = isLocked(index);
        return (
          <li
            key={study.id}
            className={`group/item relative transition-all duration-300 ${
              fadingId === study.id ? "scale-95 opacity-0" : "opacity-100"
            }`}
          >
            <div
              className={locked ? "pointer-events-none blur-sm select-none" : ""}
              aria-hidden={locked || undefined}
            >
              <StudyCard
                title={study.title}
                verseReference={study.verse_reference}
                createdAt={study.created_at}
                isPublic={study.is_published}
                onTogglePublish={() =>
                  handleTogglePublish(study.id, study.is_published)
                }
                publishLoading={publishingId === study.id}
                visibilityLocked={!hasSubscription}
                viewCount={study.view_count}
                href={`/estudos/${study.slug}`}
              />
            </div>

            {locked && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/40 p-6 backdrop-blur-[2px]">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Lock className="h-4 w-4" strokeWidth={1.75} />
                  Histórico completo é exclusivo para assinantes
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center rounded-md bg-[#C8963E] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B5862F]"
                >
                  Assine para desbloquear
                </Link>
              </div>
            )}

            {!locked && (
              <div className="absolute right-2 top-2 z-20">
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-destructive"
                      />
                    }
                  >
                    <Trash2 className="size-3.5" />
                  </AlertDialogTrigger>
                  <AlertDialogPopup>
                    <AlertDialogTitle>Excluir estudo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                    <div className="mt-6 flex justify-end gap-3">
                      <AlertDialogClose
                        render={<Button variant="outline" size="sm" />}
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
            )}
          </li>
        );
      })}
    </ul>
  );
}
