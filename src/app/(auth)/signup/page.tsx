import type { Metadata } from "next";
import { SignupForm } from "./signup-form";

export const metadata: Metadata = {
  title: "Criar Conta — Verbum",
  description: "Crie sua conta no Verbum para começar a estudar.",
};

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <SignupForm />
    </main>
  );
}
