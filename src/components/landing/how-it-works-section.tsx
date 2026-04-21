const STEPS = [
  {
    n: "1",
    title: "Escolha a passagem",
    body: "Selecione versão, livro, capítulo e versículos da passagem que deseja estudar.",
  },
  {
    n: "2",
    title: "A IA analisa",
    body: "Análise exegética nas línguas originais — hebraico para o Antigo Testamento, grego para o Novo.",
  },
  {
    n: "3",
    title: "Receba o estudo",
    body: "Sete dimensões hiper detalhadas, do panorama à escatologia, com referências cruzadas.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="bg-primary/5 py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
          Como funciona
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">
                {s.n}
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-foreground">
                {s.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
