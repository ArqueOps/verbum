import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CancellationFlow } from "./cancellation-flow";

export const metadata = {
  title: "Cancelar Assinatura — Verbum",
};

export default async function CancelPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, plan_id, status, current_period_start, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"])
    .limit(1)
    .maybeSingle();

  if (!subscription) redirect("/perfil");

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-12">
      <CancellationFlow subscription={subscription} />
    </main>
  );
}
