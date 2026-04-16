import { StudyCardSkeleton } from "@/components/study-card-skeleton";

export default function MeusEstudosLoading() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-9 w-48 animate-pulse rounded-md bg-muted" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-muted" />
      </div>

      <div className="h-16 animate-pulse rounded-lg bg-muted" />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i}>
            <StudyCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
