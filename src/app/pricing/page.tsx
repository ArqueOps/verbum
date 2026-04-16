import type { Metadata } from "next";
import { PricingPlans } from "./pricing-plans";
import { FeatureComparison } from "./feature-comparison";

export const metadata: Metadata = {
  title: "Planos e Preços — Verbum",
  description:
    "Escolha o plano ideal para seus estudos bíblicos com IA. Comece grátis ou desbloqueie recursos avançados com créditos e assinatura mensal.",
  openGraph: {
    title: "Planos e Preços — Verbum",
    description:
      "Escolha o plano ideal para seus estudos bíblicos com IA. Comece grátis ou desbloqueie recursos avançados.",
    type: "website",
    url: "https://verbum.vercel.app/pricing",
  },
};

export default function PricingPage() {
  return (
    <div className="flex flex-col items-center">
      <section className="py-12 text-center lg:py-20">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Planos e Preços
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Escolha o plano que melhor se adapta à sua jornada de estudo bíblico.
          Comece grátis e evolua quando quiser.
        </p>
      </section>

      <section className="w-full">
        <PricingPlans />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Cancele a qualquer momento. Sem compromisso de longo prazo.
        </p>
      </section>

      <FeatureComparison />
    </div>
  );
}
