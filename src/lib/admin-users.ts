import { createAdminClient } from "@/lib/supabase/admin";

export type AdminUserRow = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
  study_count: number;
  plan_label: string;
  plan_interval: "monthly" | "annual" | null;
  subscription_end: string | null;
  subscription_status: "active" | "past_due" | "canceled" | "expired" | null;
  last_sign_in_at: string | null;
  is_active: boolean;
};

export type ListUsersResult = {
  users: AdminUserRow[];
  total: number;
};

export type CancellationEntry = {
  id: string;
  reason: string | null;
  canceled_at: string;
  canceled_by: string | null;
  action_type: string | null;
};

export async function listUsers(params: {
  search?: string;
  page: number;
  perPage: number;
}): Promise<ListUsersResult> {
  const supabase = createAdminClient();
  const { search, page, perPage } = params;
  const offset = (page - 1) * perPage;

  const { data: authUsers, error: authError } = await supabase
    .schema("auth" as never)
    .from("users")
    .select("id, email, last_sign_in_at", { count: "exact" })
    .order("created_at", { ascending: false }) as { data: { id: string; email: string; last_sign_in_at: string | null }[] | null; error: unknown; count: number | null };

  if (authError || !authUsers) {
    return { users: [], total: 0 };
  }

  let profileQuery = supabase
    .from("profiles")
    .select("id, display_name, created_at, role", { count: "exact" });

  if (search) {
    const term = `%${search}%`;
    profileQuery = profileQuery.or(`display_name.ilike.${term}`);
  }

  const { data: profiles, count: totalCount, error: profileError } = await profileQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (profileError || !profiles) {
    return { users: [], total: 0 };
  }

  const userIds = profiles.map((p: { id: string }) => p.id);

  if (userIds.length === 0) {
    return { users: [], total: totalCount ?? 0 };
  }

  const [studyCounts, subscriptions, filteredAuthUsers] = await Promise.all([
    supabase
      .from("studies")
      .select("owner_id")
      .in("owner_id", userIds),
    supabase
      .from("subscriptions")
      .select("user_id, status, plan_id, plan_interval, current_period_end")
      .in("user_id", userIds),
    Promise.resolve(
      authUsers.filter((u: { id: string }) => userIds.includes(u.id))
    ),
  ]);

  const studyCountMap = new Map<string, number>();
  if (studyCounts.data) {
    for (const s of studyCounts.data) {
      const ownerId = (s as { owner_id: string }).owner_id;
      studyCountMap.set(ownerId, (studyCountMap.get(ownerId) ?? 0) + 1);
    }
  }

  const subscriptionMap = new Map<string, {
    status: "active" | "past_due" | "canceled" | "expired";
    plan_id: string;
    plan_interval: "monthly" | "annual" | null;
    current_period_end: string | null;
  }>();
  if (subscriptions.data) {
    for (const sub of subscriptions.data) {
      const s = sub as { user_id: string; status: "active" | "past_due" | "canceled" | "expired"; plan_id: string; plan_interval: "monthly" | "annual" | null; current_period_end: string | null };
      subscriptionMap.set(s.user_id, s);
    }
  }

  const authMap = new Map<string, { email: string; last_sign_in_at: string | null }>();
  for (const u of filteredAuthUsers) {
    authMap.set(u.id, { email: u.email, last_sign_in_at: u.last_sign_in_at });
  }

  let emailFilteredIds: Set<string> | null = null;
  if (search) {
    const term = search.toLowerCase();
    emailFilteredIds = new Set<string>();
    for (const u of authUsers) {
      if (u.email?.toLowerCase().includes(term)) {
        emailFilteredIds.add(u.id);
      }
    }
  }

  const users: AdminUserRow[] = profiles.map((p: { id: string; display_name: string | null; created_at: string; role: string }) => {
    const auth = authMap.get(p.id);
    const sub = subscriptionMap.get(p.id);

    let planLabel = "Free";
    if (sub?.status === "active") {
      planLabel = sub.plan_interval === "annual" ? "Anual" : "Mensal";
    }

    return {
      id: p.id,
      email: auth?.email ?? "",
      display_name: p.display_name,
      created_at: p.created_at,
      study_count: studyCountMap.get(p.id) ?? 0,
      plan_label: planLabel,
      plan_interval: sub?.plan_interval ?? null,
      subscription_end: sub?.current_period_end ?? null,
      subscription_status: sub?.status ?? null,
      last_sign_in_at: auth?.last_sign_in_at ?? null,
      is_active: p.role !== "admin",
    };
  });

  if (search && emailFilteredIds) {
    const profileIds = new Set(profiles.map((p: { id: string }) => p.id));
    const emailOnlyUsers: AdminUserRow[] = [];

    for (const uid of emailFilteredIds) {
      if (!profileIds.has(uid)) {
        const authUser = authUsers.find((u: { id: string }) => u.id === uid);
        if (authUser) {
          const { data: extraProfile } = await supabase
            .from("profiles")
            .select("id, display_name, created_at, role")
            .eq("id", uid)
            .maybeSingle();

          if (extraProfile) {
            const sub = subscriptionMap.get(uid);
            let planLabel = "Free";
            if (sub?.status === "active") {
              planLabel = sub.plan_interval === "annual" ? "Anual" : "Mensal";
            }
            emailOnlyUsers.push({
              id: uid,
              email: authUser.email,
              display_name: (extraProfile as { display_name: string | null }).display_name,
              created_at: (extraProfile as { created_at: string }).created_at,
              study_count: studyCountMap.get(uid) ?? 0,
              plan_label: planLabel,
              plan_interval: sub?.plan_interval ?? null,
              subscription_end: sub?.current_period_end ?? null,
              subscription_status: sub?.status ?? null,
              last_sign_in_at: authUser.last_sign_in_at,
              is_active: true,
            });
          }
        }
      }
    }

    return {
      users: [...users, ...emailOnlyUsers],
      total: (totalCount ?? 0) + emailOnlyUsers.length,
    };
  }

  return { users, total: totalCount ?? 0 };
}

export async function grantSubscription(params: {
  userId: string;
  planInterval: "monthly" | "annual";
  periodMonths: number;
  performedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { userId, planInterval, periodMonths, performedBy } = params;

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", userId)
    .in("status", ["active"])
    .maybeSingle();

  if (existing) {
    return { success: false, error: "Usuário já possui assinatura ativa." };
  }

  const now = new Date();
  const end = new Date(now);
  end.setMonth(end.getMonth() + periodMonths);

  const { data: subscription, error: subError } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      status: "active" as const,
      plan_id: planInterval,
      plan_interval: planInterval,
      current_period_start: now.toISOString(),
      current_period_end: end.toISOString(),
    }, { onConflict: "user_id" })
    .select("id")
    .single();

  if (subError) {
    return { success: false, error: `Erro ao criar assinatura: ${subError.message}` };
  }

  await supabase.from("subscription_admin_actions").insert({
    subscription_id: subscription?.id ?? null,
    user_id: userId,
    action_type: "grant" as const,
    plan_interval: planInterval,
    period_months: periodMonths,
    performed_by: performedBy,
  });

  await supabase
    .from("user_credits")
    .upsert({
      user_id: userId,
      has_active_subscription: true,
      subscription_end: end.toISOString(),
    }, { onConflict: "user_id" });

  return { success: true };
}

export async function revokeSubscription(params: {
  userId: string;
  reason: string;
  performedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { userId, reason, performedBy } = params;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .in("status", ["active"])
    .maybeSingle();

  if (!subscription) {
    return { success: false, error: "Nenhuma assinatura ativa encontrada." };
  }

  const now = new Date().toISOString();

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled" as const,
      canceled_at: now,
      cancellation_reason: reason,
    })
    .eq("id", subscription.id);

  await supabase.from("subscription_admin_actions").insert({
    subscription_id: subscription.id,
    user_id: userId,
    action_type: "revoke" as const,
    reason,
    performed_by: performedBy,
  });

  await supabase.from("subscription_cancellations").insert({
    user_id: userId,
    subscription_id: subscription.id,
    reason,
    canceled_at: now,
    canceled_by: performedBy,
    action_type: "admin_revoke",
  });

  await supabase
    .from("user_credits")
    .update({
      has_active_subscription: false,
      subscription_end: null,
    })
    .eq("user_id", userId);

  return { success: true };
}

export async function extendSubscription(params: {
  userId: string;
  days: number;
  performedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { userId, days, performedBy } = params;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active"])
    .maybeSingle();

  if (!subscription) {
    return { success: false, error: "Nenhuma assinatura ativa encontrada." };
  }

  const currentEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : new Date();
  currentEnd.setDate(currentEnd.getDate() + days);

  await supabase
    .from("subscriptions")
    .update({ current_period_end: currentEnd.toISOString() })
    .eq("id", subscription.id);

  await supabase.from("subscription_admin_actions").insert({
    subscription_id: subscription.id,
    user_id: userId,
    action_type: "extend" as const,
    extend_days: days,
    performed_by: performedBy,
  });

  await supabase
    .from("user_credits")
    .update({ subscription_end: currentEnd.toISOString() })
    .eq("user_id", userId);

  return { success: true };
}

export async function deactivateAccount(params: {
  userId: string;
  performedBy: string;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { userId, performedBy } = params;

  const { error } = await supabase
    .from("profiles")
    .update({ role: "free" as const })
    .eq("id", userId);

  if (error) {
    return { success: false, error: `Erro ao desativar conta: ${error.message}` };
  }

  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: "876000h",
  });

  if (authError) {
    return { success: false, error: `Erro ao banir usuário: ${authError.message}` };
  }

  await supabase.from("subscription_admin_actions").insert({
    user_id: userId,
    action_type: "revoke" as const,
    reason: "Conta desativada pelo administrador",
    performed_by: performedBy,
  });

  return { success: true };
}

export async function getCancellationHistory(
  userId: string,
): Promise<CancellationEntry[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("subscription_cancellations")
    .select("id, reason, canceled_at, canceled_by, action_type")
    .eq("user_id", userId)
    .order("canceled_at", { ascending: false });

  if (!data) return [];

  return data as CancellationEntry[];
}
