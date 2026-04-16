import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookApiKeyHash } from "@/lib/webhook-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CaramelouCustomer = {
  email?: string;
  name?: string;
};

type CaramelouPayload = {
  event: string;
  subscription_id?: string;
  customer?: CaramelouCustomer;
  frequency_type?: string;
  next_charge_at?: string;
  current_period_start?: string;
  created_at?: string;
};

type SubscriptionUpdate = {
  status?: "active" | "past_due" | "canceled" | "expired";
  plan_id?: string;
  current_period_start?: string;
  current_period_end?: string | null;
  caramelou_subscription_id?: string;
};

const RECURRING_EVENTS = new Set([
  "subscription_charge_succeeded",
  "subscription_charge_failed",
]);

export async function POST(request: NextRequest) {
  const apiKeyHash = request.headers.get("x-api-key-hash");

  if (!verifyWebhookApiKeyHash(apiKeyHash, process.env.CARAMELOU_API_KEY)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: CaramelouPayload;
  try {
    payload = (await request.json()) as CaramelouPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.event) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const eventId = buildEventId(payload);
    if (!eventId) {
      console.warn("[caramelou-webhook] cannot derive event_id, skipping");
      return NextResponse.json({ received: true });
    }

    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("event_id", eventId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const userId = await resolveUserIdFromEmail(supabase, payload.customer?.email);

    await handleEvent(supabase, payload, userId);

    await supabase.from("webhook_events").insert({
      event_id: eventId,
      event_type: payload.event,
      user_id: userId,
      payload: payload as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[caramelou-webhook] processing error:", error);
    return NextResponse.json({ received: true });
  }
}

function buildEventId(payload: CaramelouPayload): string | null {
  if (!payload.subscription_id) return null;

  const base = `${payload.subscription_id}_${payload.event}`;

  if (RECURRING_EVENTS.has(payload.event)) {
    const cycleKey =
      payload.next_charge_at ??
      payload.current_period_start ??
      payload.created_at;
    if (cycleKey) return `${base}_${cycleKey}`;
  }

  return base;
}

async function resolveUserIdFromEmail(
  supabase: SupabaseClient,
  email: string | undefined,
): Promise<string | null> {
  if (!email) return null;

  const { data, error } = await supabase
    .schema("auth" as never)
    .from("users")
    .select("id")
    .eq("email", email)
    .maybeSingle<{ id: string }>();

  if (error) {
    console.warn(
      `[caramelou-webhook] failed to lookup user by email ${email}: ${error.message}`,
    );
    return null;
  }

  return data?.id ?? null;
}

async function handleEvent(
  supabase: SupabaseClient,
  payload: CaramelouPayload,
  userId: string | null,
): Promise<void> {
  const { event } = payload;

  if (event === "sale_success_credit") {
    console.log("[caramelou-webhook] sale_success_credit not applicable for Verbum");
    return;
  }

  if (!userId) {
    console.warn(
      `[caramelou-webhook] no user found for email ${payload.customer?.email ?? "unknown"}, event=${event}`,
    );
    return;
  }

  switch (event) {
    case "subscription_created": {
      await upsertSubscription(supabase, userId, {
        status: "active",
        plan_id: payload.frequency_type ?? "monthly",
        current_period_start: payload.current_period_start ?? new Date().toISOString(),
        current_period_end: payload.next_charge_at ?? null,
        caramelou_subscription_id: payload.subscription_id,
      });
      return;
    }

    case "subscription_charge_succeeded": {
      await updateSubscription(supabase, userId, payload.subscription_id, {
        status: "active",
        current_period_end: payload.next_charge_at ?? null,
      });
      return;
    }

    case "subscription_charge_failed": {
      await updateSubscription(supabase, userId, payload.subscription_id, {
        status: "past_due",
      });
      return;
    }

    case "subscription_cancellation_scheduled": {
      console.log(
        `[caramelou-webhook] cancellation scheduled for user ${userId}, subscription ${payload.subscription_id ?? "unknown"}`,
      );
      return;
    }

    case "subscription_canceled": {
      await updateSubscription(supabase, userId, payload.subscription_id, {
        status: "canceled",
      });
      return;
    }

    case "subscription_completed": {
      await updateSubscription(supabase, userId, payload.subscription_id, {
        status: "expired",
      });
      return;
    }

    case "subscription_upgraded":
    case "subscription_downgraded": {
      const update: SubscriptionUpdate = {};
      if (payload.frequency_type) update.plan_id = payload.frequency_type;
      if (payload.next_charge_at) update.current_period_end = payload.next_charge_at;
      if (Object.keys(update).length === 0) return;
      await updateSubscription(supabase, userId, payload.subscription_id, update);
      return;
    }

    default: {
      console.log(`[caramelou-webhook] unhandled event: ${event}`);
      return;
    }
  }
}

async function upsertSubscription(
  supabase: SupabaseClient,
  userId: string,
  update: SubscriptionUpdate,
): Promise<void> {
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("subscriptions")
      .update(update)
      .eq("user_id", userId);
    if (error) {
      console.error(
        `[caramelou-webhook] failed to update subscription for user ${userId}: ${error.message}`,
      );
    }
    return;
  }

  const { error } = await supabase
    .from("subscriptions")
    .insert({ user_id: userId, ...update });
  if (error) {
    console.error(
      `[caramelou-webhook] failed to insert subscription for user ${userId}: ${error.message}`,
    );
  }
}

async function updateSubscription(
  supabase: SupabaseClient,
  userId: string,
  caramelouSubscriptionId: string | undefined,
  update: SubscriptionUpdate,
): Promise<void> {
  let query = supabase.from("subscriptions").update(update).eq("user_id", userId);

  if (caramelouSubscriptionId) {
    query = query.eq("caramelou_subscription_id", caramelouSubscriptionId);
  }

  const { error } = await query;
  if (error) {
    console.error(
      `[caramelou-webhook] failed to update subscription for user ${userId}: ${error.message}`,
    );
  }
}
