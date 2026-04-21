import { createServerSupabaseClient } from "@/lib/supabase/server";

export interface CanGenerateStudyResult {
  allowed: boolean;
  reason?: string;
}

const DAILY_LIMIT_REASON =
  "Limite diário atingido. Assine para gerar estudos ilimitados.";

export async function canGenerateStudy(
  userId: string,
): Promise<CanGenerateStudyResult> {
  const supabase = await createServerSupabaseClient();
  const nowIso = new Date().toISOString();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "canceled"])
    .gt("current_period_end", nowIso)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subscription) {
    return { allowed: true };
  }

  const startOfDayUtc = new Date();
  startOfDayUtc.setUTCHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("studies")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("created_at", startOfDayUtc.toISOString());

  if ((count ?? 0) >= 1) {
    return { allowed: false, reason: DAILY_LIMIT_REASON };
  }

  return { allowed: true };
}

export interface ActiveSubscription {
  id: string;
  caramelou_subscription_id: string | null;
  plan_id: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
}

export async function getActiveSubscription(
  userId: string,
): Promise<ActiveSubscription | null> {
  const supabase = await createServerSupabaseClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("id, caramelou_subscription_id, plan_id, status, current_period_start, current_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "past_due"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
