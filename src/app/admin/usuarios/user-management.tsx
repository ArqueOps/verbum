"use client";

import { useActionState, useState, useEffect, useCallback, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogClose,
} from "@/components/ui/alert-dialog";
import type { AdminUserRow, CancellationEntry } from "@/lib/admin-users";
import type { ActionResult } from "./actions";
import {
  grantSubscriptionAction,
  revokeSubscriptionAction,
  extendSubscriptionAction,
  deactivateAccountAction,
} from "./actions";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  UserPlus,
  UserMinus,
  CalendarPlus,
  Ban,
  History,
  X,
} from "lucide-react";

const initialActionState: ActionResult = { success: false, message: "" };

const PER_PAGE_OPTIONS = [10, 20, 50] as const;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: "active" | "past_due" | "canceled" | "expired" | null }) {
  const config = {
    active: { label: "Ativo", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    past_due: { label: "Pendente", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
    canceled: { label: "Cancelado", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
    expired: { label: "Expirado", className: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400" },
  };

  const { label, className } = config[status ?? "expired"] ?? config.expired;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-foreground/10" />
        </td>
      ))}
    </tr>
  );
}

function GrantSubscriptionModal({
  user,
  onClose,
}: {
  user: AdminUserRow;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(grantSubscriptionAction, initialActionState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onClose();
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, onClose]);

  return (
    <AlertDialogPopup className="max-w-lg">
      <AlertDialogTitle>Ativar Assinatura</AlertDialogTitle>
      <AlertDialogDescription>
        Ativar assinatura para <strong>{user.display_name ?? user.email}</strong>
      </AlertDialogDescription>
      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="userId" value={user.id} />

        <div className="space-y-2">
          <Label htmlFor="planInterval">Plano</Label>
          <select
            id="planInterval"
            name="planInterval"
            required
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Selecione o plano</option>
            <option value="monthly">Mensal</option>
            <option value="annual">Anual</option>
          </select>
          {state.errors?.planInterval && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.errors.planInterval[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="periodMonths">Período (meses)</Label>
          <Input
            id="periodMonths"
            name="periodMonths"
            type="number"
            min={1}
            max={36}
            defaultValue={1}
            required
          />
          {state.errors?.periodMonths && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.errors.periodMonths[0]}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <AlertDialogClose>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </AlertDialogClose>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Ativando..." : "Ativar Assinatura"}
          </Button>
        </div>
      </form>
    </AlertDialogPopup>
  );
}

function RevokeSubscriptionModal({
  user,
  onClose,
}: {
  user: AdminUserRow;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(revokeSubscriptionAction, initialActionState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onClose();
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, onClose]);

  return (
    <AlertDialogPopup className="max-w-lg">
      <AlertDialogTitle>Desativar Assinatura</AlertDialogTitle>
      <AlertDialogDescription>
        Desativar assinatura de <strong>{user.display_name ?? user.email}</strong>
      </AlertDialogDescription>
      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="userId" value={user.id} />

        <div className="space-y-2">
          <Label htmlFor="reason">Motivo</Label>
          <textarea
            id="reason"
            name="reason"
            required
            minLength={5}
            maxLength={500}
            rows={3}
            placeholder="Informe o motivo da desativação..."
            className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {state.errors?.reason && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.errors.reason[0]}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <AlertDialogClose>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </AlertDialogClose>
          <Button type="submit" variant="destructive" disabled={isPending}>
            {isPending ? "Desativando..." : "Desativar Assinatura"}
          </Button>
        </div>
      </form>
    </AlertDialogPopup>
  );
}

function ExtendSubscriptionModal({
  user,
  onClose,
}: {
  user: AdminUserRow;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(extendSubscriptionAction, initialActionState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onClose();
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, onClose]);

  return (
    <AlertDialogPopup className="max-w-lg">
      <AlertDialogTitle>Estender Assinatura</AlertDialogTitle>
      <AlertDialogDescription>
        Estender assinatura de <strong>{user.display_name ?? user.email}</strong>
      </AlertDialogDescription>
      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="userId" value={user.id} />

        <div className="space-y-2">
          <Label htmlFor="days">Dias adicionais</Label>
          <Input
            id="days"
            name="days"
            type="number"
            min={1}
            max={365}
            defaultValue={30}
            required
          />
          {state.errors?.days && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.errors.days[0]}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <AlertDialogClose>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </AlertDialogClose>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Estendendo..." : "Estender Assinatura"}
          </Button>
        </div>
      </form>
    </AlertDialogPopup>
  );
}

function DeactivateAccountModal({
  user,
  onClose,
}: {
  user: AdminUserRow;
  onClose: () => void;
}) {
  const [state, formAction, isPending] = useActionState(deactivateAccountAction, initialActionState);

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      onClose();
    } else if (state.message && !state.success) {
      toast.error(state.message);
    }
  }, [state, onClose]);

  return (
    <AlertDialogPopup className="max-w-lg">
      <AlertDialogTitle>Desativar Conta</AlertDialogTitle>
      <AlertDialogDescription>
        Tem certeza que deseja desativar a conta de{" "}
        <strong>{user.display_name ?? user.email}</strong>? Esta ação impedirá o
        usuário de acessar a plataforma.
      </AlertDialogDescription>
      <form action={formAction} className="mt-4">
        <input type="hidden" name="userId" value={user.id} />
        <div className="flex justify-end gap-2 pt-2">
          <AlertDialogClose>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancelar
            </Button>
          </AlertDialogClose>
          <Button type="submit" variant="destructive" disabled={isPending}>
            {isPending ? "Desativando..." : "Confirmar Desativação"}
          </Button>
        </div>
      </form>
    </AlertDialogPopup>
  );
}

function CancellationHistoryPanel({
  user,
  entries,
  onClose,
}: {
  user: AdminUserRow;
  entries: CancellationEntry[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 h-full w-full max-w-md overflow-y-auto border-l border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-card-foreground">
            Histórico de Cancelamento
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {user.display_name ?? user.email}
        </p>

        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum registro de cancelamento encontrado.
          </p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-lg border border-border p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {formatDateTime(entry.canceled_at)}
                  </span>
                </div>
                <p className="text-sm text-foreground">
                  {entry.reason ?? "Sem motivo informado"}
                </p>
                {entry.admin_id && (
                  <p className="text-xs text-muted-foreground">
                    Por: {entry.admin_id}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UserActionsDropdown({
  user,
  onAction,
}: {
  user: AdminUserRow;
  onAction: (action: string, user: AdminUserRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasActiveSub = user.subscription_status === "active";

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(!open)}
        aria-label="Ações do usuário"
      >
        <MoreHorizontal className="size-4" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-border bg-card py-1 shadow-lg">
            {!hasActiveSub && (
              <button
                onClick={() => { setOpen(false); onAction("grant", user); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <UserPlus className="size-4" />
                Ativar Assinatura
              </button>
            )}
            {hasActiveSub && (
              <>
                <button
                  onClick={() => { setOpen(false); onAction("revoke", user); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  <UserMinus className="size-4" />
                  Desativar Assinatura
                </button>
                <button
                  onClick={() => { setOpen(false); onAction("extend", user); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
                >
                  <CalendarPlus className="size-4" />
                  Estender Assinatura
                </button>
              </>
            )}
            <button
              onClick={() => { setOpen(false); onAction("deactivate", user); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-muted dark:text-red-400"
            >
              <Ban className="size-4" />
              Desativar Conta
            </button>
            <div className="my-1 border-t border-border" />
            <button
              onClick={() => { setOpen(false); onAction("history", user); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <History className="size-4" />
              Ver Histórico de Cancelamento
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function UserManagement({
  initialUsers,
  initialTotal,
  initialSearch,
  initialPage,
  initialPerPage,
}: {
  initialUsers: AdminUserRow[];
  initialTotal: number;
  initialSearch: string;
  initialPage: number;
  initialPerPage: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState(initialSearch);
  const [activeModal, setActiveModal] = useState<{
    type: "grant" | "revoke" | "extend" | "deactivate" | null;
    user: AdminUserRow | null;
  }>({ type: null, user: null });
  const [historyPanel, setHistoryPanel] = useState<{
    user: AdminUserRow;
    entries: CancellationEntry[];
  } | null>(null);

  const users = initialUsers;
  const total = initialTotal;
  const page = initialPage;
  const perPage = initialPerPage;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }
      startTransition(() => {
        router.push(`/admin/usuarios?${params.toString()}`);
      });
    },
    [router, searchParams, startTransition],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      updateParams({ q: search, page: "1" });
    }, 400);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAction = useCallback(
    async (action: string, user: AdminUserRow) => {
      if (action === "history") {
        try {
          const res = await fetch(
            `/api/admin/usuarios/cancellation-history?userId=${user.id}`,
          );
          const data = await res.json();
          setHistoryPanel({ user, entries: data.entries ?? [] });
        } catch {
          toast.error("Erro ao carregar histórico.");
        }
        return;
      }
      setActiveModal({
        type: action as "grant" | "revoke" | "extend" | "deactivate",
        user,
      });
    },
    [],
  );

  const closeModal = useCallback(() => {
    setActiveModal({ type: null, user: null });
  }, []);

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por e-mail ou nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">E-mail</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data de Cadastro</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total de Estudos</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Plano</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Fim da Assinatura</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Último Acesso</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isPending
              ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              : users.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-foreground">{user.email}</td>
                    <td className="px-4 py-3 text-foreground">{user.display_name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.created_at)}</td>
                    <td className="px-4 py-3 text-right text-foreground">{user.study_count}</td>
                    <td className="px-4 py-3">{user.plan_label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.subscription_end)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(user.last_sign_in_at)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={user.subscription_status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <UserActionsDropdown user={user} onAction={handleAction} />
                    </td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Exibindo</span>
          <select
            value={perPage}
            onChange={(e) => updateParams({ perPage: e.target.value, page: "1" })}
            className="h-7 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring"
          >
            {PER_PAGE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <span>de {total} usuários</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page <= 1 || isPending}
            onClick={() => updateParams({ page: String(page - 1) })}
            aria-label="Página anterior"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-3 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon-sm"
            disabled={page >= totalPages || isPending}
            onClick={() => updateParams({ page: String(page + 1) })}
            aria-label="Próxima página"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Modals */}
      {activeModal.type === "grant" && activeModal.user && (
        <AlertDialog open onOpenChange={(open) => { if (!open) closeModal(); }}>
          <GrantSubscriptionModal user={activeModal.user} onClose={closeModal} />
        </AlertDialog>
      )}
      {activeModal.type === "revoke" && activeModal.user && (
        <AlertDialog open onOpenChange={(open) => { if (!open) closeModal(); }}>
          <RevokeSubscriptionModal user={activeModal.user} onClose={closeModal} />
        </AlertDialog>
      )}
      {activeModal.type === "extend" && activeModal.user && (
        <AlertDialog open onOpenChange={(open) => { if (!open) closeModal(); }}>
          <ExtendSubscriptionModal user={activeModal.user} onClose={closeModal} />
        </AlertDialog>
      )}
      {activeModal.type === "deactivate" && activeModal.user && (
        <AlertDialog open onOpenChange={(open) => { if (!open) closeModal(); }}>
          <DeactivateAccountModal user={activeModal.user} onClose={closeModal} />
        </AlertDialog>
      )}

      {/* Cancellation History Panel */}
      {historyPanel && (
        <CancellationHistoryPanel
          user={historyPanel.user}
          entries={historyPanel.entries}
          onClose={() => setHistoryPanel(null)}
        />
      )}
    </div>
  );
}
