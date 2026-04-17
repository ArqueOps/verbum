import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface AdminMetrics {
  totalUsers: number;
  freeUsers: number;
  monthlySubscribers: number;
  annualSubscribers: number;
  activeSubscribersMonthly: number;
  activeSubscribersAnnual: number;
  mrr: number;
  arr: number;
  churnRate: number;
  studiesToday: number;
  studiesThisWeek: number;
  studiesThisMonth: number;
  publishedStudies: number;
}

export interface DailyStudyCount {
  date: string;
  count: number;
}

export interface DailySubscriberCount {
  date: string;
  count: number;
}

export interface CancellationReason {
  reason: string;
  count: number;
}

export interface TopUserByStudies {
  userId: string;
  displayName: string;
  studyCount: number;
}

function startOfDay(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function thirtyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const supabase = await createServerSupabaseClient();

  const [profilesResult, studiesResult, subscriptionsResult] =
    await Promise.all([
      supabase.from("profiles").select("id, role"),
      supabase.from("studies").select("id, created_at, is_published"),
      supabase
        .from("subscriptions")
        .select("id, plan_id, status, canceled_at"),
    ]);

  const profiles = profilesResult.data ?? [];
  const studies = studiesResult.data ?? [];
  const subscriptions = subscriptionsResult.data ?? [];

  const totalUsers = profiles.length;
  const freeUsers = profiles.filter(
    (p) => p.role === "free" || !p.role
  ).length;

  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active"
  );
  const monthlySubscribers = activeSubscriptions.filter((s) =>
    s.plan_id?.includes("monthly")
  ).length;
  const annualSubscribers = activeSubscriptions.filter((s) =>
    s.plan_id?.includes("annual")
  ).length;

  const monthlyPrice = 29.9;
  const annualMonthlyEquivalent = 24.9;
  const mrr =
    monthlySubscribers * monthlyPrice +
    annualSubscribers * annualMonthlyEquivalent;
  const arr = mrr * 12;

  const canceledCount = subscriptions.filter((s) => s.canceled_at).length;
  const totalEverActive = subscriptions.length;
  const churnRate =
    totalEverActive > 0
      ? Math.round((canceledCount / totalEverActive) * 100 * 10) / 10
      : 0;

  const todayStart = startOfDay();
  const weekStart = startOfWeek();
  const monthStart = startOfMonth();

  const studiesToday = studies.filter(
    (s) => s.created_at >= todayStart
  ).length;
  const studiesThisWeek = studies.filter(
    (s) => s.created_at >= weekStart
  ).length;
  const studiesThisMonth = studies.filter(
    (s) => s.created_at >= monthStart
  ).length;
  const publishedStudies = studies.filter((s) => s.is_published).length;

  return {
    totalUsers,
    freeUsers,
    monthlySubscribers,
    annualSubscribers,
    activeSubscribersMonthly: monthlySubscribers,
    activeSubscribersAnnual: annualSubscribers,
    mrr,
    arr,
    churnRate,
    studiesToday,
    studiesThisWeek,
    studiesThisMonth,
    publishedStudies,
  };
}

export async function getStudiesPerDay(): Promise<DailyStudyCount[]> {
  const supabase = await createServerSupabaseClient();
  const since = thirtyDaysAgo();

  const { data: studies } = await supabase
    .from("studies")
    .select("created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const countsByDate = new Map<string, number>();
  const start = new Date(since);
  const today = new Date();
  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    countsByDate.set(d.toISOString().slice(0, 10), 0);
  }

  for (const study of studies ?? []) {
    const dateKey = study.created_at.slice(0, 10);
    countsByDate.set(dateKey, (countsByDate.get(dateKey) ?? 0) + 1);
  }

  return Array.from(countsByDate.entries()).map(([date, count]) => ({
    date,
    count,
  }));
}

export async function getSubscribersPerDay(): Promise<DailySubscriberCount[]> {
  const supabase = await createServerSupabaseClient();
  const since = thirtyDaysAgo();

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("created_at, status, canceled_at")
    .order("created_at", { ascending: true });

  const allSubs = subscriptions ?? [];
  const result: DailySubscriberCount[] = [];
  const start = new Date(since);
  const today = new Date();

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const activeThatDay = allSubs.filter((s) => {
      const createdDate = s.created_at.slice(0, 10);
      if (createdDate > dateStr) return false;
      if (s.canceled_at && s.canceled_at.slice(0, 10) <= dateStr) return false;
      return true;
    });
    result.push({ date: dateStr, count: activeThatDay.length });
  }

  return result;
}

export async function getCancellationReasons(): Promise<CancellationReason[]> {
  const supabase = await createServerSupabaseClient();
  const since = thirtyDaysAgo();

  const { data: canceled } = await supabase
    .from("subscriptions")
    .select("plan_id, canceled_at")
    .not("canceled_at", "is", null)
    .gte("canceled_at", since);

  if (!canceled || canceled.length === 0) {
    return [{ reason: "Sem cancelamentos no período", count: 0 }];
  }

  const reasonCounts = new Map<string, number>();
  for (const sub of canceled) {
    const reason = sub.plan_id
      ? `Plano ${sub.plan_id}`
      : "Motivo não informado";
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }

  return Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

export async function getTopUsersByStudies(): Promise<TopUserByStudies[]> {
  const supabase = await createServerSupabaseClient();
  const since = thirtyDaysAgo();

  const { data: studies } = await supabase
    .from("studies")
    .select("owner_id")
    .gte("created_at", since);

  if (!studies || studies.length === 0) return [];

  const countsByUser = new Map<string, number>();
  for (const study of studies) {
    if (!study.owner_id) continue;
    countsByUser.set(
      study.owner_id,
      (countsByUser.get(study.owner_id) ?? 0) + 1
    );
  }

  const sorted = Array.from(countsByUser.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  if (sorted.length === 0) return [];

  const userIds = sorted.map(([id]) => id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name ?? "Usuário anônimo"])
  );

  return sorted.map(([userId, studyCount]) => ({
    userId,
    displayName: profileMap.get(userId) ?? "Usuário anônimo",
    studyCount,
  }));
}
