import { redirect } from "next/navigation";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";
import { GenerateStudyForm } from "./generate-study-form";

export const metadata = {
  title: "Gerar Estudo — Verbum",
  description: "Selecione uma passagem bíblica para gerar seu estudo.",
};

export default async function GeneratePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Gerar Estudo
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Selecione a passagem bíblica que deseja estudar.
          </p>
        </div>

        <GenerateStudyForm />
      </div>
    </main>
  );
}
