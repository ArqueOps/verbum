import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { generateStudySlug } from "@/lib/slug";

const PUBLICATION_SLUG_PATTERN = /^[a-z0-9-]+-\d+-\d+(-\d+)?-estudo(-\d+)?$/;

const requestSchema = z.object({
  study_id: z.string().uuid(),
  action: z.enum(["publish", "unpublish"]),
});

function isPublicationSlug(slug: string): boolean {
  return PUBLICATION_SLUG_PATTERN.test(slug);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const validation = requestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: "Dados de entrada inválidos", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { study_id, action } = validation.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Não autenticado", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { data: study, error: fetchError } = await supabase
    .from("studies")
    .select("*")
    .eq("id", study_id)
    .single();

  if (fetchError || !study) {
    return NextResponse.json(
      { error: "Estudo não encontrado", code: "NOT_FOUND" },
      { status: 404 },
    );
  }

  if (study.owner_id !== user.id) {
    return NextResponse.json(
      { error: "Você não tem permissão para alterar este estudo", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  if (action === "publish") {
    let slug = study.slug;

    if (!isPublicationSlug(slug)) {
      const { data: books, error: booksError } = await supabase
        .from("bible_books")
        .select("*");

      if (booksError || !books) {
        return NextResponse.json(
          { error: "Erro ao buscar livros da Bíblia", code: "INTERNAL_ERROR" },
          { status: 500 },
        );
      }

      slug = await generateStudySlug(
        study.verse_reference,
        books,
        supabase,
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("studies")
      .update({
        slug,
        is_published: true,
        published_at: new Date().toISOString(),
      })
      .eq("id", study_id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json(
        { error: "Erro ao publicar estudo", code: "UPDATE_ERROR" },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: updated });
  }

  // action === "unpublish"
  const { data: updated, error: updateError } = await supabase
    .from("studies")
    .update({ is_published: false })
    .eq("id", study_id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "Erro ao despublicar estudo", code: "UPDATE_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: updated });
}
