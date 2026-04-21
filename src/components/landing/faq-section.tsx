"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "Preciso ter formação teológica para usar o Verbum?",
    a: "Não. O Verbum entrega profundidade com clareza pedagógica. Você recebe a análise das línguas originais traduzida para uma leitura compreensível, mantendo o rigor técnico.",
  },
  {
    q: "Como é o plano gratuito?",
    a: "Você pode gerar 1 estudo por dia, com acesso ao seu histórico dos 3 últimos estudos. Estudos gerados no plano gratuito são sempre públicos no blog.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. A assinatura mensal ou anual pode ser cancelada quando quiser, sem fidelidade. O acesso continua ativo até o fim do período já pago.",
  },
  {
    q: "O Verbum substitui o estudo pessoal das Escrituras?",
    a: "Não. É uma ferramenta complementar que acelera a pesquisa e aprofunda o estudo. A leitura pessoal e a orientação pastoral continuam insubstituíveis.",
  },
  {
    q: "Como a IA trata o texto bíblico?",
    a: "Analisa exclusivamente o próprio texto, com referência às línguas originais (hebraico no Antigo Testamento, grego no Novo). Sem viés político, ideológico ou denominacional.",
  },
  {
    q: "Quais versões da Bíblia estão disponíveis?",
    a: "Versões em português — NVI, ARA, ACF e outras catalogadas. Você escolhe a versão no momento de gerar o estudo.",
  },
  {
    q: "Posso ocultar meus estudos do blog público?",
    a: "Assinantes podem escolher se cada estudo é público ou privado. No plano gratuito, estudos são sempre públicos.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="bg-primary/5 py-16 md:py-20">
      <div className="mx-auto max-w-3xl px-4">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
          Perguntas frequentes
        </h2>
        <ul className="mt-10 divide-y divide-border rounded-lg border border-border bg-card">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-medium text-foreground">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    strokeWidth={1.75}
                  />
                </button>
                {isOpen && (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
