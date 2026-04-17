import Link from "next/link";
import { BlogCard } from "./BlogCard";

interface StudySummary {
  id: string;
  title: string;
  slug: string;
  verseReference: string;
  publishedAt: string | null;
  bookName: string | null;
  summary: string | null;
  authorName: string | null;
}

interface BlogFeedSectionProps {
  studies: StudySummary[];
}

export function BlogFeedSection({ studies }: BlogFeedSectionProps) {
  if (studies.length === 0) {
    return (
      <section aria-label="Estudos recentes" data-testid="blog-feed-section">
        <p className="text-center text-sm text-muted-foreground">
          Nenhum estudo disponível no momento.
        </p>
      </section>
    );
  }

  return (
    <section aria-label="Estudos recentes" data-testid="blog-feed-section">
      <h2 className="font-display text-2xl font-semibold tracking-tight text-primary">
        Estudos Recentes
      </h2>

      <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {studies.map((study) => (
          <BlogCard
            key={study.id}
            title={study.title}
            slug={study.slug}
            verseReference={study.verseReference}
            publishedAt={study.publishedAt}
            bookName={study.bookName}
            summary={study.summary}
            authorName={study.authorName}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/blog"
          className="rounded-lg border border-primary/30 px-6 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
          data-testid="blog-feed-cta"
        >
          Ver todos os estudos
        </Link>
      </div>
    </section>
  );
}
