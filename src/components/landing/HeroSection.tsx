import Link from "next/link";
import { Sparkles } from "lucide-react";

export function HeroSection() {
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center px-4 py-20 text-center lg:py-32">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl">
          Estude a Bíblia com{" "}
          <span className="text-primary">profundidade teológica</span> e
          inteligência artificial
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Verbum gera estudos bíblicos completos em 7 dimensões — do contexto
          histórico à aplicação prática — para pastores, seminaristas e todos que
          buscam ir além da leitura superficial.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Sparkles className="size-5" />
            Gerar Estudo Grátis
          </Link>

          <Link
            href="/blog"
            className="inline-flex h-12 items-center rounded-lg border border-border bg-background px-6 text-base font-medium text-foreground transition-colors hover:bg-muted"
          >
            Ver estudos publicados
          </Link>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          Sem cartão de crédito. Comece em segundos.
        </p>
      </div>
    </section>
  );
}
