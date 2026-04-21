import { createAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface StudyListItem {
  id: string;
  title: string;
  verse_reference: string;
  slug: string;
  is_published: boolean;
  created_at: string;
  owner_id: string | null;
  profiles: { display_name: string | null } | null;
}

export interface ListStudiesParams {
  page?: number;
  pageSize?: number;
  userId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listStudies(
  params: ListStudiesParams = {},
): Promise<PaginatedResult<StudyListItem>> {
  const { page = 1, pageSize = 20, userId, search, dateFrom, dateTo } = params;
  const offset = (page - 1) * pageSize;

  const supabase = createAdminClient();

  let query = supabase
    .from("studies")
    .select("id, title, verse_reference, slug, is_published, created_at, owner_id, profiles(display_name)", {
      count: "exact",
    });

  if (userId) {
    query = query.eq("owner_id", userId);
  }

  if (search) {
    query = query.ilike("title", `%${search}%`);
  }

  if (dateFrom) {
    query = query.gte("created_at", dateFrom);
  }

  if (dateTo) {
    query = query.lte("created_at", dateTo);
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to list studies: ${error.message}`);
  }

  return {
    data: (data ?? []) as unknown as StudyListItem[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function unpublishStudy(
  studyId: string,
  reason: string,
): Promise<void> {
  if (!reason || reason.trim().length === 0) {
    throw new Error("Unpublish reason is required");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("studies")
    .update({
      is_published: false,
      unpublish_reason: reason.trim(),
    })
    .eq("id", studyId);

  if (error) {
    throw new Error(`Failed to unpublish study: ${error.message}`);
  }
}

export async function deleteStudy(studyId: string): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("studies").delete().eq("id", studyId);

  if (error) {
    throw new Error(`Failed to delete study: ${error.message}`);
  }
}

export async function requireAdmin(): Promise<string> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AdminAuthError("Unauthorized", 401);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || profile.role !== "admin") {
    throw new AdminAuthError("Forbidden", 403);
  }

  return user.id;
}

export class AdminAuthError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "AdminAuthError";
  }
}
