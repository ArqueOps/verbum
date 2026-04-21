import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";

interface PublishedStudy {
  id: string;
  title: string;
  slug: string;
  verse_reference: string;
  summary: string | null;
  book_name: string | null;
  author_name: string | null;
}

async function fetchRecent(): Promise<PublishedStudy[]> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("search_published_studies", {});
    if (error || !data) return [];
    return (data as PublishedStudy[]).slice(0, 6);
  } catch {
    return [];
  }
}

export async function BlogPreviewSection() {
  const studies = await fetchRecent();

  return (
    <section className="bg-primary/5 py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-primary md:text-4xl">
              Estudos publicados
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Conteúdo público gerado pela comunidade.
            </p>
          </div>
          <Link
            href="/blog"
            className="text-sm font-medium text-[#C8963E] hover:underline"
          >
            Ver todos os estudos públicos
          </Link>
        </div>

        {studies.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              As primeiras luzes ainda estão sendo acesas. Em breve, os estudos publicados aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((s) => (
              <Link
                key={s.id}
                href={`/estudos/${s.slug}`}
                className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30"
              >
                <span className="text-xs font-medium text-primary/70">
                  {s.verse_reference}
                </span>
                <h3 className="line-clamp-2 text-base font-semibold text-card-foreground group-hover:text-primary">
                  {s.title}
                </h3>
                {s.summary && (
                  <p className="line-clamp-3 text-sm text-muted-foreground">
                    {s.summary}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
