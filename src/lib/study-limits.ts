import { SupabaseClient } from "@supabase/supabase-js";

export interface StudyGenerationResult {
  allowed: boolean;
  reason?: string;
}

const FREE_TIER_DAILY_LIMIT = 1;

export async function canGenerateStudy(
  supabase: SupabaseClient,
  userId: string,
): Promise<StudyGenerationResult> {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .gt("current_period_end", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (subscription) {
    return { allowed: true };
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("studies")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayStart.toISOString());

  if ((count ?? 0) >= FREE_TIER_DAILY_LIMIT) {
    return { allowed: false, reason: "DAILY_LIMIT_REACHED" };
  }

  return { allowed: true };
}
