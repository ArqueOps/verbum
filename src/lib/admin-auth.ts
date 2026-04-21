import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AdminUser {
  id: string;
  role: string;
}

export async function requireAdmin(): Promise<
  { admin: AdminUser; error?: never } | { admin?: never; error: string }
> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Não autenticado" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    return { error: "Acesso negado" };
  }

  return { admin: { id: user.id, role: profile.role } };
}
