import type { Metadata } from "next";
import { PricingCard } from "@/components/pricing-card";
import { FeatureComparison } from "./feature-comparison";

export const metadata: Metadata = {
  title: "Planos e Preços — Verbum",
  description:
    "Escolha o plano ideal para seus estudos bíblicos com IA. Comece grátis ou desbloqueie recursos avançados com créditos e assinatura mensal.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Planos e Preços — Verbum",
    description:
      "Escolha o plano ideal para seus estudos bíblicos com IA. Comece grátis ou desbloqueie recursos avançados.",
    type: "website",
    url: "https://verbum.vercel.app/pricing",
  },
};

const plans = [
  {
    planName: "Gratuito",
    price: "R$0",
    description: "Comece a explorar estudos bíblicos com IA sem custo.",
    features: [
      "3 créditos de geração",
      "Salvar estudos gerados",
      "Acesso ao blog público",
    ],
    ctaText: "Começar Grátis",
    ctaHref: "/register",
  },
  {
    planName: "10 Créditos",
    price: "R$9,90",
    description: "Ideal para quem quer aprofundar seus estudos.",
    features: [
      "10 créditos de geração",
      "Salvar estudos gerados",
      "Publicar estudos no blog",
      "Exportação em PDF",
    ],
    ctaText: "Comprar",
    ctaHref: "#checkout-10",
  },
  {
    planName: "50 Créditos",
    price: "R$39,90",
    description: "Para estudantes dedicados que buscam volume.",
    features: [
      "50 créditos de geração",
      "Salvar estudos gerados",
      "Publicar estudos no blog",
      "Exportação em PDF",
    ],
    ctaText: "Comprar",
    ctaHref: "#checkout-50",
  },
  {
    planName: "Assinatura Mensal",
    price: "R$19,90",
    priceLabel: "/mês",
    description: "Acesso completo e ilimitado à plataforma.",
    features: [
      "Créditos ilimitados",
      "Salvar estudos gerados",
      "Publicar estudos no blog",
      "Exportação em PDF",
      "Suporte prioritário",
    ],
    ctaText: "Assinar",
    ctaHref: "#checkout-monthly",
    isHighlighted: true,
  },
] as const;

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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PricingCard
              key={plan.planName}
              planName={plan.planName}
              price={plan.price}
              priceLabel={"priceLabel" in plan ? plan.priceLabel : undefined}
              description={plan.description}
              features={[...plan.features]}
              ctaText={plan.ctaText}
              ctaHref={plan.ctaHref}
              isHighlighted={
                "isHighlighted" in plan ? plan.isHighlighted : false
              }
            />
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Cancele a qualquer momento. Sem compromisso de longo prazo.
        </p>
      </section>

      <FeatureComparison />
    </div>
  );
}
