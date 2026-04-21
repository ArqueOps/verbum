"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Ban, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";

interface StudyWithAuthor {
  id: string;
  title: string;
  verse_reference: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  slug: string;
  unpublish_reason?: string | null;
  profiles: { display_name: string | null } | null;
}

type AuthState = "loading" | "authorized" | "forbidden";

const PAGE_SIZES = [10, 25, 50];

async function fetchStudiesFromApi(
  supabase: ReturnType<typeof createBrowserClient>,
  searchTerm: string,
  page: number,
  pageSize: number,
) {
  let query = supabase
    .from("studies")
    .select(
      "id, title, verse_reference, is_published, published_at, created_at, slug, unpublish_reason, profiles(display_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (searchTerm.trim()) {
    query = query.ilike("title", `%${searchTerm.trim()}%`);
  }

  return query;
}

export function StudyModerationList() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [studies, setStudies] = useState<StudyWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  const supabaseRef = useRef(createBrowserClient());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const authorizedRef = useRef(false);

  const loadStudies = useCallback(
    async (searchTerm: string, currentPage: number, currentPageSize: number) => {
      setLoading(true);
      const { data, count, error } = await fetchStudiesFromApi(
        supabaseRef.current,
        searchTerm,
        currentPage,
        currentPageSize,
      );
      if (error) {
        toast.error("Erro ao carregar estudos.");
        setLoading(false);
        return;
      }
      setStudies((data as unknown as StudyWithAuthor[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      const supabase = supabaseRef.current;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;

      if (!user) {
        setAuthState("forbidden");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      if (profile?.role === "admin") {
        setAuthState("authorized");
        authorizedRef.current = true;
        loadStudies("", 0, 10);
      } else {
        setAuthState("forbidden");
      }
    }
    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, [loadStudies]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(0);
      if (authorizedRef.current) {
        loadStudies(value, 0, pageSize);
      }
    }, 300);
  }

  function handlePageSizeChange(newSize: number) {
    setPageSize(newSize);
    setPage(0);
    if (authorizedRef.current) {
      loadStudies(search, 0, newSize);
    }
  }

  function handlePageChange(newPage: number) {
    setPage(newPage);
    if (authorizedRef.current) {
      loadStudies(search, newPage, pageSize);
    }
  }

  if (authState === "loading") {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (authState === "forbidden") {
    return (
      <main
        data-testid="admin-forbidden"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-2"
      >
        <h1 className="text-2xl font-bold text-destructive">403</h1>
        <p className="text-muted-foreground">
          Acesso restrito a administradores.
        </p>
      </main>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
        Moderação de Estudos
      </h1>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="admin-search-input"
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div data-testid="admin-loading" className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : studies.length === 0 ? (
        <div
          data-testid="admin-empty"
          className="py-12 text-center text-muted-foreground"
        >
          Nenhum estudo encontrado.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table
              data-testid="admin-studies-table"
              className="w-full text-left text-sm"
            >
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Autor</th>
                  <th className="px-4 py-3 font-medium">Referência</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {studies.map((study) => (
                  <StudyRow
                    key={study.id}
                    study={study}
                    onUnpublished={(id, reason) => {
                      setStudies((prev) =>
                        prev.map((s) =>
                          s.id === id
                            ? {
                                ...s,
                                is_published: false,
                                unpublish_reason: reason,
                              }
                            : s,
                        ),
                      );
                    }}
                    onDeleted={(id) => {
                      setStudies((prev) => prev.filter((s) => s.id !== id));
                      setTotal((t) => t - 1);
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div
            className="flex items-center justify-between"
            data-testid="admin-pagination"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Exibindo</span>
              <select
                data-testid="admin-page-size"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="rounded border border-input bg-transparent px-2 py-1 text-sm"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>
                de {total} {total === 1 ? "estudo" : "estudos"}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => handlePageChange(page - 1)}
              >
                Anterior
              </Button>
              <span className="flex items-center px-2 text-sm text-muted-foreground">
                {page + 1} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => handlePageChange(page + 1)}
              >
                Próxima
              </Button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function StudyRow({
  study,
  onUnpublished,
  onDeleted,
}: {
  study: StudyWithAuthor;
  onUnpublished: (id: string, reason: string) => void;
  onDeleted: (id: string) => void;
}) {
  const [unpublishReason, setUnpublishReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [unpublishing, setUnpublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleUnpublish() {
    if (!unpublishReason.trim()) {
      setReasonError(true);
      return;
    }
    setReasonError(false);
    setUnpublishing(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("studies")
      .update({
        is_published: false,
        unpublish_reason: unpublishReason.trim(),
      } as Record<string, unknown>)
      .eq("id", study.id);

    if (error) {
      toast.error("Erro ao despublicar estudo.");
      setUnpublishing(false);
      return;
    }

    onUnpublished(study.id, unpublishReason.trim());
    toast.success("Estudo despublicado com sucesso.");
    setUnpublishReason("");
    setUnpublishing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("studies")
      .delete()
      .eq("id", study.id);

    if (error) {
      toast.error("Erro ao excluir estudo.");
      setDeleting(false);
      return;
    }

    onDeleted(study.id);
    toast.success("Estudo excluído com sucesso.");
    setDeleting(false);
  }

  const formattedDate = new Date(study.created_at).toLocaleDateString("pt-BR");
  const authorName = study.profiles?.display_name ?? "—";

  return (
    <tr
      data-testid="admin-study-row"
      className="border-b last:border-0 hover:bg-muted/20"
    >
      <td className="px-4 py-3 font-medium">{study.title}</td>
      <td className="px-4 py-3 text-muted-foreground">{authorName}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {study.verse_reference}
      </td>
      <td className="px-4 py-3">
        {study.is_published ? (
          <span
            data-testid="status-published"
            className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400"
          >
            Publicado
          </span>
        ) : (
          <span
            data-testid="status-unpublished"
            className="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400"
          >
            Despublicado
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{formattedDate}</td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          {study.is_published && (
            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    data-testid="unpublish-button"
                    variant="outline"
                    size="xs"
                  />
                }
              >
                <Ban className="size-3 mr-1" />
                Despublicar
              </AlertDialogTrigger>
              <AlertDialogPopup>
                <AlertDialogTitle>Despublicar estudo</AlertDialogTitle>
                <AlertDialogDescription>
                  Informe o motivo para despublicar este estudo. Ele deixará de
                  ser visível publicamente.
                </AlertDialogDescription>
                <div className="mt-4 space-y-2">
                  <textarea
                    data-testid="unpublish-reason"
                    placeholder="Motivo da despublicação..."
                    value={unpublishReason}
                    onChange={(e) => {
                      setUnpublishReason(e.target.value);
                      if (e.target.value.trim()) setReasonError(false);
                    }}
                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    rows={3}
                  />
                  {reasonError && (
                    <p
                      data-testid="unpublish-reason-error"
                      className="text-xs text-destructive"
                    >
                      Informe o motivo da despublicação.
                    </p>
                  )}
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <AlertDialogClose
                    render={<Button variant="outline" size="sm" />}
                  >
                    Cancelar
                  </AlertDialogClose>
                  <Button
                    data-testid="confirm-unpublish"
                    variant="destructive"
                    size="sm"
                    disabled={unpublishing}
                    onClick={handleUnpublish}
                  >
                    {unpublishing ? "Despublicando…" : "Confirmar"}
                  </Button>
                </div>
              </AlertDialogPopup>
            </AlertDialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  data-testid="delete-button"
                  variant="ghost"
                  size="xs"
                  className="text-muted-foreground hover:text-destructive"
                />
              }
            >
              <Trash2 className="size-3" />
            </AlertDialogTrigger>
            <AlertDialogPopup>
              <AlertDialogTitle>Excluir estudo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este estudo? Esta ação não pode
                ser desfeita.
              </AlertDialogDescription>
              <div className="mt-6 flex justify-end gap-3">
                <AlertDialogClose
                  render={
                    <Button
                      data-testid="cancel-delete"
                      variant="outline"
                      size="sm"
                    />
                  }
                >
                  Cancelar
                </AlertDialogClose>
                <AlertDialogClose
                  render={
                    <Button
                      data-testid="confirm-delete"
                      variant="destructive"
                      size="sm"
                      disabled={deleting}
                      onClick={handleDelete}
                    />
                  }
                >
                  {deleting ? "Excluindo…" : "Excluir"}
                </AlertDialogClose>
              </div>
            </AlertDialogPopup>
          </AlertDialog>
        </div>
      </td>
    </tr>
  );
}
