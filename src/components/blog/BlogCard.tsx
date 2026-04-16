import Link from "next/link";
import { BookOpen } from "lucide-react";

interface BlogCardProps {
  title: string;
  slug: string;
  verseReference: string;
  content: string;
  publishedAt: string;
  authorName: string;
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // headers
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/__(.+?)__/g, "$1") // bold alt
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/_(.+?)_/g, "$1") // italic alt
    .replace(/~~(.+?)~~/g, "$1") // strikethrough
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1") // images
    .replace(/^[-*+]\s+/gm, "") // unordered lists
    .replace(/^\d+\.\s+/gm, "") // ordered lists
    .replace(/^>\s+/gm, "") // blockquotes
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .replace(/\n{2,}/g, " ") // collapse multiple newlines
    .replace(/\n/g, " ") // remaining newlines
    .trim();
}

function truncateContent(content: string, maxLength: number = 120): string {
  const stripped = stripMarkdown(content);
  if (stripped.length <= maxLength) {
    return stripped;
  }
  return stripped.slice(0, maxLength) + "...";
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
  slug,
  verseReference,
  content,
  publishedAt,
  authorName,
}: BlogCardProps) {
  const excerpt = truncateContent(content);
  const formattedDate = formatDatePtBr(publishedAt);

  return (
    <Link
      href={`/study/${slug}`}
      className="group relative flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/50"
    >
      <div className="flex items-center gap-1.5">
        <BookOpen className="size-3.5 text-primary/70" />
        <span className="text-xs font-medium text-primary/70">
          {verseReference}
        </span>
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold text-card-foreground group-hover:text-primary">
        {title}
      </h3>

      <p className="line-clamp-3 text-xs text-muted-foreground">
        {excerpt}
      </p>

      <div className="mt-auto flex items-center justify-between pt-1">
        <time className="text-xs text-muted-foreground" dateTime={publishedAt}>
          {formattedDate}
        </time>
        <span className="text-xs font-medium text-muted-foreground">
          {authorName}
        </span>
      </div>
    </Link>
  );
}
