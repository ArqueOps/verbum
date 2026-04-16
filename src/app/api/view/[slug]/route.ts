import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_MAX_AGE = 60 * 60 * 24; // 24h in seconds

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  if (!slug || slug.length > 200) {
    return NextResponse.json(
      { error: "Slug inválido" },
      { status: 400 },
    );
  }

  const cookieName = `viewed_${slug}`;
  const alreadyViewed = request.cookies.get(cookieName);

  const supabase = createAdminClient();

  if (alreadyViewed) {
    const { data: study } = await supabase
      .from("studies")
      .select("view_count")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!study) {
      return NextResponse.json(
        { error: "Estudo não encontrado" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      view_count: study.view_count as number,
      incremented: false,
    });
  }

  const { data, error } = await supabase.rpc("increment_view_count", {
    study_slug: slug,
  });

  if (error) {
    console.error("[view-counter] rpc error:", error.message);
    return NextResponse.json(
      { error: "Erro interno" },
      { status: 500 },
    );
  }

  if (data === null || (Array.isArray(data) && data.length === 0)) {
    return NextResponse.json(
      { error: "Estudo não encontrado" },
      { status: 404 },
    );
  }

  const viewCount = Array.isArray(data) ? data[0] : data;

  const response = NextResponse.json({
    view_count: viewCount as number,
    incremented: true,
  });

  response.cookies.set(cookieName, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });

  return response;
}
