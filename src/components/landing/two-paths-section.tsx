import Link from "next/link";
import { ArrowRight, Search, ScrollText } from "lucide-react";

export function TwoPathsSection() {
  return (
    <section className="bg-primary/5 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
          Duas formas de descobrir
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted-foreground">
          Comece por uma passagem específica ou por uma pergunta temática.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link
            href="/generate"
            className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <ScrollText className="h-8 w-8 text-primary" strokeWidth={1.5} />
            <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
              Estudar uma passagem
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Escolha livro, capítulo e versículos. Receba as sete dimensões de análise em minutos.
            </p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[#C8963E] group-hover:underline">
              Gerar estudo
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </Link>

          <Link
            href="/perguntar"
            className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <Search className="h-8 w-8 text-primary" strokeWidth={1.5} />
            <h3 className="mt-4 font-display text-xl font-semibold text-foreground">
              O que a Bíblia diz sobre…?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Pergunte sobre um tema — ansiedade, perdão, casamento — e receba as passagens relevantes com exegese.
            </p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-[#C8963E] group-hover:underline">
              Perguntar
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
