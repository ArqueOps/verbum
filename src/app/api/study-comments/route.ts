import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const postSchema = z.object({
  study_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Entre na sua conta para comentar." },
      { status: 401 },
    );
  }

  const { data, error } = await supabase
    .from("study_comments")
    .insert({
      study_id: parsed.data.study_id,
      user_id: user.id,
      content: parsed.data.content,
    })
    .select("id, content, created_at, user_id")
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Erro ao salvar" },
      { status: 500 },
    );
  }
  return NextResponse.json({ comment: data }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const studyId = req.nextUrl.searchParams.get("study_id");
  if (!studyId) {
    return NextResponse.json({ error: "Missing study_id" }, { status: 400 });
  }
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("study_comments")
    .select("id, content, created_at, user_id, profiles!user_id(display_name, avatar_url)")
    .eq("study_id", studyId)
    .eq("is_hidden", false)
    .order("created_at", { ascending: false })
    .limit(100);

  return NextResponse.json({ comments: data ?? [] });
}
