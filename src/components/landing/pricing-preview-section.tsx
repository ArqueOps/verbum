import Link from "next/link";

const PLANS = [
  {
    name: "Gratuito",
    price: "R$0",
    tagline: "Comece sem custo.",
    features: ["1 estudo por dia", "Histórico dos últimos 3 estudos", "Estudos sempre públicos"],
    cta: "Começar grátis",
    href: "/auth/signup",
    highlight: false,
  },
  {
    name: "Mensal",
    price: "R$19,90",
    per: "/mês",
    tagline: "Acesso completo, mês a mês.",
    features: ["Estudos ilimitados", "Histórico completo", "Escolher público ou privado"],
    cta: "Assinar",
    href: "/pricing",
    highlight: true,
  },
  {
    name: "Anual",
    price: "R$199",
    per: "/ano",
    tagline: "Dois meses grátis.",
    features: ["Tudo do Mensal", "Economia de R$39,80 no ano", "Suporte prioritário"],
    cta: "Assinar anual",
    href: "/pricing",
    highlight: false,
  },
];

export function PricingPreviewSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
          Planos
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted-foreground">
          Comece no gratuito. Assine quando quiser estudos ilimitados e o histórico completo.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                p.highlight
                  ? "rounded-lg border-2 border-[#C8963E] bg-card p-6 shadow-sm"
                  : "rounded-lg border border-border bg-card p-6"
              }
            >
              <h3 className="font-display text-xl font-semibold text-foreground">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-primary">{p.price}</span>
                {p.per && (
                  <span className="text-sm text-muted-foreground">{p.per}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
              <ul className="mt-4 space-y-1.5 text-sm text-foreground/80">
                {p.features.map((f) => (
                  <li key={f}>— {f}</li>
                ))}
              </ul>
              <Link
                href={p.href}
                className={
                  p.highlight
                    ? "mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[#C8963E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#B5862F]"
                    : "mt-6 inline-flex w-full items-center justify-center rounded-lg border border-primary/30 bg-background px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
                }
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/pricing" className="text-sm font-medium text-[#C8963E] hover:underline">
            Ver comparativo completo
          </Link>
        </div>
      </div>
    </section>
  );
}
