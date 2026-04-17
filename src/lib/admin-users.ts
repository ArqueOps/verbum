import { type SupabaseClient } from "@supabase/supabase-js";

export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
  study_count: number;
  subscription_status: "active" | "past_due" | "canceled" | "expired" | null;
  subscription_plan: string | null;
  plan_label: string | null;
  subscription_end: string | null;
  last_sign_in_at: string | null;
}

export interface ListUsersParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListUsersResult {
  users: AdminUser[];
  total: number;
}

export interface GrantSubscriptionParams {
  userId: string;
  planId: string;
  durationDays: number;
  adminId: string;
  reason?: string;
}

export interface RevokeSubscriptionParams {
  userId: string;
  adminId: string;
  reason: string;
}

export interface ExtendSubscriptionParams {
  userId: string;
  additionalDays: number;
  adminId: string;
  reason?: string;
}

export interface CancellationEntry {
  id: string;
  user_id: string;
  reason: string;
  canceled_at: string;
  admin_id: string | null;
}

export async function listUsers(
  supabase: SupabaseClient,
  params: ListUsersParams = {},
): Promise<ListUsersResult> {
  const { search, page = 1, pageSize = 20 } = params;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("profiles")
    .select(
      "id, display_name, role, created_at, email:id, last_sign_in_at, studies(count), subscriptions(status, plan_id, current_period_end)",
      { count: "exact" },
    );

  if (search) {
    query = query.or(
      `display_name.ilike.%${search}%,id.ilike.%${search}%`,
    );
  }

  query = query.range(offset, offset + pageSize - 1).order("created_at", { ascending: false });

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  const users: AdminUser[] = (data ?? []).map((row: Record<string, unknown>) => {
    const studies = row.studies as Array<{ count: number }> | null;
    const subscriptions = row.subscriptions as Array<{
      status: string;
      plan_id: string;
      current_period_end: string | null;
    }> | null;
    const activeSub = subscriptions?.find(
      (s) => s.status === "active" || s.status === "past_due",
    );

    const planLabels: Record<string, string> = {
      monthly: "Mensal",
      annual: "Anual",
    };

    return {
      id: row.id as string,
      email: row.email as string,
      display_name: row.display_name as string | null,
      role: row.role as string,
      created_at: row.created_at as string,
      study_count: studies?.[0]?.count ?? 0,
      subscription_status: (activeSub?.status as AdminUser["subscription_status"]) ?? null,
      subscription_plan: activeSub?.plan_id ?? null,
      plan_label: activeSub ? (planLabels[activeSub.plan_id] ?? activeSub.plan_id) : null,
      subscription_end: activeSub?.current_period_end ?? null,
      last_sign_in_at: (row.last_sign_in_at as string | null) ?? null,
    };
  });

  return { users, total: count ?? 0 };
}

export async function grantSubscription(
  supabase: SupabaseClient,
  params: GrantSubscriptionParams,
): Promise<{ subscriptionId: string }> {
  const { userId, planId, durationDays, adminId, reason } = params;

  const now = new Date();
  const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan_id: planId,
      status: "active",
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to grant subscription: ${error.message}`);
  }

  await supabase.from("subscription_admin_actions").insert({
    admin_id: adminId,
    user_id: userId,
    action: "grant",
    subscription_id: data.id,
    reason: reason ?? null,
    metadata: { plan_id: planId, duration_days: durationDays },
  });

  return { subscriptionId: data.id };
}

export async function revokeSubscription(
  supabase: SupabaseClient,
  params: RevokeSubscriptionParams,
): Promise<void> {
  const { userId, adminId, reason } = params;

  const { data: subscription, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (fetchError || !subscription) {
    throw new Error("No active subscription found for user");
  }

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("id", subscription.id);

  if (updateError) {
    throw new Error(`Failed to revoke subscription: ${updateError.message}`);
  }

  await supabase.from("subscription_admin_actions").insert({
    admin_id: adminId,
    user_id: userId,
    action: "revoke",
    subscription_id: subscription.id,
    reason,
  });
}

export async function extendSubscription(
  supabase: SupabaseClient,
  params: ExtendSubscriptionParams,
): Promise<{ newPeriodEnd: string }> {
  const { userId, additionalDays, adminId, reason } = params;

  const { data: subscription, error: fetchError } = await supabase
    .from("subscriptions")
    .select("id, current_period_end")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (fetchError || !subscription) {
    throw new Error("No active subscription found for user");
  }

  const currentEnd = new Date(subscription.current_period_end);
  const newEnd = new Date(
    currentEnd.getTime() + additionalDays * 24 * 60 * 60 * 1000,
  );

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({ current_period_end: newEnd.toISOString() })
    .eq("id", subscription.id);

  if (updateError) {
    throw new Error(`Failed to extend subscription: ${updateError.message}`);
  }

  await supabase.from("subscription_admin_actions").insert({
    admin_id: adminId,
    user_id: userId,
    action: "extend",
    subscription_id: subscription.id,
    reason: reason ?? null,
    metadata: { additional_days: additionalDays, new_period_end: newEnd.toISOString() },
  });

  return { newPeriodEnd: newEnd.toISOString() };
}

export async function deactivateAccount(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (error) {
    throw new Error(`Failed to deactivate account: ${error.message}`);
  }
}

export async function getCancellationHistory(
  supabase: SupabaseClient,
  userId: string,
): Promise<CancellationEntry[]> {
  const { data, error } = await supabase
    .from("subscription_cancellations")
    .select("id, user_id, reason, canceled_at, admin_id")
    .eq("user_id", userId)
    .order("canceled_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch cancellation history: ${error.message}`);
  }

  return data ?? [];
}
