import Link from "next/link";

export function MetricCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-lg border-2 border-[#C8963E] bg-card p-4"
          : "rounded-lg border border-border bg-card p-4"
      }
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold text-primary">
        {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
      </p>
    </div>
  );
}

export function MetricGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {children}
      </div>
    </section>
  );
}

export function TopList({
  title,
  items,
  emptyText = "Sem dados.",
}: {
  title: string;
  items: Array<{ label: string; value: number | string; href?: string }>;
  emptyText?: string;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="font-display text-base font-semibold text-foreground">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-baseline justify-between gap-4 text-sm">
              {it.href ? (
                <Link
                  href={it.href}
                  className="truncate text-foreground hover:text-primary hover:underline"
                >
                  {it.label}
                </Link>
              ) : (
                <span className="truncate text-foreground">{it.label}</span>
              )}
              <span className="shrink-0 font-medium text-muted-foreground">
                {typeof it.value === "number"
                  ? it.value.toLocaleString("pt-BR")
                  : it.value}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
