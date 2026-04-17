import {
  ScrollText,
  Languages,
  BookOpen,
  GitBranch,
  MessageSquareQuote,
  Target,
  Heart,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StudyDimension {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const dimensions: StudyDimension[] = [
  {
    icon: <ScrollText className="size-6 text-primary" />,
    title: "Contexto Histórico",
    description:
      "Entenda o cenário cultural, político e literário por trás de cada passagem bíblica.",
  },
  {
    icon: <Languages className="size-6 text-primary" />,
    title: "Estudo de Palavras",
    description:
      "Explore palavras-chave em hebraico e grego com seus significados e nuances originais.",
  },
  {
    icon: <BookOpen className="size-6 text-primary" />,
    title: "Teologia",
    description:
      "Descubra temas teológicos e insights doutrinários que fundamentam a passagem.",
  },
  {
    icon: <GitBranch className="size-6 text-primary" />,
    title: "Referências Cruzadas",
    description:
      "Conecte passagens relacionadas em toda a Bíblia para uma compreensão mais ampla.",
  },
  {
    icon: <MessageSquareQuote className="size-6 text-primary" />,
    title: "Comentários",
    description:
      "Acesse perspectivas de teólogos e interpretações da tradição cristã.",
  },
  {
    icon: <Target className="size-6 text-primary" />,
    title: "Aplicação Prática",
    description:
      "Transforme o estudo em ações concretas para o dia a dia e o ministério.",
  },
  {
    icon: <Heart className="size-6 text-primary" />,
    title: "Reflexão Devocional",
    description:
      "Perguntas e meditações que convidam a uma resposta pessoal ao texto sagrado.",
  },
];

export function FeaturesSection() {
  return (
    <section className="py-20 lg:py-32">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          7 dimensões de estudo em cada passagem
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          Cada estudo gerado pelo Verbum abrange sete perspectivas complementares
          para que você alcance uma compreensão completa do texto bíblico.
        </p>
      </div>

      <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {dimensions.map((dimension) => (
          <Card key={dimension.title} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10">
                {dimension.icon}
              </div>
              <CardTitle className="font-display text-lg font-semibold">
                {dimension.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {dimension.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
