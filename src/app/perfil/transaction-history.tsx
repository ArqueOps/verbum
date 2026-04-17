"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface TransactionEvent {
  id: string;
  event_type: string;
  amount: number;
  status: string;
  created_at: string;
}

interface TransactionHistoryProps {
  userId: string;
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  subscription_monthly: "Assinatura Mensal",
  subscription_annual: "Assinatura Anual",
  renewal: "Renovacao",
  cancellation: "Cancelamento",
};

const STATUS_STYLES: Record<string, string> = {
  completed:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const STATUS_LABELS: Record<string, string> = {
  completed: "Concluido",
  pending: "Pendente",
  failed: "Falhou",
};

const PAGE_SIZE = 10;

function formatCurrency(cents: number): string {
  const value = cents / 100;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function TransactionHistory({ userId }: TransactionHistoryProps) {
  const [events, setEvents] = useState<TransactionEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    let cancelled = false;
    async function fetchEvents() {
      setLoading(true);
      const supabase = createClient();
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count } = await supabase
        .from("subscription_events")
        .select("id, event_type, amount, status, created_at", {
          count: "exact",
        })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (!cancelled) {
        setEvents(data ?? []);
        setTotal(count ?? 0);
        setLoading(false);
      }
    }
    void fetchEvents();
    return () => { cancelled = true; };
  }, [userId, page]);

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-primary">
        Historico de Transacoes
      </h2>

      {loading ? (
        <div className="py-8 text-center text-sm text-foreground/50">
          Carregando...
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-foreground/10 bg-background px-4 py-8 text-center text-sm text-foreground/50">
          Nenhuma transacao encontrada.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-foreground/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-foreground/10 bg-foreground/[0.03]">
                  <th className="px-4 py-3 text-left font-medium text-foreground/70">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground/70">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-foreground/70">
                    Valor
                  </th>
                  <th className="px-4 py-3 text-center font-medium text-foreground/70">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-foreground/5 last:border-0"
                  >
                    <td className="px-4 py-3 text-foreground/80">
                      {formatDate(event.created_at)}
                    </td>
                    <td className="px-4 py-3 text-foreground/80">
                      {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground/80">
                      {formatCurrency(event.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[event.status] ??
                          "bg-foreground/10 text-foreground/60"
                        }`}
                      >
                        {STATUS_LABELS[event.status] ?? event.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-md border border-foreground/15 px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-xs text-foreground/50">
                Pagina {page + 1} de {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages - 1, p + 1))
                }
                disabled={page >= totalPages - 1}
                className="rounded-md border border-foreground/15 px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Proxima
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
