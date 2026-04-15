import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar — Verbum",
  description: "Faça login na plataforma Verbum.",
};

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-md dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            Verbum
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Profundidade que ilumina
          </p>
        </div>

        <LoginForm />

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-400 dark:bg-gray-900 dark:text-gray-500">
              ou
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          Mais opções de login em breve
        </p>
      </div>
    </main>
  );
}
