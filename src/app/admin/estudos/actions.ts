"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface StudyRow {
  id: string;
  title: string;
  verse_reference: string;
  created_at: string;
  is_published: boolean;
  slug: string;
  owner: { display_name: string | null; email: string } | null;
}

export interface FetchStudiesResult {
  studies: StudyRow[];
  totalCount: number;
  page: number;
  totalPages: number;
}

interface FetchStudiesParams {
  page?: number;
  perPage?: number;
  search?: string;
  bookId?: number | null;
  versionId?: number | null;
  userId?: string | null;
}

async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Acesso negado");

  return supabase;
}

export async function fetchStudies(
  params: FetchStudiesParams,
): Promise<FetchStudiesResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const page = params.page ?? 1;
  const perPage = params.perPage ?? 10;
  const offset = (page - 1) * perPage;

  let query = admin
    .from("studies")
    .select("id, title, verse_reference, created_at, is_published, slug, owner_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (params.search) {
    query = query.or(
      `title.ilike.%${params.search}%,verse_reference.ilike.%${params.search}%`,
    );
  }

  if (params.bookId) {
    query = query.eq("book_id", params.bookId);
  }

  if (params.versionId) {
    query = query.eq("version_id", params.versionId);
  }

  if (params.userId) {
    query = query.eq("owner_id", params.userId);
  }

  const { data: rawStudies, count, error } = await query;

  if (error) throw new Error(error.message);

  const ownerIds = [
    ...new Set(
      (rawStudies ?? []).map((s) => s.owner_id).filter(Boolean) as string[],
    ),
  ];

  let profilesMap: Record<string, { display_name: string | null; email: string }> = {};

  if (ownerIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, display_name, email")
      .in("id", ownerIds);

    if (profiles) {
      profilesMap = Object.fromEntries(
        profiles.map((p) => [p.id, { display_name: p.display_name, email: p.email }]),
      );
    }
  }

  const studies: StudyRow[] = (rawStudies ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    verse_reference: s.verse_reference,
    created_at: s.created_at,
    is_published: s.is_published,
    slug: s.slug,
    owner: s.owner_id ? profilesMap[s.owner_id] ?? null : null,
  }));

  const totalCount = count ?? 0;

  return {
    studies,
    totalCount,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / perPage)),
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function unpublishStudy(studyId: string, _reason: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("studies")
    .update({ is_published: false, published_at: null })
    .eq("id", studyId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/estudos");
  return { success: true };
}

export async function deleteStudy(studyId: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { error: sectionsError } = await admin
    .from("study_sections")
    .delete()
    .eq("study_id", studyId);

  if (sectionsError) throw new Error(sectionsError.message);

  const { error } = await admin.from("studies").delete().eq("id", studyId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/estudos");
  return { success: true };
}

export async function fetchFilterOptions() {
  await requireAdmin();
  const admin = createAdminClient();

  const [booksResult, versionsResult, usersResult] = await Promise.all([
    admin.from("books").select("id, name, abbr").order("position"),
    admin.from("bible_versions").select("id, name, abbr").order("name"),
    admin
      .from("profiles")
      .select("id, display_name, email")
      .order("display_name"),
  ]);

  return {
    books: booksResult.data ?? [],
    versions: versionsResult.data ?? [],
    users: (usersResult.data ?? []).map((u) => ({
      id: u.id,
      label: u.display_name || u.email,
    })),
  };
}
