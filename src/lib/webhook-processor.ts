import type { SupabaseClient } from "@supabase/supabase-js";

export type WebhookEventType =
  | "subscription.created"
  | "subscription.renewed"
  | "subscription.updated"
  | "subscription.cancelled"
  | "subscription.ended"
  | "sale_success_credit";

export interface WebhookPayload {
  event_id: string;
  event_type: string;
  customer_email: string;
  frequency_type?: "monthly" | "annual";
  next_charge_at?: string;
  [key: string]: unknown;
}

export interface ProcessingResult {
  action: "created" | "updated" | "skipped" | "no_op";
  reason?: string;
}

const PLAN_MAP: Record<string, string> = {
  monthly: "plan_monthly",
  annual: "plan_annual",
};

function mapFrequencyToPlanId(frequencyType?: string): string | null {
  if (!frequencyType) return null;
  return PLAN_MAP[frequencyType] ?? null;
}

export async function processWebhookEvent(
  supabase: SupabaseClient,
  payload: WebhookPayload
): Promise<ProcessingResult> {
  const { event_id, event_type, customer_email } = payload;

  const { data: existingEvent } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("event_id", event_id)
    .single();

  if (existingEvent) {
    return { action: "skipped", reason: "duplicate_event" };
  }

  const {
    data: { users },
  } = await supabase.auth.admin.listUsers();

  const user = users?.find((u) => u.email === customer_email);

  if (!user) {
    await supabase.from("webhook_events").insert({
      event_id,
      event_type,
      user_id: null,
      payload,
    });
    return { action: "skipped", reason: "user_not_found" };
  }

  await supabase.from("webhook_events").insert({
    event_id,
    event_type,
    user_id: user.id,
    payload,
  });

  switch (event_type as WebhookEventType) {
    case "subscription.created": {
      const planId = mapFrequencyToPlanId(payload.frequency_type);
      await supabase.from("subscriptions").upsert(
        {
          user_id: user.id,
          status: "active",
          plan_id: planId,
          current_period_start: new Date().toISOString(),
          current_period_end: payload.next_charge_at ?? null,
        },
        { onConflict: "user_id" }
      );
      return { action: "created" };
    }

    case "subscription.renewed": {
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: payload.next_charge_at ?? null,
        })
        .eq("user_id", user.id);
      return { action: "updated" };
    }

    case "subscription.updated": {
      const planId = mapFrequencyToPlanId(payload.frequency_type);
      const updates: Record<string, unknown> = {};
      if (planId) updates.plan_id = planId;
      if (payload.next_charge_at)
        updates.current_period_end = payload.next_charge_at;

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("subscriptions")
          .update(updates)
          .eq("user_id", user.id);
      }
      return { action: "updated" };
    }

    case "subscription.cancelled": {
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("user_id", user.id);
      return { action: "updated" };
    }

    case "subscription.ended": {
      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("user_id", user.id);
      return { action: "updated" };
    }

    case "sale_success_credit":
      return { action: "no_op", reason: "credit_event" };

    default:
      return { action: "no_op", reason: "unknown_event_type" };
  }
}
