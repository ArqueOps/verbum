import { Compass, Landmark, Layers, BookText, Flame, Eye, CheckCircle2 } from "lucide-react";

const DIMENSIONS = [
  {
    icon: Compass,
    title: "Panorama",
    body: "Visão geral da passagem — tema central e lugar dentro do livro bíblico.",
  },
  {
    icon: Landmark,
    title: "Contexto",
    body: "Autor, destinatários, local, situação histórica e data.",
  },
  {
    icon: Layers,
    title: "Estrutura Contextual",
    body: "Seções internas da passagem com exegese versículo a versículo, palavras-chave em hebraico ou grego.",
  },
  {
    icon: BookText,
    title: "Síntese Exegética",
    body: "Como as análises convergem para o sentido do texto como um todo.",
  },
  {
    icon: Eye,
    title: "Análise Hermenêutica",
    body: "Princípios interpretativos, gênero literário e conexão com o cânon bíblico.",
  },
  {
    icon: Flame,
    title: "Análise Escatológica",
    body: "Implicações escatológicas, tipologia e cumprimento profético.",
  },
  {
    icon: CheckCircle2,
    title: "Conclusão",
    body: "Leitura integrada final que amarra panorama, exegese, hermenêutica e escatologia.",
  },
];

export function SevenDimensionsSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-[#C8963E]">
            O coração do Verbum
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
            As sete dimensões do seu estudo
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            Cada passagem é analisada em sete camadas, do panorama à conclusão. Sem atalho, sem raso, sem viés.
          </p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIMENSIONS.map(({ icon: Icon, title, body }) => (
            <article
              key={title}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/30"
            >
              <Icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
              <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
