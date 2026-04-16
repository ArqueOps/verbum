import { fetchStudies, fetchFilterOptions } from "./actions";
import { StudyFilters } from "./study-filters";
import { StudyTable } from "./study-table";

export const metadata = {
  title: "Moderação de Estudos — Verbum",
  description: "Moderação administrativa de estudos bíblicos.",
};

interface SearchParams {
  page?: string;
  perPage?: string;
  search?: string;
  livro?: string;
  versao?: string;
  usuario?: string;
}

export default async function AdminEstudosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const page = params.page ? Number(params.page) : 1;
  const perPage = params.perPage ? Number(params.perPage) : 10;
  const search = params.search ?? "";
  const bookId = params.livro ? Number(params.livro) : null;
  const versionId = params.versao ? Number(params.versao) : null;
  const userId = params.usuario ?? null;

  const [result, filterOptions] = await Promise.all([
    fetchStudies({ page, perPage, search, bookId, versionId, userId }),
    fetchFilterOptions(),
  ]);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8">
      <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
        Moderação de Estudos
      </h1>

      <StudyFilters
        books={filterOptions.books}
        versions={filterOptions.versions}
        users={filterOptions.users}
        currentSearch={search}
        currentBookId={bookId}
        currentVersionId={versionId}
        currentUserId={userId}
        currentPerPage={perPage}
      />

      <StudyTable
        studies={result.studies}
        page={result.page}
        totalPages={result.totalPages}
        totalCount={result.totalCount}
        perPage={perPage}
      />
    </main>
  );
}
