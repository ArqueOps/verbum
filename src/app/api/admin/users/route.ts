import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";
import { listUsers } from "@/lib/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") ?? undefined;
  const page = Number(searchParams.get("page") ?? "1");
  const pageSize = Number(searchParams.get("pageSize") ?? "20");

  if (![10, 20, 50].includes(pageSize)) {
    return NextResponse.json(
      { error: "pageSize deve ser 10, 20 ou 50" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  try {
    const result = await listUsers(supabase, { search, page, pageSize });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro desconhecido" },
      { status: 500 },
    );
  }
}
