function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

export function StudyCardSkeleton() {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <SkeletonBlock className="h-3.5 w-28" />
        <SkeletonBlock className="size-4 rounded-sm" />
      </div>

      <SkeletonBlock className="h-4 w-3/4" />
      <SkeletonBlock className="h-4 w-1/2" />

      <div className="mt-auto flex items-center justify-between pt-1">
        <SkeletonBlock className="h-3 w-32" />
        <SkeletonBlock className="h-4 w-16 rounded-full" />
      </div>
    </div>
  );
}
