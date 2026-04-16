import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StudySections } from "@/components/study/StudySections";
import { BookOpen, Calendar, User } from "lucide-react";

export const revalidate = 3600;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://verbum.vercel.app";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function buildDescription(sections: { content: string }[]): string {
  const combined = sections.map((s) => s.content).join(" ");
  if (combined.length <= 160) return combined;
  return combined.slice(0, 157) + "...";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: study } = await supabase
    .from("studies")
    .select(
      "id, title, slug, verse_reference, published_at, created_at, owner_id, profiles(display_name)"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!study) return {};

  const { data: sections } = await supabase
    .from("study_sections")
    .select("content, order_index")
    .eq("study_id", study.id)
    .order("order_index")
    .returns<{ content: string; order_index: number }[]>();

  const description = buildDescription(sections ?? []);
  const canonicalUrl = `${SITE_URL}/estudos/${slug}`;

  return {
    title: study.title,
    description,
    openGraph: {
      title: study.title,
      description,
      type: "article",
      url: canonicalUrl,
      images: [
        { url: `${SITE_URL}/api/og/${slug}`, alt: study.title },
        { url: `${SITE_URL}/og-default.png`, alt: "Verbum" },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: study.title,
      description,
      images: [`${SITE_URL}/api/og/${slug}`, `${SITE_URL}/og-default.png`],
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export async function generateStaticParams() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return [];
  }

  const supabase = await createServerSupabaseClient();

  const { data: studies } = await supabase
    .from("studies")
    .select("slug")
    .eq("is_published", true);

  return (studies ?? []).map((study) => ({ slug: study.slug }));
}

export default async function StudyPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: study } = await supabase
    .from("studies")
    .select(
      "id, title, slug, verse_reference, published_at, created_at, owner_id, version_id, profiles(display_name)"
    )
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!study) {
    notFound();
  }

  const [versionResult, sectionsResult] = await Promise.all([
    study.version_id
      ? supabase
          .from("bible_versions")
          .select("abbr, name")
          .eq("id", study.version_id)
          .single()
      : Promise.resolve({ data: null }),
    supabase
      .from("study_sections")
      .select("id, title, content, order_index, section_type")
      .eq("study_id", study.id)
      .order("order_index")
      .returns<
        {
          id: string;
          title: string;
          content: string;
          order_index: number;
          section_type: string;
        }[]
      >(),
  ]);

  const profiles = study.profiles as unknown as { display_name: string | null } | null;
  const authorName = profiles?.display_name ?? "";
  const versionAbbr = versionResult.data?.abbr ?? "";
  const sections = sectionsResult.data ?? [];

  const publishedDate = study.published_at ?? study.created_at;
  const formattedDate = new Date(publishedDate).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const description = buildDescription(sections);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: study.title,
    author: {
      "@type": "Person",
      name: authorName || "Verbum",
    },
    datePublished: new Date(publishedDate).toISOString(),
    description,
  };

  const mappedSections = sections.map((s) => ({
    id: s.id,
    title: s.title,
    content: typeof s.content === "string" ? s.content : String(s.content),
    position: s.order_index,
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4">
          <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
            {study.title}
          </h1>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="size-4" />
              {study.verse_reference}
            </span>

            {versionAbbr && (
              <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {versionAbbr}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" />
              {formattedDate}
            </span>

            {authorName && (
              <span className="inline-flex items-center gap-1.5">
                <User className="size-4" />
                {authorName}
              </span>
            )}
          </div>
        </header>

        <StudySections sections={mappedSections} defaultAllOpen />
      </article>
    </>
  );
}
