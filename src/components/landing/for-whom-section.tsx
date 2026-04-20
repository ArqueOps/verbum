import { BookMarked, GraduationCap, Heart, Users } from "lucide-react";

const PERSONAS = [
  {
    icon: BookMarked,
    title: "Pastor ou líder preparando mensagem",
    body: "Profundidade teológica rápida, referências cruzadas e exegese pronta para o sermão de domingo.",
  },
  {
    icon: GraduationCap,
    title: "Seminarista ou estudante de teologia",
    body: "Análise sistemática nas línguas originais, hermenêutica e escatologia em cada estudo.",
  },
  {
    icon: Heart,
    title: "Leigo com curiosidade sincera",
    body: "Compreenda as Escrituras com profundidade sem precisar de formação teológica prévia.",
  },
  {
    icon: Users,
    title: "Grupo de estudo ou célula",
    body: "Material pronto para discussão, com perguntas de reflexão organizadas por seção.",
  },
];

export function ForWhomSection() {
  return (
    <section className="py-16 md:py-20">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
          Para quem é o Verbum
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-base text-muted-foreground">
          Quatro perfis que estudam as Escrituras com propósito e precisam de uma ferramenta à altura.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {PERSONAS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-6"
            >
              <Icon className="h-6 w-6 text-[#C8963E]" strokeWidth={1.5} />
              <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
