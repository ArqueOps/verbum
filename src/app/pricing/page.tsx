import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Planos e Preços — Verbum",
  description:
    "Escolha o plano ideal para aprofundar seus estudos bíblicos com o Verbum.",
};

const plans = [
  {
    name: "Gratuito",
    price: "R$0",
    period: "/mês",
    description: "Para começar sua jornada de estudos bíblicos.",
    features: [
      "Até 3 estudos por mês",
      "Acesso à Bíblia completa",
      "Anotações básicas",
    ],
    cta: "Começar Grátis",
    ctaHref: "/register",
    highlighted: false,
  },
  {
    name: "Estudante",
    price: "R$9,90",
    period: "/mês",
    description: "Para quem busca aprofundamento constante.",
    features: [
      "Estudos ilimitados",
      "Comentários bíblicos",
      "Exportar anotações",
      "Suporte por e-mail",
    ],
    cta: "Assinar Estudante",
    ctaHref: "/register?plan=estudante",
    highlighted: false,
  },
  {
    name: "Teólogo",
    price: "R$39,90",
    period: "/mês",
    description: "Para estudiosos e líderes que precisam de tudo.",
    features: [
      "Tudo do Estudante",
      "IA avançada para estudos",
      "Biblioteca de referências",
      "Suporte prioritário",
      "Acesso antecipado a novidades",
    ],
    cta: "Assinar Teólogo",
    ctaHref: "/register?plan=teologo",
    highlighted: false,
  },
  {
    name: "Comunidade",
    price: "R$19,90",
    period: "/mês",
    description: "Para grupos de estudo e igrejas.",
    features: [
      "Até 10 membros",
      "Estudos compartilhados",
      "Painel do líder",
      "Relatórios de progresso",
    ],
    cta: "Assinar Comunidade",
    ctaHref: "/register?plan=comunidade",
    highlighted: true,
  },
];

export default function PricingPage() {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          Planos e Preços
        </h1>
        <p className="mt-4 text-lg text-foreground/70">
          Escolha o plano ideal para sua jornada de estudos bíblicos.
        </p>
      </div>

      <section
        aria-label="Planos disponíveis"
        className="mt-12 grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {plans.map((plan) => (
          <article
            key={plan.name}
            data-highlighted={plan.highlighted || undefined}
            className={`flex flex-col rounded-2xl border p-6 ${
              plan.highlighted
                ? "border-primary bg-primary/5 ring-2 ring-primary"
                : "border-border"
            }`}
          >
            {plan.highlighted && (
              <span className="mb-2 inline-block w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                Recomendado
              </span>
            )}
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-sm text-foreground/60">
              {plan.description}
            </p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-sm text-foreground/60">{plan.period}</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm">
                  <span className="text-primary">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href={plan.ctaHref}
              className={`mt-6 block rounded-lg px-4 py-2 text-center text-sm font-medium ${
                plan.highlighted
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {plan.cta}
            </Link>
          </article>
        ))}
      </section>

      <section
        aria-label="Comparação de funcionalidades"
        className="mt-16 w-full max-w-4xl"
      >
        <h2 className="mb-8 text-center text-2xl font-bold">
          Compare os planos
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-4 py-3 font-medium">Funcionalidade</th>
                {plans.map((plan) => (
                  <th key={plan.name} className="px-4 py-3 font-medium">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="px-4 py-3">Estudos por mês</td>
                <td className="px-4 py-3">3</td>
                <td className="px-4 py-3">Ilimitados</td>
                <td className="px-4 py-3">Ilimitados</td>
                <td className="px-4 py-3">Ilimitados</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">Bíblia completa</td>
                <td className="px-4 py-3">✓</td>
                <td className="px-4 py-3">✓</td>
                <td className="px-4 py-3">✓</td>
                <td className="px-4 py-3">✓</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">IA avançada</td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3">✓</td>
                <td className="px-4 py-3">—</td>
              </tr>
              <tr className="border-b">
                <td className="px-4 py-3">Membros do grupo</td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3">—</td>
                <td className="px-4 py-3">Até 10</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
