import { BookOpen, Clock } from "lucide-react";

interface StudyHeaderProps {
  title: string;
  verseReference: string;
  versionAbbr: string;
  generationTimeSeconds?: number;
}

export function StudyHeader({
  title,
  verseReference,
  versionAbbr,
  generationTimeSeconds,
}: StudyHeaderProps) {
  return (
    <header className="flex flex-col gap-3">
      <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
        {title}
      </h1>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
          <BookOpen className="size-4" />
          {verseReference}
        </span>
        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {versionAbbr}
        </span>
        {generationTimeSeconds != null && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            Gerado em {generationTimeSeconds}s
          </span>
        )}
      </div>
    </header>
  );
}
