import Link from "next/link";

export function FinalCtaSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
          Comece agora, sem cartão.
        </h2>
        <p className="mt-4 text-base text-muted-foreground">
          Um estudo por dia no plano gratuito. Quando precisar de mais, você decide.
        </p>
        <Link
          href="/auth/signup"
          className="mt-8 inline-flex items-center justify-center rounded-lg bg-[#C8963E] px-8 py-3 text-base font-medium text-white transition-colors hover:bg-[#B5862F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8963E]/60 focus-visible:ring-offset-2"
        >
          Gerar meu primeiro estudo
        </Link>
      </div>
    </section>
  );
}
