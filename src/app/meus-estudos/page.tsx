import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StudyList } from "./study-list";
import { Pagination } from "./pagination";

export const metadata = {
  title: "Meus Estudos — Verbum",
  description: "Todos os seus estudos bíblicos gerados.",
};

const STUDIES_PER_PAGE = 10;
const FREE_HISTORY_LIMIT = 3;

interface SearchParams {
  page?: string;
}

export default async function MeusEstudosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const currentPage = Math.max(1, Number(params.page ?? "1"));

  // Subscription check (paid users see unlimited history + visibility toggle)
  const { data: activeSubscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  const hasSubscription = !!activeSubscription;

  const { count: totalCount } = await supabase
    .from("studies")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  const total = totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / STUDIES_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const offset = (safePage - 1) * STUDIES_PER_PAGE;

  const { data: studies } = await supabase
    .from("studies")
    .select("id, title, verse_reference, created_at, slug, is_published, view_count")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + STUDIES_PER_PAGE - 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
          Meus Estudos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {hasSubscription
            ? "Histórico completo dos seus estudos bíblicos."
            : `Seus últimos estudos. No plano gratuito, apenas os ${FREE_HISTORY_LIMIT} mais recentes ficam acessíveis.`}
        </p>
      </div>

      <StudyList
        studies={studies ?? []}
        hasSubscription={hasSubscription}
        freeHistoryLimit={FREE_HISTORY_LIMIT}
        isFirstPage={safePage === 1}
      />

      {totalPages > 1 && (
        <Pagination currentPage={safePage} totalPages={totalPages} />
      )}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
}: {
  currentPage: number;
  totalPages: number;
}) {
  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);

  return (
    <nav
      className="flex items-center justify-center gap-2 pt-4"
      aria-label="Paginação"
    >
      {currentPage > 1 ? (
        <Link
          href={`/meus-estudos?page=${prev}`}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
        >
          Anterior
        </Link>
      ) : (
        <span className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground/50">
          Anterior
        </span>
      )}
      <span className="px-3 text-sm text-muted-foreground">
        Página {currentPage} de {totalPages}
      </span>
      {currentPage < totalPages ? (
        <Link
          href={`/meus-estudos?page=${next}`}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-accent"
        >
          Próxima
        </Link>
      ) : (
        <span className="rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground/50">
          Próxima
        </span>
      )}
    </nav>
  );
}
