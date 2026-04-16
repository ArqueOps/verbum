import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getAdminMetrics,
  getStudiesPerDay,
  getSubscribersPerDay,
  getCancellationReasons,
  getTopUsersByStudies,
} from "@/lib/admin-metrics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudiesPerDayChart } from "./components/studies-per-day-chart";
import { SubscribersPerDayChart } from "./components/subscribers-per-day-chart";
import { CancellationReasonsChart } from "./components/cancellation-reasons-chart";

export const metadata = {
  title: "Painel Administrativo — Verbum",
  description: "Dashboard administrativo do Verbum.",
};

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

function MetricCard({ title, value, subtitle }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  const [metrics, studiesPerDay, subscribersPerDay, cancellationReasons, topUsers] =
    await Promise.all([
      getAdminMetrics(),
      getStudiesPerDay(),
      getSubscribersPerDay(),
      getCancellationReasons(),
      getTopUsersByStudies(),
    ]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-primary">
        Painel Administrativo
      </h1>

      {/* Metric Cards */}
      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total de Usuários"
            value={metrics.totalUsers}
            subtitle={`Gratuitos: ${metrics.freeUsers} · Mensal: ${metrics.monthlySubscribers} · Anual: ${metrics.annualSubscribers}`}
          />
          <MetricCard
            title="MRR (Receita Mensal Recorrente)"
            value={formatCurrency(metrics.mrr)}
          />
          <MetricCard
            title="ARR (Receita Anual Recorrente)"
            value={formatCurrency(metrics.arr)}
          />
          <MetricCard
            title="Assinantes Ativos"
            value={metrics.activeSubscribersMonthly + metrics.activeSubscribersAnnual}
            subtitle={`Mensal: ${metrics.activeSubscribersMonthly} · Anual: ${metrics.activeSubscribersAnnual}`}
          />
          <MetricCard
            title="Taxa de Cancelamento"
            value={`${metrics.churnRate}%`}
          />
          <MetricCard
            title="Estudos Hoje"
            value={metrics.studiesToday}
          />
          <MetricCard
            title="Estudos na Semana"
            value={metrics.studiesThisWeek}
          />
          <MetricCard
            title="Estudos no Mês"
            value={metrics.studiesThisMonth}
          />
          <MetricCard
            title="Estudos Publicados"
            value={metrics.publishedStudies}
          />
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Gerações por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <StudiesPerDayChart data={studiesPerDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assinantes Ativos por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <SubscribersPerDayChart data={subscribersPerDay} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Motivos de Cancelamento</CardTitle>
          </CardHeader>
          <CardContent>
            <CancellationReasonsChart data={cancellationReasons} />
          </CardContent>
        </Card>
      </section>

      {/* Top Users Table */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Usuários por Volume de Estudos</CardTitle>
          </CardHeader>
          <CardContent>
            {topUsers.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                Nenhum estudo gerado nos últimos 30 dias
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">#</th>
                      <th className="pb-3 pr-4 font-medium">Usuário</th>
                      <th className="pb-3 text-right font-medium">
                        Estudos (30 dias)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((user, idx) => (
                      <tr key={user.userId} className="border-b last:border-0">
                        <td className="py-3 pr-4 text-muted-foreground">
                          {idx + 1}
                        </td>
                        <td className="py-3 pr-4 font-medium">
                          {user.displayName}
                        </td>
                        <td className="py-3 text-right tabular-nums">
                          {user.studyCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Cancellations Table */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Cancelamentos — Principais Motivos</CardTitle>
          </CardHeader>
          <CardContent>
            {cancellationReasons.every((r) => r.count === 0) ? (
              <p className="py-4 text-center text-muted-foreground">
                Nenhum cancelamento registrado nos últimos 30 dias
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">#</th>
                      <th className="pb-3 pr-4 font-medium">Motivo</th>
                      <th className="pb-3 text-right font-medium">
                        Quantidade
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cancellationReasons
                      .filter((r) => r.count > 0)
                      .slice(0, 10)
                      .map((reason, idx) => (
                        <tr
                          key={reason.reason}
                          className="border-b last:border-0"
                        >
                          <td className="py-3 pr-4 text-muted-foreground">
                            {idx + 1}
                          </td>
                          <td className="py-3 pr-4">{reason.reason}</td>
                          <td className="py-3 text-right tabular-nums">
                            {reason.count}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
