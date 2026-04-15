import { BookOpen } from "lucide-react";

interface Study {
  id: string;
  title: string;
  verse_reference: string;
  created_at: string;
  slug: string;
}

interface StudyListProps {
  studies: Study[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function StudyList({ studies }: StudyListProps) {
  if (studies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
        <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" strokeWidth={1.5} />
        <p className="text-sm font-medium text-muted-foreground">
          Nenhum estudo encontrado.
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          Ajuste os filtros ou crie um novo estudo.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {studies.map((study) => (
        <li key={study.id}>
          <a
            href={`/estudos/${study.slug}`}
            className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-accent/50"
          >
            <span className="text-xs font-medium text-primary/70">
              {study.verse_reference}
            </span>
            <h3 className="line-clamp-2 text-sm font-semibold text-card-foreground group-hover:text-primary">
              {study.title}
            </h3>
            <time className="mt-auto text-xs text-muted-foreground" dateTime={study.created_at}>
              {formatDate(study.created_at)}
            </time>
          </a>
        </li>
      ))}
    </ul>
  );
}
