import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import { z } from "zod";

const checkoutSchema = z.object({
  plan: z.enum(["monthly", "annual"]),
});

export async function POST(request: NextRequest) {
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

  const body: unknown = await request.json();
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: "Plano inválido. Escolha monthly ou annual." },
      { status: 400 },
    );
  }

  const { plan } = parsed.data;

  const { data: activeSub } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (activeSub) {
    return Response.json(
      { error: "Você já possui uma assinatura ativa." },
      { status: 409 },
    );
  }

  const caramelouApiUrl = process.env.CARAMELOU_API_URL;
  if (!caramelouApiUrl) {
    return Response.json(
      { error: "Serviço de pagamento indisponível no momento." },
      { status: 503 },
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
    ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const response = await fetch(`${caramelouApiUrl}/api/checkout/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      plan,
      userId: user.id,
      userEmail: user.email,
      successUrl: `${appUrl}/pricing?status=success`,
      cancelUrl: `${appUrl}/pricing`,
    }),
  });

  if (!response.ok) {
    return Response.json(
      { error: "Erro ao criar sessão de pagamento. Tente novamente." },
      { status: 502 },
    );
  }

  const data: { checkoutUrl: string } = await response.json();

  return Response.json({ checkoutUrl: data.checkoutUrl });
}
