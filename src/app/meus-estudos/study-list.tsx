"use client";

import { useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
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
}

interface StudyListProps {
  studies: Study[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function StudyList({ studies: initialStudies }: StudyListProps) {
  const [studies, setStudies] = useState(initialStudies);
  const [fadingId, setFadingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
          Nenhum estudo encontrado.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Ajuste os filtros ou crie um novo estudo.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {studies.map((study) => (
        <li
          key={study.id}
          className={`transition-all duration-300 ${
            fadingId === study.id ? "scale-95 opacity-0" : "opacity-100"
          }`}
        >
          <div className="group relative flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/50">
            <a href={`/estudos/${study.slug}`} className="absolute inset-0 z-0" />
            <div className="flex items-start justify-between">
              <span className="text-xs font-medium text-primary/70">
                {study.verse_reference}
              </span>
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="relative z-10 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
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
            <a href={`/estudos/${study.slug}`}>
              <h3 className="line-clamp-2 text-sm font-semibold text-card-foreground group-hover:text-primary">
                {study.title}
              </h3>
            </a>
            <time className="mt-auto text-xs text-muted-foreground" dateTime={study.created_at}>
              {formatDate(study.created_at)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
