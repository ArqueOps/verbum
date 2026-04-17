"use client";

import Link from "next/link";

interface SubscriptionData {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}

interface SubscriptionSectionProps {
  subscription: SubscriptionData;
}

const PLAN_LABELS: Record<string, { name: string; price: string }> = {
  monthly: { name: "Mensal", price: "R$ 19,90/mes" },
  annual: { name: "Anual", price: "R$ 199,00/ano" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function SubscriptionSection({ subscription }: SubscriptionSectionProps) {
  const plan = PLAN_LABELS[subscription.plan_id] ?? {
    name: subscription.plan_id,
    price: "",
  };

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-semibold text-primary">
        Assinatura
      </h2>

      <div className="rounded-lg border border-foreground/10 bg-background p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-foreground/70">
            Plano atual
          </span>
          <span className="text-sm font-semibold text-foreground">
            {plan.name} — {plan.price}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-foreground/70">
            Data de inicio
          </span>
          <span className="text-sm text-foreground">
            {formatDate(subscription.current_period_start)}
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-foreground/70">
            Proxima renovacao
          </span>
          <span className="text-sm text-foreground">
            {formatDate(subscription.current_period_end)}
          </span>
        </div>

        <div className="pt-2">
          <Link
            href="/perfil/cancelar"
            className="text-xs text-foreground/40 underline underline-offset-2 transition-colors hover:text-foreground/60"
          >
            Cancelar minha assinatura
          </Link>
        </div>
      </div>
    </section>
  );
}
