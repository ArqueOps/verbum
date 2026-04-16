import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookApiKeyHash } from "@/lib/webhook-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookData = {
  user_id?: string;
  plan_id?: string;
  status?: string;
  current_period_start?: string;
  current_period_end?: string;
  caramelou_subscription_id?: string;
};

type WebhookPayload = {
  event_id: string;
  event_type: string;
  data: WebhookData;
};

export async function POST(request: NextRequest) {
  const apiKeyHash = request.headers.get("x-api-key-hash");

  if (!verifyWebhookApiKeyHash(apiKeyHash, process.env.CARAMELOU_API_KEY)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: WebhookPayload;
  try {
    body = (await request.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_id, event_type, data } = body;

  if (!event_id || !event_type || !data) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    const { data: existing } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("event_id", event_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await handleEvent(supabase, event_type, data);

    await supabase.from("webhook_events").insert({
      event_id,
      event_type,
      user_id: data.user_id ?? null,
      payload: body as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[caramelou-webhook] processing error:", error);
    return NextResponse.json({ received: true });
  }
}

async function handleEvent(
  supabase: SupabaseClient,
  eventType: string,
  data: WebhookData,
): Promise<void> {
  const userId = data.user_id;

  switch (eventType) {
    case "subscription_created": {
      if (!userId) return;
      await supabase.from("subscriptions").insert({
        user_id: userId,
        plan_id: data.plan_id ?? "monthly",
        status: data.status ?? "active",
        current_period_start: data.current_period_start ?? new Date().toISOString(),
        current_period_end: data.current_period_end ?? null,
        caramelou_subscription_id: data.caramelou_subscription_id ?? null,
      });
      return;
    }

    case "subscription_charge_succeeded": {
      if (!userId) return;
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_end: data.current_period_end ?? null,
        })
        .eq("user_id", userId);
      return;
    }

    case "subscription_charge_failed": {
      if (!userId) return;
      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("user_id", userId);
      return;
    }

    case "subscription_cancellation_scheduled": {
      console.log(
        `[caramelou-webhook] cancellation scheduled for user ${userId ?? "unknown"}`,
      );
      return;
    }

    case "subscription_canceled": {
      if (!userId) return;
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("user_id", userId);
      return;
    }

    case "subscription_completed": {
      if (!userId) return;
      await supabase
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("user_id", userId);
      return;
    }

    case "subscription_upgraded":
    case "subscription_downgraded": {
      if (!userId) return;
      const update: Record<string, unknown> = {};
      if (data.plan_id) update.plan_id = data.plan_id;
      if (data.current_period_end) {
        update.current_period_end = data.current_period_end;
      }
      if (Object.keys(update).length === 0) return;
      await supabase
        .from("subscriptions")
        .update(update)
        .eq("user_id", userId);
      return;
    }

    case "sale_success_credit": {
      console.log("[caramelou-webhook] sale_success_credit not applicable for Verbum");
      return;
    }

    default: {
      console.log(`[caramelou-webhook] unhandled event_type: ${eventType}`);
      return;
    }
  }
}
