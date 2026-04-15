import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — Verbum",
  description: "Acesse sua conta no Verbum.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <LoginForm />
    </main>
  );
}
