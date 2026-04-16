import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BlogCard } from "@/components/blog/BlogCard";
import Link from "next/link";

export const metadata = {
  title: "Blog | Verbum",
  description:
    "Explore estudos bíblicos aprofundados gerados com inteligência artificial.",
};

const ITEMS_PER_PAGE = 12;

interface SearchParams {
  page?: string;
}

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page) || 1);
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const supabase = await createServerSupabaseClient();

  const { count } = await supabase
    .from("studies")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const { data: studies } = await supabase
    .from("studies")
    .select(
      "id, title, slug, verse_reference, content, published_at, owner_id, profiles(display_name)",
    )
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
          Blog
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estudos bíblicos aprofundados gerados com inteligência artificial.
        </p>
      </div>

      {!studies || studies.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum estudo publicado ainda.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {studies.map((study) => {
              const profiles = study.profiles as
                | { display_name: string | null }[]
                | { display_name: string | null }
                | null;
              const profile = Array.isArray(profiles)
                ? profiles[0]
                : profiles;
              const authorName = profile?.display_name ?? "Autor anônimo";

              return (
                <BlogCard
                  key={study.id}
                  title={study.title}
                  verseReference={study.verse_reference}
                  content={study.content as string}
                  publishedAt={study.published_at ?? study.id}
                  authorName={authorName}
                  slug={study.slug}
                />
              );
            })}
          </div>

          {totalPages > 1 && (
            <nav
              className="flex items-center justify-center gap-2 pt-4"
              aria-label="Paginação"
            >
              {currentPage > 1 ? (
                <Link
                  href={`/blog?page=${currentPage - 1}`}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
                >
                  Anterior
                </Link>
              ) : (
                <span className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground/50 cursor-not-allowed">
                  Anterior
                </span>
              )}

              <span className="px-3 text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={`/blog?page=${currentPage + 1}`}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
                >
                  Próxima
                </Link>
              ) : (
                <span className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground/50 cursor-not-allowed">
                  Próxima
                </span>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}
