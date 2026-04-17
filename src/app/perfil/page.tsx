import { redirect } from "next/navigation";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";
import { SubscriptionSection } from "./subscription-section";
import { TransactionHistory } from "./transaction-history";

export const metadata = {
  title: "Perfil — Verbum",
  description: "Gerencie seu perfil no Verbum.",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, plan_id, status, current_period_start, current_period_end")
    .eq("user_id", user.id)
    .in("status", ["active", "past_due"])
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-10">
        {/* Profile Section */}
        <div className="mx-auto w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-primary">
              Perfil
            </h1>
            <p className="mt-2 text-sm text-foreground/60">
              Gerencie suas informações de exibição.
            </p>
          </div>

          <ProfileForm
            initialDisplayName={profile?.display_name ?? ""}
            initialAvatarUrl={profile?.avatar_url ?? ""}
          />
        </div>

        {/* Subscription Section — visible only for active subscribers */}
        {subscription && (
          <>
            <hr className="border-foreground/10" />
            <SubscriptionSection subscription={subscription} />
          </>
        )}

        {/* Transaction History — always visible */}
        <hr className="border-foreground/10" />
        <TransactionHistory userId={user.id} />
      </div>
    </main>
  );
}
