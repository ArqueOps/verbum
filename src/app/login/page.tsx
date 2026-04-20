import Image from "next/image";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import LoginForm from "./login-form";

export const metadata = {
  title: "Entrar — Verbum",
  description: "Faça login na plataforma Verbum.",
};

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/meus-estudos");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-foreground/10 bg-card p-8 shadow-md">
        <div className="mb-8 text-center">
          <Image
            src="/logo.png"
            alt="Verbum"
            width={320}
            height={320}
            className="mx-auto h-40 w-auto"
            priority
          />
          <p className="mt-1 text-sm text-muted-foreground">
            Profundidade que ilumina
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
