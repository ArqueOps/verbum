import { SupabaseClient } from "@supabase/supabase-js";

const FREE_TIER_DAILY_LIMIT = 1;

interface CanGenerateStudyResult {
  allowed: boolean;
  reason?: string;
}

interface SubscriptionRow {
  status: string;
  current_period_end: string;
}

export async function canGenerateStudy(
  supabase: SupabaseClient,
  userId: string,
): Promise<CanGenerateStudyResult> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single<SubscriptionRow>();

  const now = new Date();

  if (subscription) {
    const periodEnd = new Date(subscription.current_period_end);

    if (subscription.status === "active" && periodEnd > now) {
      return { allowed: true };
    }

    if (subscription.status === "canceled" && periodEnd > now) {
      return { allowed: true };
    }
  }

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("studies")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("created_at", todayStart.toISOString());

  const studiesCreatedToday = count ?? 0;

  if (studiesCreatedToday >= FREE_TIER_DAILY_LIMIT) {
    return {
      allowed: false,
      reason:
        "Você atingiu o limite diário de estudos gratuitos. Assine um plano para continuar gerando estudos.",
    };
  }

  return { allowed: true };
}
