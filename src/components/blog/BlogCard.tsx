import Link from "next/link";

interface BlogCardProps {
  title: string;
  verseReference: string;
  publishedAt: string | null;
  bookName: string | null;
  slug: string;
  summary: string | null;
  authorName: string | null;
}

function formatDatePtBr(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function BlogCard({
  title,
  verseReference,
  publishedAt,
  bookName,
  slug,
  summary,
  authorName,
}: BlogCardProps) {
  const formattedDate = publishedAt ? formatDatePtBr(publishedAt) : null;

  return (
    <Link
      href={`/estudos/${slug}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-accent/50"
      data-testid="blog-card"
    >
      <span className="text-xs font-medium text-primary/70">
        {verseReference}
      </span>

      <h3 className="line-clamp-2 text-base font-semibold text-card-foreground group-hover:text-primary">
        {title}
      </h3>

      {summary && (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {summary.length > 120 ? summary.slice(0, 120) + "\u2026" : summary}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between pt-2">
        {formattedDate && (
          <time
            className="text-xs text-muted-foreground"
            dateTime={publishedAt!}
          >
            {formattedDate}
          </time>
        )}
        {(authorName || bookName) && (
          <span className="text-xs text-muted-foreground">
            {[authorName, bookName].filter(Boolean).join(" \u00b7 ")}
          </span>
        )}
      </div>
    </Link>
  );
}
