export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 sm:px-8">
      <div className="flex flex-col items-center gap-8 text-center max-w-xl">
        {/* Logo placeholder */}
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-500">
          <span className="font-display text-4xl font-bold text-white">V</span>
        </div>

        {/* Tagline */}
        <h1 className="font-display text-4xl font-bold tracking-tight text-primary-500 sm:text-5xl">
          Profundidade que ilumina
        </h1>

        <p className="text-lg leading-relaxed text-neutral-600">
          Estudo bíblico aprofundado com línguas originais, contexto histórico e
          teologia sistemática. Descubra o significado por trás de cada
          passagem.
        </p>

        {/* CTA */}
        <a
          href="#"
          className="inline-flex items-center justify-center rounded-lg bg-primary-500 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-primary-600 active:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          Comece seu estudo
        </a>
      </div>
    </main>
  );
}
