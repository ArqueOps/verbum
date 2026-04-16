import { createAdminClient } from "@/lib/supabase/admin";

interface ListUsersParams {
  search?: string;
  page?: number;
  pageSize?: number;
}

interface AdminUserRow {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  study_count: number;
  subscription_status: string;
  plan_interval: string | null;
  current_period_end: string | null;
  is_active: boolean;
}

interface ListUsersResult {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listUsers(
  params: ListUsersParams,
): Promise<{ data: ListUsersResult } | { error: string }> {
  const supabase = createAdminClient();
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  let profileQuery = supabase
    .from("profiles")
    .select("id, display_name, is_active, created_at, role", { count: "exact" });

  if (params.search) {
    profileQuery = profileQuery.ilike("display_name", `%${params.search}%`);
  }

  profileQuery = profileQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const { data: profiles, count: totalCount, error: profileError } =
    await profileQuery;

  if (profileError) {
    return { error: profileError.message };
  }

  if (!profiles || profiles.length === 0) {
    if (params.search) {
      const { data: authResult } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: pageSize,
      });

      const emailMatches = (authResult?.users ?? []).filter((u) =>
        u.email?.toLowerCase().includes(params.search!.toLowerCase()),
      );

      if (emailMatches.length === 0) {
        return { data: { users: [], total: 0, page, pageSize } };
      }

      const matchedIds = emailMatches.map((u) => u.id);
      const { data: matchedProfiles } = await supabase
        .from("profiles")
        .select("id, display_name, is_active, created_at, role")
        .in("id", matchedIds);

      return buildUserRows(
        supabase,
        matchedProfiles ?? [],
        emailMatches,
        emailMatches.length,
        page,
        pageSize,
      );
    }

    return { data: { users: [], total: 0, page, pageSize } };
  }

  const userIds = profiles.map((p) => p.id);

  const { data: authResult } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const authUsers = (authResult?.users ?? []).filter((u) =>
    userIds.includes(u.id),
  );

  return buildUserRows(
    supabase,
    profiles,
    authUsers,
    totalCount ?? profiles.length,
    page,
    pageSize,
  );
}

async function buildUserRows(
  supabase: ReturnType<typeof createAdminClient>,
  profiles: Array<{
    id: string;
    display_name: string | null;
    is_active: boolean;
    created_at: string;
    role: string;
  }>,
  authUsers: Array<{
    id: string;
    email?: string;
    last_sign_in_at?: string;
    created_at?: string;
  }>,
  total: number,
  page: number,
  pageSize: number,
): Promise<{ data: ListUsersResult }> {
  const userIds = profiles.map((p) => p.id);

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("user_id, status, plan_interval, current_period_end")
    .in("user_id", userIds)
    .in("status", ["active", "past_due"]);

  const subMap = new Map(
    (subscriptions ?? []).map((s) => [s.user_id, s]),
  );

  const { data: studies } = await supabase
    .from("studies")
    .select("owner_id")
    .in("owner_id", userIds);

  const studyCountMap = new Map<string, number>();
  for (const s of studies ?? []) {
    studyCountMap.set(s.owner_id, (studyCountMap.get(s.owner_id) ?? 0) + 1);
  }

  const authMap = new Map(authUsers.map((u) => [u.id, u]));
  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  const users: AdminUserRow[] = userIds.map((uid) => {
    const authUser = authMap.get(uid);
    const profile = profileMap.get(uid)!;
    const sub = subMap.get(uid);

    return {
      id: uid,
      email: authUser?.email ?? null,
      display_name: profile.display_name,
      created_at: profile.created_at,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      study_count: studyCountMap.get(uid) ?? 0,
      subscription_status: sub?.status ?? "free",
      plan_interval: sub?.plan_interval ?? null,
      current_period_end: sub?.current_period_end ?? null,
      is_active: profile.is_active,
    };
  });

  return { data: { users, total, page, pageSize } };
}

export async function grantSubscription(
  userId: string,
  adminId: string,
  planInterval: "monthly" | "annual",
  periodMonths: number,
): Promise<{ success: true } | { error: string }> {
  const supabase = createAdminClient();

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "active",
        plan_interval: planInterval,
        plan_id: `admin_${planInterval}`,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd.toISOString(),
        canceled_at: null,
        cancellation_reason: null,
      })
      .eq("id", existing.id);

    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("subscriptions").insert({
      user_id: userId,
      status: "active",
      plan_id: `admin_${planInterval}`,
      plan_interval: planInterval,
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
    });

    if (error) return { error: error.message };
  }

  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "premium" })
    .eq("id", userId);

  if (roleError) return { error: roleError.message };

  const { error: logError } = await supabase
    .from("subscription_admin_actions")
    .insert({
      user_id: userId,
      admin_id: adminId,
      action_type: "grant",
      metadata: { plan_interval: planInterval, period_months: periodMonths },
    });

  if (logError) return { error: logError.message };

  return { success: true };
}

export async function revokeSubscription(
  userId: string,
  adminId: string,
  reason: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active", "past_due"])
    .limit(1)
    .maybeSingle();

  if (!subscription) {
    return { error: "Nenhuma assinatura ativa encontrada" };
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      cancellation_reason: reason,
    })
    .eq("id", subscription.id);

  if (error) return { error: error.message };

  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "free" })
    .eq("id", userId);

  if (roleError) return { error: roleError.message };

  const { error: logError } = await supabase
    .from("subscription_admin_actions")
    .insert({
      user_id: userId,
      admin_id: adminId,
      action_type: "revoke",
      reason,
    });

  if (logError) return { error: logError.message };

  return { success: true };
}

export async function extendSubscription(
  userId: string,
  adminId: string,
  days: number,
): Promise<{ success: true } | { error: string }> {
  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "past_due"])
    .limit(1)
    .maybeSingle();

  if (!subscription) {
    return { error: "Nenhuma assinatura ativa encontrada" };
  }

  const currentEnd = new Date(subscription.current_period_end);
  currentEnd.setDate(currentEnd.getDate() + days);

  const { error } = await supabase
    .from("subscriptions")
    .update({ current_period_end: currentEnd.toISOString() })
    .eq("id", subscription.id);

  if (error) return { error: error.message };

  const { error: logError } = await supabase
    .from("subscription_admin_actions")
    .insert({
      user_id: userId,
      admin_id: adminId,
      action_type: "extend",
      metadata: { extend_days: days },
    });

  if (logError) return { error: logError.message };

  return { success: true };
}

export async function deactivateAccount(
  userId: string,
): Promise<{ success: true } | { error: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", userId);

  if (error) return { error: error.message };

  return { success: true };
}

interface CancellationRecord {
  type: "admin_revoke" | "subscription_canceled";
  reason: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

export async function getCancellationHistory(
  userId: string,
): Promise<{ data: CancellationRecord[] } | { error: string }> {
  const supabase = createAdminClient();

  const { data: adminActions, error: actionsError } = await supabase
    .from("subscription_admin_actions")
    .select("id, action_type, reason, metadata, created_at")
    .eq("user_id", userId)
    .eq("action_type", "revoke")
    .order("created_at", { ascending: true });

  if (actionsError) return { error: actionsError.message };

  const { data: canceledSubs, error: subsError } = await supabase
    .from("subscriptions")
    .select("id, canceled_at, cancellation_reason, plan_id, plan_interval")
    .eq("user_id", userId)
    .not("canceled_at", "is", null)
    .order("canceled_at", { ascending: true });

  if (subsError) return { error: subsError.message };

  const records: CancellationRecord[] = [];

  for (const action of adminActions ?? []) {
    records.push({
      type: "admin_revoke",
      reason: action.reason,
      metadata: action.metadata as Record<string, unknown>,
      occurred_at: action.created_at,
    });
  }

  for (const sub of canceledSubs ?? []) {
    records.push({
      type: "subscription_canceled",
      reason: sub.cancellation_reason,
      metadata: {
        subscription_id: sub.id,
        plan_id: sub.plan_id,
        plan_interval: sub.plan_interval,
      },
      occurred_at: sub.canceled_at!,
    });
  }

  records.sort(
    (a, b) =>
      new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  return { data: records };
}
