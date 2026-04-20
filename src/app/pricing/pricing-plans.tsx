"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PricingCard } from "@/components/pricing-card";
import { createBrowserClient } from "@/lib/supabase/browser";

type CheckoutPlan = "monthly" | "annual";

interface UserState {
  isAuthenticated: boolean;
  hasActiveSubscription: boolean;
}

const PLAN_FEATURES_BASE = [
  "Estudos ilimitados (sem limite diário)",
  "Histórico completo de estudos",
  "Escolher se cada estudo é público ou privado",
  "Publicar estudos no blog",
  "Suporte prioritário",
];

export function PricingPlans() {
  const router = useRouter();
  const [userState, setUserState] = useState<UserState>({
    isAuthenticated: false,
    hasActiveSubscription: false,
  });
  const [loadingPlan, setLoadingPlan] = useState<CheckoutPlan | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    async function loadUserState() {
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserState({ isAuthenticated: false, hasActiveSubscription: false });
        setIsHydrated(true);
        return;
      }

      const { data: userCredits } = await supabase
        .from("user_credits")
        .select("has_active_subscription")
        .eq("user_id", user.id)
        .single();

      setUserState({
        isAuthenticated: true,
        hasActiveSubscription: userCredits?.has_active_subscription ?? false,
      });
      setIsHydrated(true);
    }

    loadUserState();
  }, []);

  const handleCheckout = useCallback(
    async (plan: CheckoutPlan) => {
      if (!userState.isAuthenticated) {
        router.push("/login?redirect=/pricing");
        return;
      }

      if (userState.hasActiveSubscription) {
        return;
      }

      setLoadingPlan(plan);

      try {
        const response = await fetch("/api/checkout/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });

        const data: { checkoutUrl?: string; error?: string } =
          await response.json();

        if (!response.ok || !data.checkoutUrl) {
          toast.error(data.error ?? "Erro ao iniciar o pagamento. Tente novamente.");
          return;
        }

        window.location.href = data.checkoutUrl;
      } catch {
        toast.error("Erro de conexão. Verifique sua internet e tente novamente.");
      } finally {
        setLoadingPlan(null);
      }
    },
    [userState, router],
  );

  const subscriptionActive = isHydrated && userState.hasActiveSubscription;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {/* Gratuito */}
      <PricingCard
        planName="Gratuito"
        price="R$0"
        description="Comece a explorar estudos bíblicos com IA sem custo."
        features={[
          "1 estudo por dia",
          "Histórico dos últimos 3 estudos",
          "Estudos sempre públicos no blog",
          "Acesso ao blog público",
        ]}
        ctaText="Começar Grátis"
        ctaHref="/auth/signup"
      />

      {/* Assinatura Mensal */}
      <PricingCard
        planName="Assinatura Mensal"
        price="R$19,90"
        priceLabel="/mês"
        description="Acesso completo e ilimitado à plataforma."
        features={PLAN_FEATURES_BASE}
        ctaText={subscriptionActive ? "Plano ativo" : "Assinar"}
        onCtaClick={() => handleCheckout("monthly")}
        isHighlighted
        isDisabled={subscriptionActive}
        isLoading={loadingPlan === "monthly"}
      />

      {/* Assinatura Anual */}
      <PricingCard
        planName="Assinatura Anual"
        price="R$199,00"
        priceLabel="/ano"
        description="2 meses grátis — paga 10, leva 12."
        features={[...PLAN_FEATURES_BASE, "Economia de R$39,80 por ano"]}
        ctaText={subscriptionActive ? "Plano ativo" : "Assinar Anual"}
        onCtaClick={() => handleCheckout("annual")}
        isDisabled={subscriptionActive}
        isLoading={loadingPlan === "annual"}
      />
    </div>
  );
}
