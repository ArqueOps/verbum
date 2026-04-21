import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveSubscription } from "@/lib/subscription";
import { NextRequest } from "next/server";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().min(1).max(1000),
  feedback: z.string().max(5000).optional(),
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 },
    );
  }

  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Motivo do cancelamento é obrigatório." },
      { status: 400 },
    );
  }

  const { reason, feedback } = parsed.data;

  const subscription = await getActiveSubscription(user.id);

  if (!subscription) {
    return Response.json(
      { error: "Você não possui uma assinatura ativa." },
      { status: 403 },
    );
  }

  if (!subscription.caramelou_subscription_id) {
    return Response.json(
      { error: "Assinatura sem vínculo com o sistema de pagamento." },
      { status: 422 },
    );
  }

  const caramelouApiUrl = process.env.CARAMELOU_API_URL;
  if (!caramelouApiUrl) {
    return Response.json(
      { error: "Serviço de pagamento indisponível no momento." },
      { status: 503 },
    );
  }

  const caramelouResponse = await fetch(
    `${caramelouApiUrl}/functions/v1/cancel-subscription`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription_id: subscription.caramelou_subscription_id,
        cancellation_reason: reason,
      }),
    },
  );

  if (!caramelouResponse.ok) {
    return Response.json(
      { error: "Erro ao cancelar assinatura. Tente novamente." },
      { status: 502 },
    );
  }

  const adminClient = createAdminClient();

  await adminClient.from("subscription_cancellations").insert({
    user_id: user.id,
    subscription_id: subscription.id,
    reason,
    feedback: feedback ?? null,
  });

  return Response.json({
    message: "Assinatura cancelada com sucesso.",
  });
}
