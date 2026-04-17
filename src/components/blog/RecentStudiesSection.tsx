import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BlogCard } from "./BlogCard";

const MAX_STUDIES = 6;

async function fetchRecentStudies() {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("studies")
    .select(
      `
      id,
      title,
      slug,
      verse_reference,
      content,
      published_at,
      profiles!owner_id ( display_name ),
      books!book_id ( name )
    `,
    )
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(MAX_STUDIES);

  return data ?? [];
}

function extractSummary(content: string | null): string | null {
  if (!content) return null;
  const plain = content.replace(/[#*_`>\[\]()-]/g, "").trim();
  return plain.length > 120 ? plain.slice(0, 120) : plain;
}

export async function RecentStudiesSection() {
  const studies = await fetchRecentStudies();

  if (studies.length === 0) {
    return (
      <section className="w-full py-12" data-testid="recent-studies-section">
        <h2 className="font-display text-center text-2xl font-semibold text-foreground sm:text-3xl">
          Estudos Recentes
        </h2>
        <p className="mt-4 text-center text-muted-foreground">
          Nenhum estudo publicado ainda. Volte em breve!
        </p>
      </section>
    );
  }

  return (
    <section className="w-full py-12" data-testid="recent-studies-section">
      <h2 className="font-display text-center text-2xl font-semibold text-foreground sm:text-3xl">
        Estudos Recentes
      </h2>
      <p className="mt-2 text-center text-muted-foreground">
        Explore as reflexões mais recentes da comunidade
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {studies.map((study) => {
          const profile = study.profiles as unknown as {
            display_name: string | null;
          } | null;
          const book = study.books as unknown as {
            name: string | null;
          } | null;

          return (
            <BlogCard
              key={study.id}
              title={study.title}
              verseReference={study.verse_reference}
              publishedAt={study.published_at}
              bookName={book?.name ?? null}
              slug={study.slug}
              summary={extractSummary(study.content)}
              authorName={profile?.display_name ?? null}
            />
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/blog"
          className="rounded-lg border border-primary/30 px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          data-testid="explore-all-studies-cta"
        >
          Explore Todos os Estudos
        </Link>
      </div>
    </section>
  );
}
