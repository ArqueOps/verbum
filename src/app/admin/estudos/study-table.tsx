"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EyeOff,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import { unpublishStudy, deleteStudy, type StudyRow } from "./actions";

interface StudyTableProps {
  studies: StudyRow[];
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
}

export function StudyTable({
  studies: initialStudies,
  page,
  totalPages,
  totalCount,
  perPage,
}: StudyTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [studies, setStudies] = useState(initialStudies);
  const [fadingId, setFadingId] = useState<string | null>(null);

  function navigateToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(newPage));
    }
    const qs = params.toString();
    router.push(qs ? `/admin/estudos?${qs}` : "/admin/estudos");
  }

  function changePerPage(newPerPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("perPage", String(newPerPage));
    params.delete("page");
    const qs = params.toString();
    router.push(qs ? `/admin/estudos?${qs}` : "/admin/estudos");
  }

  if (studies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <BookOpen
          className="mb-3 h-10 w-10 text-muted-foreground/50"
          strokeWidth={1.5}
        />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhum estudo encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-muted-foreground">
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Referência</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">
                Autor
              </th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">
                Data de Criação
              </th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {studies.map((study) => (
              <StudyRowItem
                key={study.id}
                study={study}
                isFading={fadingId === study.id}
                onRemove={(id) => {
                  setFadingId(id);
                  setTimeout(() => {
                    setStudies((prev) => prev.filter((s) => s.id !== id));
                    setFadingId(null);
                  }, 300);
                }}
                onUnpublished={(id) => {
                  setStudies((prev) =>
                    prev.map((s) =>
                      s.id === id ? { ...s, is_published: false } : s,
                    ),
                  );
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        perPage={perPage}
        onPageChange={navigateToPage}
        onPerPageChange={changePerPage}
      />
    </div>
  );
}

function StudyRowItem({
  study,
  isFading,
  onRemove,
  onUnpublished,
}: {
  study: StudyRow;
  isFading: boolean;
  onRemove: (id: string) => void;
  onUnpublished: (id: string) => void;
}) {
  return (
    <tr
      className={`border-b last:border-0 transition-all duration-300 ${
        isFading ? "scale-95 opacity-0" : "opacity-100"
      }`}
    >
      <td className="max-w-[200px] truncate px-4 py-3 font-medium">
        {study.title}
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {study.verse_reference}
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
        {study.owner?.display_name || study.owner?.email || "—"}
      </td>
      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
        {new Date(study.created_at).toLocaleDateString("pt-BR")}
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
            study.is_published
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}
        >
          {study.is_published ? "Publicado" : "Despublicado"}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {study.is_published && (
            <UnpublishButton
              studyId={study.id}
              onSuccess={() => onUnpublished(study.id)}
            />
          )}
          <DeleteButton
            studyId={study.id}
            onSuccess={() => onRemove(study.id)}
          />
        </div>
      </td>
    </tr>
  );
}

function UnpublishButton({
  studyId,
  onSuccess,
}: {
  studyId: string;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      try {
        await unpublishStudy(studyId, reason);
        onSuccess();
        toast.success("Estudo despublicado com sucesso");
        setReason("");
      } catch {
        toast.error("Erro ao despublicar estudo");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-yellow-600"
          />
        }
      >
        <EyeOff className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogTitle>Despublicar estudo</AlertDialogTitle>
        <AlertDialogDescription>
          Informe o motivo da despublicação. O estudo ficará visível apenas para
          o autor.
        </AlertDialogDescription>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo da despublicação…"
          rows={3}
          className="mt-4 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/50"
        />
        <div className="mt-4 flex justify-end gap-3">
          <AlertDialogClose
            render={<Button variant="outline" size="sm" />}
          >
            Cancelar
          </AlertDialogClose>
          <Button
            variant="destructive"
            size="sm"
            disabled={!reason.trim() || isPending}
            onClick={handleConfirm}
          >
            {isPending ? "Despublicando…" : "Despublicar"}
          </Button>
        </div>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

function DeleteButton({
  studyId,
  onSuccess,
}: {
  studyId: string;
  onSuccess: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await deleteStudy(studyId);
        onSuccess();
        toast.success("Estudo deletado com sucesso");
      } catch {
        toast.error("Erro ao deletar estudo");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-destructive"
          />
        }
      >
        <Trash2 className="size-3.5" />
      </AlertDialogTrigger>
      <AlertDialogPopup>
        <AlertDialogTitle>Deletar estudo</AlertDialogTitle>
        <AlertDialogDescription>
          Tem certeza que deseja deletar este estudo? Esta ação não pode ser
          desfeita.
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
                disabled={isPending}
                onClick={handleDelete}
              />
            }
          >
            {isPending ? "Deletando…" : "Deletar"}
          </AlertDialogClose>
        </div>
      </AlertDialogPopup>
    </AlertDialog>
  );
}

function Pagination({
  page,
  totalPages,
  totalCount,
  perPage,
  onPageChange,
  onPerPageChange,
}: {
  page: number;
  totalPages: number;
  totalCount: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{totalCount} estudo{totalCount !== 1 ? "s" : ""}</span>
        <span>·</span>
        <span>
          Página {page} de {totalPages}
        </span>
        <span>·</span>
        <select
          value={perPage}
          onChange={(e) => onPerPageChange(Number(e.target.value))}
          className="h-7 rounded border border-input bg-background px-2 text-sm"
        >
          <option value={10}>10 por página</option>
          <option value={20}>20 por página</option>
          <option value={50}>50 por página</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon-xs"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-xs"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
