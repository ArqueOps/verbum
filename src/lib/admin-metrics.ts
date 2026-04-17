import { createAdminClient } from "@/lib/supabase/admin";

const MONTHLY_PRICE_CENTS = 1990;
const ANNUAL_PRICE_CENTS = 19900;

export interface UsersByRole {
  free: number;
  premium: number;
  admin: number;
}

export interface SubscribersByInterval {
  monthly: number;
  annual: number;
}

export interface StudiesGenerated {
  today: number;
  thisWeek: number;
  thisMonth: number;
}

export interface TopUser {
  userId: string;
  displayName: string | null;
  studyCount: number;
}

export interface CancellationsByReason {
  reason: string;
  count: number;
}

export interface AdminMetrics {
  totalUsers: number;
  usersByRole: UsersByRole;
  subscribersByInterval: SubscribersByInterval;
  mrr: number;
  arr: number;
  studiesGenerated: StudiesGenerated;
  totalPublishedStudies: number;
  topUsersByStudies: TopUser[];
  cancellationsLast30d: number;
  cancellationsByReason: CancellationsByReason[];
  churnRate: number;
}

export interface DailyCount {
  date: string;
  count: number;
}

interface SubscriptionRow {
  id: string;
  status: string;
  plan_interval: string | null;
  canceled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

function startOfDay(date: Date): string {
  return date.toISOString().split("T")[0] + "T00:00:00.000Z";
}

function startOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return startOfDay(d);
}

function startOfMonth(date: Date): string {
  const d = new Date(date);
  d.setUTCDate(1);
  return startOfDay(d);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return startOfDay(d);
}

function dateKey(iso: string): string {
  return iso.split("T")[0] ?? iso;
}

function groupByDate(
  rows: { created_at: string }[],
  days: number,
): DailyCount[] {
  const counts = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    counts.set(dateKey(d.toISOString()), 0);
  }
  for (const row of rows) {
    const key = dateKey(row.created_at);
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

export async function getAdminMetrics(): Promise<AdminMetrics> {
  const supabase = createAdminClient();
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const thirtyDaysAgo = daysAgo(30);

  const [
    profilesRes,
    , // total studies count (used by positional destructuring)
    studiesTodayRes,
    studiesWeekRes,
    studiesMonthRes,
    publishedRes,
    subscriptionsRes,
    recentStudiesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id, role"),
    supabase.from("studies").select("id", { count: "exact", head: true }),
    supabase
      .from("studies")
      .select("id", { count: "exact", head: true })
      .gte("created_at", todayStart),
    supabase
      .from("studies")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart),
    supabase
      .from("studies")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("studies")
      .select("id", { count: "exact", head: true })
      .eq("is_published", true),
    supabase
      .from("subscriptions")
      .select("id, status, plan_interval, canceled_at, cancellation_reason, created_at") as unknown as {
        data: SubscriptionRow[] | null;
        error: { message: string } | null;
      },
    supabase
      .from("studies")
      .select("owner_id")
      .gte("created_at", thirtyDaysAgo),
  ]);

  const profiles = profilesRes.data ?? [];
  const usersByRole: UsersByRole = { free: 0, premium: 0, admin: 0 };
  for (const p of profiles) {
    const role = p.role as keyof UsersByRole;
    if (role in usersByRole) {
      usersByRole[role]++;
    }
  }

  const subscriptions = subscriptionsRes.data ?? [];
  const activeSubscriptions = subscriptions.filter(
    (s) => s.status === "active" || s.status === "past_due",
  );

  const subscribersByInterval: SubscribersByInterval = { monthly: 0, annual: 0 };
  for (const s of activeSubscriptions) {
    if (s.plan_interval === "annual") {
      subscribersByInterval.annual++;
    } else {
      subscribersByInterval.monthly++;
    }
  }

  const mrr =
    (subscribersByInterval.monthly * MONTHLY_PRICE_CENTS) / 100 +
    (subscribersByInterval.annual * ANNUAL_PRICE_CENTS) / 100 / 12;
  const arr = mrr * 12;

  const recentCancellations = subscriptions.filter(
    (s) => s.canceled_at && s.canceled_at >= thirtyDaysAgo,
  );

  const reasonCounts = new Map<string, number>();
  for (const s of recentCancellations) {
    const reason = s.cancellation_reason ?? "Não informado";
    reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
  }
  const cancellationsByReason = Array.from(reasonCounts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const totalActiveAtPeriodStart = subscriptions.filter(
    (s) =>
      s.created_at < thirtyDaysAgo &&
      (s.status === "active" || s.status === "past_due" || s.canceled_at !== null),
  ).length;

  const churnRate =
    totalActiveAtPeriodStart > 0
      ? recentCancellations.length / totalActiveAtPeriodStart
      : 0;

  const studyOwnerCounts = new Map<string, number>();
  for (const s of recentStudiesRes.data ?? []) {
    if (s.owner_id) {
      studyOwnerCounts.set(
        s.owner_id,
        (studyOwnerCounts.get(s.owner_id) ?? 0) + 1,
      );
    }
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const topUsersByStudies = Array.from(studyOwnerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, studyCount]) => ({
      userId,
      displayName: (profileMap.get(userId) as { display_name?: string | null })?.display_name ?? null,
      studyCount,
    }));

  return {
    totalUsers: profiles.length,
    usersByRole,
    subscribersByInterval,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(arr * 100) / 100,
    studiesGenerated: {
      today: studiesTodayRes.count ?? 0,
      thisWeek: studiesWeekRes.count ?? 0,
      thisMonth: studiesMonthRes.count ?? 0,
    },
    totalPublishedStudies: publishedRes.count ?? 0,
    topUsersByStudies,
    cancellationsLast30d: recentCancellations.length,
    cancellationsByReason,
    churnRate: Math.round(churnRate * 10000) / 10000,
  };
}

export async function getStudiesPerDay(): Promise<DailyCount[]> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = daysAgo(30);

  const { data } = await supabase
    .from("studies")
    .select("created_at")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: true });

  return groupByDate(data ?? [], 30);
}

export async function getSubscribersPerDay(): Promise<DailyCount[]> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = daysAgo(30);

  const { data } = await supabase
    .from("subscriptions")
    .select("created_at")
    .in("status", ["active", "past_due"])
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: true });

  return groupByDate(data ?? [], 30);
}

export async function getCancellationReasons(): Promise<CancellationsByReason[]> {
  const supabase = createAdminClient();
  const thirtyDaysAgo = daysAgo(30);

  const { data } = (await supabase
    .from("subscriptions")
    .select("cancellation_reason")
    .not("canceled_at", "is", null)
    .gte("canceled_at", thirtyDaysAgo)) as unknown as {
    data: { cancellation_reason: string | null }[] | null;
    error: { message: string } | null;
  };

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const reason = row.cancellation_reason ?? "Não informado";
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}
