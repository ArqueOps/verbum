import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";
import { MetricCard, MetricGroup, TopList } from "./metric-components";

export const metadata = {
  title: "Admin — Verbum",
  description: "Painel administrativo do Verbum.",
};

interface Metrics {
  users: {
    total: number;
    active_30d: number;
    dau: number;
    mau: number;
    paying: number;
    free: number;
  };
  subscriptions: {
    active: number;
    cancellations_30d: number;
    cancellation_reasons_30d: Array<{ reason: string; count: number }>;
  };
  studies: {
    total: number;
    last_7_days: Array<{ date: string; count: number }>;
    top_books: Array<{ book: string; count: number }>;
  };
  topic_searches: {
    total: number;
    top_queries: Array<{ query: string; count: number }>;
  };
  blog: {
    published: number;
    total_views: number;
    top_viewed: Array<{ title: string; slug: string; views: number }>;
  };
  feedback: { total: number; useful_ratio: number | null };
  shares: { by_channel_30d: Array<{ channel: string; count: number }> };
  demography: {
    by_locale: Array<{ locale: string; count: number }>;
    by_sex: Array<{ sex: string; count: number }>;
    by_age_bracket: Array<{ bracket: string; count: number }>;
  };
}

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  const { data: metricsData, error: metricsError } = await supabase.rpc(
    "admin_dashboard_metrics",
  );

  const metrics = (metricsData as unknown as Metrics) ?? null;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
              Painel administrativo
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Visão consolidada do Verbum.
            </p>
          </div>
          <nav className="flex gap-2 text-sm">
            <Link href="/admin/usuarios" className="rounded-md border border-border px-3 py-1.5 hover:bg-accent">
              Usuários
            </Link>
            <Link href="/admin/estudos" className="rounded-md border border-border px-3 py-1.5 hover:bg-accent">
              Estudos
            </Link>
            <Link href="/admin/ctas" className="rounded-md border border-border px-3 py-1.5 hover:bg-accent">
              CTAs
            </Link>
            <Link href="/admin/anuncios" className="rounded-md border border-border px-3 py-1.5 hover:bg-accent">
              Anúncios
            </Link>
          </nav>
        </header>

        {metricsError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
            Erro ao carregar métricas: {metricsError.message}
          </div>
        )}

        {metrics && (
          <>
            <MetricGroup title="Usuários">
              <MetricCard label="Total" value={metrics.users.total} />
              <MetricCard label="Ativos (30d)" value={metrics.users.active_30d} />
              <MetricCard label="DAU" value={metrics.users.dau} />
              <MetricCard label="MAU" value={metrics.users.mau} />
              <MetricCard label="Pagantes" value={metrics.users.paying} highlight />
              <MetricCard label="Gratuitos" value={metrics.users.free} />
            </MetricGroup>

            <MetricGroup title="Assinaturas">
              <MetricCard label="Ativas" value={metrics.subscriptions.active} highlight />
              <MetricCard label="Cancelamentos (30d)" value={metrics.subscriptions.cancellations_30d} />
            </MetricGroup>

            <div className="grid gap-6 lg:grid-cols-2">
              <TopList
                title="Motivos de cancelamento (30d)"
                items={metrics.subscriptions.cancellation_reasons_30d.map((r) => ({
                  label: r.reason,
                  value: r.count,
                }))}
                emptyText="Nenhum cancelamento no período."
              />
              <TopList
                title="Livros mais estudados"
                items={metrics.studies.top_books.map((b) => ({ label: b.book, value: b.count }))}
              />
            </div>

            <MetricGroup title="Estudos">
              <MetricCard label="Total" value={metrics.studies.total} />
              <MetricCard label="Publicados" value={metrics.blog.published} />
              <MetricCard label="Views do blog" value={metrics.blog.total_views} />
              <MetricCard
                label="Joinha útil"
                value={
                  metrics.feedback.useful_ratio === null
                    ? "—"
                    : `${metrics.feedback.useful_ratio}%`
                }
              />
            </MetricGroup>

            <div className="grid gap-6 lg:grid-cols-2">
              <TopList
                title="Top buscas 'O que a Bíblia diz sobre'"
                items={metrics.topic_searches.top_queries.map((t) => ({
                  label: t.query,
                  value: t.count,
                }))}
                emptyText="Sem buscas ainda."
              />
              <TopList
                title="Estudos mais visualizados"
                items={metrics.blog.top_viewed.map((s) => ({
                  label: s.title,
                  value: s.views,
                  href: `/estudos/${s.slug}`,
                }))}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <TopList
                title="Compartilhamentos por canal (30d)"
                items={metrics.shares.by_channel_30d.map((c) => ({
                  label: c.channel,
                  value: c.count,
                }))}
                emptyText="Nenhum share."
              />
              <TopList
                title="Idiomas dos usuários"
                items={metrics.demography.by_locale.map((l) => ({
                  label: l.locale,
                  value: l.count,
                }))}
              />
              <TopList
                title="Faixa etária"
                items={metrics.demography.by_age_bracket.map((a) => ({
                  label: a.bracket,
                  value: a.count,
                }))}
                emptyText="Sem dados de idade."
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
