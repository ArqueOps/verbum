import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const VALID_PLANS = ["monthly", "annual"] as const;
type Plan = (typeof VALID_PLANS)[number];

const CARAMELOU_BASE_URL = process.env.CARAMELOU_CHECKOUT_URL ?? "https://caramelou.com.br/api/checkout";

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { plan } = body;
  if (!plan || !VALID_PLANS.includes(plan as Plan)) {
    return NextResponse.json(
      { error: "Invalid plan. Must be one of: monthly, annual" },
      { status: 400 },
    );
  }

  const { data: credits } = await supabase
    .from("user_credits")
    .select("has_active_subscription")
    .eq("user_id", user.id)
    .single();

  if (credits?.has_active_subscription) {
    return NextResponse.json(
      { error: "User already has an active subscription" },
      { status: 409 },
    );
  }

  const checkoutResponse = await fetch(CARAMELOU_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, user_id: user.id, user_email: user.email }),
  });

  if (!checkoutResponse.ok) {
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 502 },
    );
  }

  const checkoutData = await checkoutResponse.json();

  return NextResponse.json({ checkoutUrl: checkoutData.checkout_url }, { status: 200 });
}
