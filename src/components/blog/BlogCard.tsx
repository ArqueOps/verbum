import Link from "next/link";

interface BlogCardProps {
  title: string;
  verseReference: string;
  content: string;
  publishedAt: string;
  authorName: string | null;
  slug: string;
}

function formatDatePtBr(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function truncateContent(raw: unknown, maxLength: number): string {
  if (typeof raw === "string") {
    return raw.length > maxLength ? raw.slice(0, maxLength) + "…" : raw;
  }
  if (raw && typeof raw === "object") {
    const text = JSON.stringify(raw);
    const cleaned = text.replace(/[{}\[\]"]/g, " ").replace(/\s+/g, " ").trim();
    return cleaned.length > maxLength
      ? cleaned.slice(0, maxLength) + "…"
      : cleaned;
  }
  return "";
}

export function BlogCard({
  title,
  verseReference,
  content,
  publishedAt,
  authorName,
  slug,
}: BlogCardProps) {
  const excerpt = truncateContent(content, 120);
  const formattedDate = formatDatePtBr(publishedAt);

  return (
    <Link
      href={`/estudos/${slug}`}
      className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/30 hover:bg-accent/50"
    >
      <span className="text-xs font-medium text-primary/70">
        {verseReference}
      </span>

      <h3 className="line-clamp-2 text-base font-semibold text-card-foreground group-hover:text-primary">
        {title}
      </h3>

      {excerpt && (
        <p className="line-clamp-3 text-sm text-muted-foreground">{excerpt}</p>
      )}

      <div className="mt-auto flex items-center justify-between pt-2">
        <time className="text-xs text-muted-foreground" dateTime={publishedAt}>
          {formattedDate}
        </time>
        {authorName && (
          <span className="text-xs text-muted-foreground">{authorName}</span>
        )}
      </div>
    </Link>
  );
}
