import { Suspense } from "react";
import { listUsers } from "@/lib/admin-users";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UserManagement } from "./user-management";

export const metadata = {
  title: "Gestão de Usuários — Admin — Verbum",
};

export const dynamic = "force-dynamic";

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-full rounded-lg bg-foreground/10" />
      <div className="rounded-lg border border-border">
        <div className="h-10 border-b border-border bg-muted/50" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-border px-4 py-3">
            {Array.from({ length: 9 }).map((_, j) => (
              <div key={j} className="h-4 flex-1 rounded bg-foreground/10" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

async function UsersContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q : "";
  const page = Math.max(1, Number(params.page) || 1);
  const perPage = [10, 20, 50].includes(Number(params.perPage))
    ? Number(params.perPage)
    : 10;

  const supabase = await createServerSupabaseClient();
  const { users, total } = await listUsers(supabase, { search, page, pageSize: perPage });

  return (
    <UserManagement
      initialUsers={users}
      initialTotal={total}
      initialSearch={search}
      initialPage={page}
      initialPerPage={perPage}
    />
  );
}

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-primary">
          Gestão de Usuários
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie assinaturas, contas e histórico de usuários.
        </p>
      </div>

      <Suspense fallback={<LoadingSkeleton />}>
        <UsersContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
