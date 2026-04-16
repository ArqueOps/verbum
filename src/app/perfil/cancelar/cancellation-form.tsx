"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface SubscriptionData {
  planId: string;
  status: string;
  currentPeriodEnd: string;
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
  "Falta de recursos que preciso",
  "Outro motivo",
] as const;

const BENEFITS = [
  "Acesso ilimitado aos estudos bíblicos",
  "Geração ilimitada de novos estudos",
  "Salvamento de progresso e anotações",
  "Acesso a conteúdo exclusivo",
  "Suporte prioritário",
];

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatPlanName(planId: string): string {
  const names: Record<string, string> = {
    monthly: "Mensal",
    yearly: "Anual",
    annual: "Anual",
  };
  return names[planId.toLowerCase()] ?? planId;
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 w-2 rounded-full transition-colors ${
            i + 1 <= current ? "bg-primary" : "bg-foreground/20"
          }`}
        />
      ))}
    </div>
  );
}

export function CancellationForm({
  subscription,
}: {
  subscription: SubscriptionData;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCancel() {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason,
          feedback: feedback.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? "Erro ao cancelar assinatura");
      }

      toast.success("Assinatura cancelada com sucesso.");
      router.push("/perfil");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao cancelar assinatura.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <StepIndicator current={step} total={4} />

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Dados da sua assinatura</CardTitle>
            <CardDescription>
              Confira os detalhes do seu plano atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-foreground/10 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Plano</span>
                <span className="font-medium">
                  {formatPlanName(subscription.planId)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Status</span>
                <span className="font-medium capitalize">
                  {subscription.status === "active" ? "Ativo" : "Cancelado"}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-foreground/60">Válido até</span>
                <span className="font-medium">
                  {formatDate(subscription.currentPeriodEnd)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground/80">
                Ao cancelar, você perderá acesso a:
              </p>
              <ul className="space-y-1.5">
                {BENEFITS.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-start gap-2 text-sm text-foreground/60"
                  >
                    <span className="mt-0.5 text-destructive">✕</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <CardFooter className="justify-end gap-3">
            <Button variant="outline" onClick={() => router.push("/perfil")}>
              Voltar ao perfil
            </Button>
            <Button onClick={() => setStep(2)}>Continuar</Button>
          </CardFooter>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Motivo do cancelamento</CardTitle>
            <CardDescription>
              Nos ajude a melhorar. Por que deseja cancelar?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              htmlFor="cancellation-reason"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Selecione o motivo
            </label>
            <select
              id="cancellation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="block w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="" disabled>
                Escolha um motivo...
              </option>
              {CANCELLATION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(1)}>
              Voltar
            </Button>
            <Button onClick={() => setStep(3)} disabled={!reason}>
              Continuar
            </Button>
          </CardFooter>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Feedback adicional</CardTitle>
            <CardDescription>
              Sua opinião é importante para nós.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <label
              htmlFor="cancellation-feedback"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Conte-nos mais sobre sua experiência (opcional)
            </label>
            <textarea
              id="cancellation-feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Compartilhe sugestões ou detalhes que possam nos ajudar..."
              className="block w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </CardContent>
          <CardFooter className="justify-between gap-3">
            <Button variant="outline" onClick={() => setStep(2)}>
              Voltar
            </Button>
            <Button onClick={() => setStep(4)}>Continuar</Button>
          </CardFooter>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Confirmação</CardTitle>
            <CardDescription>
              Tem certeza de que deseja cancelar sua assinatura?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-foreground/10 bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/60">Motivo</span>
                <span className="font-medium text-right max-w-[60%]">
                  {reason}
                </span>
              </div>
              {feedback.trim() && (
                <div className="pt-2 border-t border-foreground/10">
                  <span className="text-foreground/60 block mb-1">
                    Feedback
                  </span>
                  <p className="text-foreground/80">{feedback}</p>
                </div>
              )}
            </div>
            <p className="text-sm text-foreground/60">
              Seu acesso permanecerá ativo até{" "}
              <strong>{formatDate(subscription.currentPeriodEnd)}</strong>. Após
              essa data, os benefícios da assinatura serão desativados.
            </p>
          </CardContent>
          <CardFooter className="justify-center gap-3">
            <Button
              variant="outline"
              size="lg"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Cancelando..." : "Quero cancelar"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/perfil")}
              disabled={isSubmitting}
              className="flex-1"
            >
              Mudei de ideia
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
