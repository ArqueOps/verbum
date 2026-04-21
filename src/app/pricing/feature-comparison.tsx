import { Check, X } from "lucide-react";

interface FeatureRow {
  feature: string;
  gratuito: boolean;
  mensal: boolean;
  anual: boolean;
}

const features: FeatureRow[] = [
  {
    feature: "Geração de estudos com IA",
    gratuito: true,
    mensal: true,
    anual: true,
  },
  {
    feature: "Acesso ao blog público",
    gratuito: true,
    mensal: true,
    anual: true,
  },
  {
    feature: '"O que a Bíblia diz sobre...?"',
    gratuito: true,
    mensal: true,
    anual: true,
  },
  {
    feature: "Estudos ilimitados (sem limite diário)",
    gratuito: false,
    mensal: true,
    anual: true,
  },
  {
    feature: "Histórico completo de estudos",
    gratuito: false,
    mensal: true,
    anual: true,
  },
  {
    feature: "Escolher se cada estudo é público ou privado",
    gratuito: false,
    mensal: true,
    anual: true,
  },
  {
    feature: "Suporte prioritário",
    gratuito: false,
    mensal: true,
    anual: true,
  },
];

const planNames = ["Gratuito", "Mensal", "Anual"];

function FeatureIcon({ included }: { included: boolean }) {
  return included ? (
    <Check className="mx-auto size-5 text-primary" aria-label="Incluído" />
  ) : (
    <X
      className="mx-auto size-5 text-muted-foreground/40"
      aria-label="Não incluído"
    />
  );
}

export function FeatureComparison() {
  return (
    <section className="py-16 lg:py-24">
      <h2 className="mb-2 text-center font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        Compare os planos
      </h2>
      <p className="mx-auto mb-10 max-w-2xl text-center text-lg text-muted-foreground">
        Veja em detalhes o que cada plano oferece
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="py-3 pr-4 text-left font-medium text-muted-foreground">
                Funcionalidade
              </th>
              {planNames.map((name) => (
                <th
                  key={name}
                  className="px-4 py-3 text-center font-medium text-foreground"
                >
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((row) => (
              <tr key={row.feature} className="border-b border-border/50">
                <td className="py-3 pr-4 text-muted-foreground">
                  {row.feature}
                </td>
                <td className="px-4 py-3">
                  <FeatureIcon included={row.gratuito} />
                </td>
                <td className="px-4 py-3">
                  <FeatureIcon included={row.mensal} />
                </td>
                <td className="px-4 py-3">
                  <FeatureIcon included={row.anual} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
