import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = {
  title: "Bem-vindo ao Verbum",
  description: "Complete seu cadastro em 4 passos.",
};

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signup");

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-12">
      <OnboardingWizard userEmail={user.email ?? ""} />
    </main>
  );
}
