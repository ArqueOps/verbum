import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Verbum",
  description: "Acesse sua conta Verbum para continuar seus estudos bíblicos.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Entrar
          </h1>
          <p className="mt-2 text-sm text-[#7C8594]">
            Acesse sua conta para continuar seus estudos
          </p>
        </div>

        <LoginForm />
      </div>
    </main>
  );
}
