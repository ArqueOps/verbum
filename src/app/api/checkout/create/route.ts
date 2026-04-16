import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCheckoutUrl } from "@/lib/caramelou";

const VALID_PLANS = ["monthly", "annual"] as const;
type Plan = (typeof VALID_PLANS)[number];

function isValidPlan(value: unknown): value is Plan {
  return typeof value === "string" && VALID_PLANS.includes(value as Plan);
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json(
      { error: "Não autorizado. Faça login para continuar." },
      { status: 401 },
    );
  }

  let body: { plan?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  if (!isValidPlan(body.plan)) {
    return Response.json(
      { error: "Plano inválido. Escolha entre: monthly ou annual." },
      { status: 400 },
    );
  }

  const { data: credits } = await supabase
    .from("user_credits")
    .select("has_active_subscription")
    .eq("user_id", user.id)
    .single();

  if (credits?.has_active_subscription) {
    return Response.json(
      { error: "Você já possui uma assinatura ativa." },
      { status: 409 },
    );
  }

  try {
    const checkoutUrl = getCheckoutUrl(body.plan, user.id, user.email ?? "");

    return Response.json({ checkoutUrl }, { status: 200 });
  } catch {
    return Response.json(
      { error: "Erro ao gerar link de checkout. Tente novamente." },
      { status: 500 },
    );
  }
}
