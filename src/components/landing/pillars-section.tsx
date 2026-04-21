const PILLARS = [
  {
    title: "Profundidade acessível",
    body: "Análise nas línguas originais traduzida em estudos que qualquer pessoa pode compreender — sem simplificar o conteúdo.",
  },
  {
    title: "Conhecimento compartilhado",
    body: "Cada estudo publicado se torna conteúdo público, acessível a todos. Seu aprofundamento vira acervo coletivo.",
  },
  {
    title: "Rigor com empatia",
    body: "Profundidade que convida, nunca intimida. Rigor teológico com clareza pedagógica.",
  },
];

export function PillarsSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
          Três princípios que guiam o Verbum
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="text-center">
              <h3 className="font-display text-xl font-semibold text-foreground">
                {p.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
