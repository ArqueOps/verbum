import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminMetrics {
  totalUsers: number;
  totalStudies: number;
  totalPublishedStudies: number;
  activeSubscriptions: number;
  canceledSubscriptions: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface CancellationReason {
  reason: string;
  count: number;
}

export async function getAdminMetrics(
  supabase: SupabaseClient,
): Promise<AdminMetrics> {
  const [profiles, studies, publishedStudies, activeSubs, canceledSubs] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("studies")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("studies")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supabase
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("status", "canceled"),
    ]);

  return {
    totalUsers: profiles.count ?? 0,
    totalStudies: studies.count ?? 0,
    totalPublishedStudies: publishedStudies.count ?? 0,
    activeSubscriptions: activeSubs.count ?? 0,
    canceledSubscriptions: canceledSubs.count ?? 0,
  };
}

export async function getStudiesPerDay(
  supabase: SupabaseClient,
  days = 30,
): Promise<TimeSeriesPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("studies")
    .select("created_at")
    .gte("created_at", since.toISOString());

  if (error) throw error;

  const counts = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of data ?? []) {
    const day = row.created_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getSubscribersPerDay(
  supabase: SupabaseClient,
  days = 30,
): Promise<TimeSeriesPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("subscriptions")
    .select("created_at")
    .gte("created_at", since.toISOString());

  if (error) throw error;

  const counts = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }

  for (const row of data ?? []) {
    const day = row.created_at.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getCancellationReasons(
  supabase: SupabaseClient,
): Promise<CancellationReason[]> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("cancellation_reason")
    .eq("status", "canceled")
    .not("cancellation_reason", "is", null);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const reason = row.cancellation_reason as string;
    counts.set(reason, (counts.get(reason) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}
