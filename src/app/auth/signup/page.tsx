import type { Metadata } from "next";
import SignupForm from "./signup-form";

export const metadata: Metadata = {
  title: "Criar Conta — Verbum",
  description: "Crie sua conta no Verbum para estudar a Bíblia com profundidade.",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        {/* TODO: Replace with Verbum logo when Brand.md is merged */}
        <h1 className="text-center text-2xl font-bold tracking-tight text-[#1E3A5F]">
          Verbum
        </h1>
        <h2 className="mt-4 text-center text-xl font-semibold text-[var(--foreground)]">
          Criar Conta
        </h2>
        <p className="mt-2 text-center text-sm text-[var(--foreground)]/60">
          Comece sua jornada de estudo bíblico
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-sm">
        <SignupForm />
      </div>
    </main>
  );
}
