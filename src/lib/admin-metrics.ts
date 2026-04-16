import { createAdminClient } from "@/lib/supabase/admin";

export interface AdminMetrics {
  totalStudies: number;
  totalSubscribers: number;
  mrr: number;
  arr: number;
  churnRate: number;
  topUsers: Array<{ displayName: string; count: number }>;
}

export interface StudiesPerDay {
  date: string;
  count: number;
}

export interface SubscribersPerDay {
  date: string;
  count: number;
}

export interface CancellationReason {
  reason: string;
  count: number;
  percentage: number;
}

const MONTHLY_PRICE = 19.9;
const ANNUAL_PRICE = 199;

function getDateFilter(period: "today" | "week" | "month"): string {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);

  if (period === "week") {
    now.setUTCDate(now.getUTCDate() - 7);
  } else if (period === "month") {
    now.setUTCDate(now.getUTCDate() - 30);
  }

  return now.toISOString();
}

export async function getAdminMetrics(
  period: "today" | "week" | "month" = "month",
): Promise<AdminMetrics> {
  const supabase = createAdminClient();
  const since = getDateFilter(period);

  const [studiesResult, subscribersResult, monthlyResult, annualResult, canceledResult, topUsersResult] =
    await Promise.all([
      supabase
        .from("studies")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),

      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),

      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("plan_id", "monthly"),

      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .eq("plan_id", "annual"),

      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .in("status", ["canceled", "expired"])
        .gte("updated_at", since),

      supabase
        .from("studies")
        .select("owner_id, profiles(display_name)")
        .gte("created_at", since),
    ]);

  const totalStudies = studiesResult.count ?? 0;
  const totalSubscribers = subscribersResult.count ?? 0;
  const monthlyCount = monthlyResult.count ?? 0;
  const annualCount = annualResult.count ?? 0;
  const canceledCount = canceledResult.count ?? 0;

  const mrr = monthlyCount * MONTHLY_PRICE + annualCount * (ANNUAL_PRICE / 12);
  const arr = mrr * 12;

  const totalAtStart = totalSubscribers + canceledCount;
  const churnRate = totalAtStart > 0 ? canceledCount / totalAtStart : 0;

  const userMap = new Map<string, { displayName: string; count: number }>();
  const rows = (topUsersResult.data ?? []) as unknown as Array<{
    owner_id: string;
    profiles: { display_name: string | null } | null;
  }>;
  for (const row of rows) {
    const key = row.owner_id;
    const existing = userMap.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      userMap.set(key, {
        displayName: row.profiles?.display_name ?? "Usuário",
        count: 1,
      });
    }
  }

  const topUsers = [...userMap.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalStudies, totalSubscribers, mrr, arr, churnRate, topUsers };
}

export async function getStudiesPerDay(
  days = 30,
): Promise<StudiesPerDay[]> {
  const supabase = createAdminClient();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days);

  const { data } = await supabase
    .from("studies")
    .select("created_at")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const dayMap = new Map<string, number>();
  for (const row of data ?? []) {
    const date = (row as { created_at: string }).created_at.slice(0, 10);
    dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
  }

  return [...dayMap.entries()].map(([date, count]) => ({ date, count }));
}

export async function getSubscribersPerDay(
  days = 30,
): Promise<SubscribersPerDay[]> {
  const supabase = createAdminClient();
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - days);

  const { data } = await supabase
    .from("subscriptions")
    .select("created_at")
    .eq("status", "active")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const dayMap = new Map<string, number>();
  for (const row of data ?? []) {
    const date = (row as { created_at: string }).created_at.slice(0, 10);
    dayMap.set(date, (dayMap.get(date) ?? 0) + 1);
  }

  return [...dayMap.entries()].map(([date, count]) => ({ date, count }));
}

export async function getCancellationReasons(): Promise<CancellationReason[]> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("webhook_events")
    .select("payload")
    .eq("event_type", "subscription.canceled");

  const reasonMap = new Map<string, number>();
  let total = 0;

  for (const row of data ?? []) {
    const payload = row as { payload: { cancellation_reason?: string } };
    const reason = payload.payload.cancellation_reason ?? "Não informado";
    reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
    total++;
  }

  if (total === 0) return [];

  return [...reasonMap.entries()]
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
