import { cn } from "@/lib/utils";

interface StudySkeletonProps {
  completedSections?: string[];
  children?: React.ReactNode;
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
    />
  );
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="h-8 w-3/4" />
      <SkeletonBlock className="h-4 w-1/2" />
    </div>
  );
}

function SectionCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 ring-1 ring-foreground/10">
      <SkeletonBlock className="h-5 w-2/5" />
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-5/6" />
        <SkeletonBlock className="h-3 w-3/4" />
      </div>
    </div>
  );
}

const SECTION_KEYS = [
  "context",
  "keywords",
  "cross_references",
  "theology",
  "application",
  "reflection",
  "summary",
] as const;

export function StudySkeleton({
  completedSections = [],
  children,
}: StudySkeletonProps) {
  const completedSet = new Set(completedSections);

  const childrenArray = Array.isArray(children)
    ? children
    : children
      ? [children]
      : [];

  return (
    <div className="flex flex-col gap-4">
      {completedSet.size > 0 ? null : <HeaderSkeleton />}

      {SECTION_KEYS.map((key, index) => {
        if (completedSet.has(key)) {
          return childrenArray[index] ?? null;
        }
        return <SectionCardSkeleton key={key} />;
      })}
    </div>
  );
}

export { HeaderSkeleton, SectionCardSkeleton, SkeletonBlock };
