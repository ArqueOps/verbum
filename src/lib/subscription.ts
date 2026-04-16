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
    .in("status", ["active", "cancelled"])
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
