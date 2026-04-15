import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-primary">
            Verbum
          </h1>
          <p className="mt-2 text-sm text-foreground/60">
            Profundidade que ilumina
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
