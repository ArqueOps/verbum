import { createClient } from "@supabase/supabase-js";
import { verifyWebhookApiKeyHash } from "@/lib/webhook-auth";
import { NextRequest } from "next/server";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export async function POST(request: NextRequest) {
  const apiKeyHash = request.headers.get("x-api-key-hash");

  if (!verifyWebhookApiKeyHash(apiKeyHash, process.env.CARAMELOU_API_KEY)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { event_id, event_type, data } = body;

  if (!event_id || !event_type || !data) {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("webhook_events")
    .select("id")
    .eq("event_id", event_id)
    .maybeSingle();

  if (existing) {
    return Response.json({ received: true, duplicate: true });
  }

  switch (event_type) {
    case "subscription_created": {
      await supabase.from("subscriptions").insert({
        user_id: data.user_id,
        plan_id: data.plan_id,
        status: data.status ?? "active",
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
      });
      break;
    }
    case "subscription_charge_succeeded": {
      await supabase
        .from("subscriptions")
        .update({
          current_period_end: data.current_period_end,
          status: "active",
        })
        .eq("user_id", data.user_id);
      break;
    }
    case "subscription_canceled": {
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("user_id", data.user_id);
      break;
    }
  }

  await supabase.from("webhook_events").insert({
    event_id,
    event_type,
    user_id: data.user_id,
    payload: body,
  });

  return Response.json({ received: true });
}
