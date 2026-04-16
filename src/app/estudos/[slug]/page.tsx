import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StudySections } from "@/components/study/StudySections";

export const revalidate = 3600;

interface StudyPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const supabase = await createServerSupabaseClient();

  const { data: studies } = await supabase
    .from("studies")
    .select("slug")
    .eq("is_published", true);

  return (studies ?? []).map((study) => ({ slug: study.slug }));
}

async function fetchStudy(slug: string) {
  const supabase = await createServerSupabaseClient();

  const { data: study } = await supabase
    .from("studies")
    .select(
      `id, title, verse_reference, created_at, published_at, slug,
      profiles!owner_id(display_name),
      bible_versions!version_id(abbr),
      study_sections(id, title, content, order_index)`
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  return study;
}

function formatDatePtBR(dateString: string): string {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function StudyPage({ params }: StudyPageProps) {
  const { slug } = await params;
  const study = await fetchStudy(slug);

  if (!study) {
    notFound();
  }

  const authorName =
    (study.profiles as unknown as { display_name: string | null })
      ?.display_name ?? "";
  const versionAbbr =
    (study.bible_versions as unknown as { abbr: string } | null)?.abbr ?? "";
  const publicationDate = study.published_at ?? study.created_at;

  const sections = (study.study_sections ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    content: typeof s.content === "string" ? s.content : String(s.content),
    position: s.order_index,
  }));

  return (
    <article className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          {study.title}
        </h1>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span>{study.verse_reference}</span>
          {versionAbbr && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{versionAbbr}</span>
            </>
          )}
          <span aria-hidden="true">&middot;</span>
          <time dateTime={publicationDate}>
            {formatDatePtBR(publicationDate)}
          </time>
          {authorName && (
            <>
              <span aria-hidden="true">&middot;</span>
              <span>{authorName}</span>
            </>
          )}
        </div>
      </header>

      <StudySections sections={sections} defaultAllOpen />
    </article>
  );
}
