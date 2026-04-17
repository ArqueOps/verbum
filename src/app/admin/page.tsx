import { redirect } from "next/navigation";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Admin — Verbum",
  description: "Painel administrativo do Verbum.",
};

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-start justify-center px-4 py-12">
      <div className="w-full max-w-6xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Painel Administrativo
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Métricas e gestão do Verbum.
          </p>
        </div>
      </div>
    </main>
  );
}
