import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CancellationForm } from "./cancellation-form";

export const metadata = {
  title: "Cancelar Assinatura — Verbum",
  description: "Cancele sua assinatura do Verbum.",
};

interface SubscriptionData {
  planId: string;
  status: string;
  currentPeriodEnd: string;
}

export default async function CancelPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const nowIso = new Date().toISOString();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan_id, status, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "cancelled"])
    .gt("current_period_end", nowIso)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!subscription) {
    redirect("/perfil");
  }

  const subscriptionData: SubscriptionData = {
    planId: subscription.plan_id,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
  };

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Cancelar Assinatura
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Sentimos muito que você queira ir. Siga os passos abaixo.
          </p>
        </div>

        <CancellationForm subscription={subscriptionData} />
      </div>
    </main>
  );
}
