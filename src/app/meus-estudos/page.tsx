import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchUserStudies } from "./actions";
import { StudyFilters } from "./study-filters";
import { StudyList } from "./study-list";
import { Pagination } from "./pagination";

export const metadata = {
  title: "Meus Estudos — Verbum",
  description: "Gerencie e filtre seus estudos bíblicos.",
};

interface SearchParams {
  favoritos?: string;
  livro?: string;
  de?: string;
  ate?: string;
  pagina?: string;
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
  const favoritosOnly = params.favoritos === "true";
  const bookId = params.livro ? Number(params.livro) : null;
  const dateFrom = params.de ?? null;
  const dateTo = params.ate ?? null;
  const currentPage = Math.max(1, Number(params.pagina) || 1);

  const { data: books } = await supabase
    .from("books")
    .select("id, name, abbr")
    .order("position");

  let bookAbbr: string | null = null;
  if (bookId && books) {
    const match = books.find((b) => b.id === bookId);
    if (match) bookAbbr = match.abbr;
  }

  const result = await fetchUserStudies({
    page: currentPage,
    favoritosOnly,
    bookAbbr,
    dateFrom,
    dateTo,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
          Meus Estudos
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seus estudos bíblicos em um só lugar.
        </p>
      </div>

      <StudyFilters
        books={books ?? []}
        currentBookId={bookId}
        currentFavoritos={favoritosOnly}
        currentDateFrom={dateFrom}
        currentDateTo={dateTo}
      />

      <StudyList studies={result.studies} />

      {result.totalPages > 1 && (
        <Pagination
          currentPage={result.page}
          totalPages={result.totalPages}
        />
      )}
    </div>
  );
}
