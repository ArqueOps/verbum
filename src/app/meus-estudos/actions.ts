"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const PAGE_SIZE = 12;

export interface FetchUserStudiesParams {
  page: number;
  favoritosOnly: boolean;
  bookAbbr: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

export interface StudyWithBookmark {
  id: string;
  title: string;
  verse_reference: string;
  created_at: string;
  slug: string;
  is_published: boolean;
  is_bookmarked: boolean;
}

export interface FetchUserStudiesResult {
  studies: StudyWithBookmark[];
  totalCount: number;
  page: number;
  totalPages: number;
}

export async function fetchUserStudies(
  params: FetchUserStudiesParams,
): Promise<FetchUserStudiesResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { studies: [], totalCount: 0, page: 1, totalPages: 0 };
  }

  const offset = (params.page - 1) * PAGE_SIZE;

  let bookmarkedIds: string[] | null = null;
  if (params.favoritosOnly) {
    const { data: bookmarks } = await supabase
      .from("study_bookmarks")
      .select("study_id")
      .eq("user_id", user.id);

    bookmarkedIds = bookmarks?.map((b) => b.study_id) ?? [];
    if (bookmarkedIds.length === 0) {
      return { studies: [], totalCount: 0, page: params.page, totalPages: 0 };
    }
  }

  let query = supabase
    .from("studies")
    .select("id, title, verse_reference, created_at, slug, is_published", {
      count: "exact",
    })
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  if (bookmarkedIds) {
    query = query.in("id", bookmarkedIds);
  }
  if (params.bookAbbr) {
    query = query.like("verse_reference", `${params.bookAbbr} %`);
  }
  if (params.dateFrom) {
    query = query.gte("created_at", `${params.dateFrom}T00:00:00`);
  }
  if (params.dateTo) {
    query = query.lte("created_at", `${params.dateTo}T23:59:59`);
  }

  query = query.range(offset, offset + PAGE_SIZE - 1);

  const { data: studies, count } = await query;
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (!studies || studies.length === 0) {
    return { studies: [], totalCount, page: params.page, totalPages };
  }

  const studyIds = studies.map((s) => s.id);
  const { data: userBookmarks } = await supabase
    .from("study_bookmarks")
    .select("study_id")
    .eq("user_id", user.id)
    .in("study_id", studyIds);

  const bookmarkedSet = new Set(userBookmarks?.map((b) => b.study_id) ?? []);

  const studiesWithBookmarks: StudyWithBookmark[] = studies.map((s) => ({
    ...s,
    is_bookmarked: bookmarkedSet.has(s.id),
  }));

  return {
    studies: studiesWithBookmarks,
    totalCount,
    page: params.page,
    totalPages,
  };
}

export async function toggleFavorite(
  studyId: string,
): Promise<{ success: boolean; is_bookmarked: boolean }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, is_bookmarked: false };
  }

  const { data: existing } = await supabase
    .from("study_bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("study_id", studyId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("study_bookmarks")
      .delete()
      .eq("id", existing.id);

    if (error) {
      return { success: false, is_bookmarked: true };
    }

    revalidatePath("/meus-estudos");
    return { success: true, is_bookmarked: false };
  }

  const { error } = await supabase
    .from("study_bookmarks")
    .insert({ user_id: user.id, study_id: studyId });

  if (error) {
    return { success: false, is_bookmarked: false };
  }

  revalidatePath("/meus-estudos");
  return { success: true, is_bookmarked: true };
}
