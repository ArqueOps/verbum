import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-28">
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <Image
          src="/logo.png"
          alt="Verbum"
          width={480}
          height={480}
          priority
          className="h-32 w-auto md:h-40 dark:invert-[0.85]"
        />
        <h1 className="mt-8 font-display text-4xl font-semibold leading-tight tracking-tight text-primary md:text-5xl lg:text-6xl">
          Profundidade que ilumina.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
          A sabedoria dos seminários ao alcance do seu estudo. Exegese nas línguas originais, hermenêutica e contexto — para cada passagem que você escolher.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="inline-flex min-w-[220px] items-center justify-center rounded-lg bg-[#C8963E] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#B5862F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8963E]/60 focus-visible:ring-offset-2"
          >
            Gerar meu primeiro estudo
          </Link>
          <Link
            href="/blog"
            className="inline-flex min-w-[220px] items-center justify-center rounded-lg border border-primary/30 bg-background px-6 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2"
          >
            Explorar estudos públicos
          </Link>
        </div>
      </div>
    </section>
  );
}
