"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Subscription {
  id: string;
  plan_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}

const CANCELLATION_REASONS = [
  "Preço alto demais",
  "Não uso com frequência suficiente",
  "Problemas técnicos recorrentes",
  "Encontrei uma alternativa melhor",
  "Conteúdo insuficiente para minha necessidade",
  "Dificuldade de uso da plataforma",
  "Mudança na situação financeira",
  "Não atendeu minhas expectativas",
  "Vou pausar temporariamente",
  "Outro motivo",
] as const;

const BENEFITS = [
  "Estudos ilimitados (sem limite diário)",
  "Histórico completo de estudos",
  "Escolher se cada estudo é público ou privado",
  "Suporte prioritário",
] as const;

function getPlanLabel(planId: string) {
  if (planId.includes("annual") || planId.includes("anual")) {
    return { name: "Anual", price: "R$ 199,00/ano" };
  }
  return { name: "Mensal", price: "R$ 19,90/mês" };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <span className="text-sm text-foreground/60">
        Passo {current} de {total}
      </span>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i + 1 <= current ? "bg-primary" : "bg-foreground/20"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function CancellationFlow({
  subscription,
}: {
  subscription: Subscription;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const plan = getPlanLabel(subscription.plan_id);

  async function handleCancel() {
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          feedback: feedback.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          data?.error ?? "Erro ao cancelar assinatura. Tente novamente."
        );
      }

      setSuccess(true);
      setTimeout(() => router.push("/perfil"), 3000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erro ao cancelar assinatura. Tente novamente."
      );
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-lg rounded-lg border border-foreground/10 bg-background p-8 shadow-sm">
        <div className="text-center space-y-4">
          <h2 className="font-display text-2xl font-semibold text-primary">
            Assinatura cancelada
          </h2>
          <p className="text-sm text-foreground/60">
            Sua assinatura foi cancelada. Você será redirecionado em instantes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          Cancelar Assinatura
        </h1>
        <StepIndicator current={step} total={4} />
      </div>

      <div className="rounded-lg border border-foreground/10 bg-background p-6 shadow-sm space-y-6">
        {step === 1 && (
          <StepPlanDetails
            plan={plan}
            subscription={subscription}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepReason
            reason={reason}
            onChange={setReason}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <StepFeedback
            feedback={feedback}
            onChange={setFeedback}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <StepConfirmation
            reason={reason}
            feedback={feedback}
            isSubmitting={isSubmitting}
            error={error}
            onConfirm={handleCancel}
            onBack={() => router.push("/perfil")}
          />
        )}
      </div>
    </div>
  );
}

function StepPlanDetails({
  plan,
  subscription,
  onNext,
}: {
  plan: { name: string; price: string };
  subscription: Subscription;
  onNext: () => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dados atuais</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Confira os detalhes do seu plano atual.
        </p>
      </div>

      <div className="space-y-3 rounded-md border border-foreground/10 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Plano</span>
          <span className="font-medium text-foreground">
            {plan.name} — {plan.price}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Início</span>
          <span className="text-foreground">
            {formatDate(subscription.current_period_start)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground/60">Próxima renovação</span>
          <span className="text-foreground">
            {formatDate(subscription.current_period_end)}
          </span>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">
          Benefícios que você perderá:
        </p>
        <ul className="space-y-1.5">
          {BENEFITS.map((benefit) => (
            <li
              key={benefit}
              className="flex items-center gap-2 text-sm text-foreground/70"
            >
              <span className="text-red-500">&#10005;</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={onNext}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
      >
        Continuar
      </button>
    </>
  );
}

function StepReason({
  reason,
  onChange,
  onNext,
  onBack,
}: {
  reason: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Motivo do cancelamento
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          Selecione o principal motivo para o cancelamento.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="reason"
          className="block text-sm font-medium text-foreground"
        >
          Motivo
        </label>
        <select
          id="reason"
          value={reason}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Selecione um motivo...</option>
          {CANCELLATION_REASONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onNext}
          disabled={!reason}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors"
        >
          Voltar
        </button>
      </div>
    </>
  );
}

function StepFeedback({
  feedback,
  onChange,
  onNext,
  onBack,
}: {
  feedback: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Feedback (opcional)
        </h2>
        <p className="mt-1 text-sm text-foreground/60">
          Conte-nos mais sobre sua experiência.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="feedback"
          className="block text-sm font-medium text-foreground"
        >
          Conte-nos mais sobre sua experiência (opcional)
        </label>
        <textarea
          id="feedback"
          value={feedback}
          onChange={(e) => onChange(e.target.value)}
          maxLength={5000}
          rows={5}
          placeholder="Escreva aqui..."
          className="block w-full resize-none rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="text-right text-xs text-foreground/40">
          {feedback.length}/5000
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
        >
          Continuar
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-foreground/60 hover:text-foreground transition-colors"
        >
          Voltar
        </button>
      </div>
    </>
  );
}

function StepConfirmation({
  reason,
  feedback,
  isSubmitting,
  error,
  onConfirm,
  onBack,
}: {
  reason: string;
  feedback: string;
  isSubmitting: boolean;
  error: string;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Confirmação</h2>
        <p className="mt-1 text-sm text-foreground/60">
          Revise os dados antes de confirmar o cancelamento.
        </p>
      </div>

      <div className="space-y-3 rounded-md border border-foreground/10 p-4">
        <div className="text-sm">
          <span className="text-foreground/60">Motivo: </span>
          <span className="text-foreground">{reason}</span>
        </div>
        {feedback.trim() && (
          <div className="text-sm">
            <span className="text-foreground/60">Feedback: </span>
            <span className="text-foreground">{feedback}</span>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </div>
      )}

      {/* Dois botões IGUAIS (pedido no features-completo.md) */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onConfirm}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-foreground/20 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Cancelando…" : "Quero cancelar"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-foreground/20 bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Mudei de ideia
        </button>
      </div>
    </>
  );
}
