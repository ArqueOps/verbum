"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signupSchema } from "@/lib/validations/signup";
import { signUp, type SignupState } from "./actions";

type ClientErrors = {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<SignupState, FormData>(
    signUp,
    undefined,
  );
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});

  function validateField(name: string, value: string, allValues?: Record<string, string>) {
    const partial: Record<string, string> = allValues ?? { [name]: value };

    if (name === "fullName") {
      const result = signupSchema.shape.fullName.safeParse(value);
      setClientErrors((prev) => ({
        ...prev,
        fullName: result.success ? undefined : result.error.issues[0]?.message,
      }));
    } else if (name === "email") {
      const result = signupSchema.shape.email.safeParse(value);
      setClientErrors((prev) => ({
        ...prev,
        email: result.success ? undefined : result.error.issues[0]?.message,
      }));
    } else if (name === "password") {
      const result = signupSchema.shape.password.safeParse(value);
      setClientErrors((prev) => ({
        ...prev,
        password: result.success ? undefined : result.error.issues[0]?.message,
      }));
      if (partial.confirmPassword && partial.confirmPassword !== value) {
        setClientErrors((prev) => ({
          ...prev,
          confirmPassword: "As senhas não coincidem",
        }));
      } else if (partial.confirmPassword) {
        setClientErrors((prev) => ({ ...prev, confirmPassword: undefined }));
      }
    } else if (name === "confirmPassword") {
      setClientErrors((prev) => ({
        ...prev,
        confirmPassword:
          value !== partial.password ? "As senhas não coincidem" : undefined,
      }));
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    const { name, value, form } = e.target;
    const formData = form ? Object.fromEntries(new FormData(form)) as Record<string, string> : {};
    validateField(name, value, formData);
  }

  if (state?.success) {
    return (
      <div className="text-center space-y-4">
        <div
          className="rounded-lg border border-[#1E3A5F]/20 bg-[#1E3A5F]/5 p-6"
          role="status"
        >
          <svg
            className="mx-auto mb-3 h-12 w-12 text-[#1E3A5F]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
          <h2 className="text-lg font-semibold text-[#1E3A5F]">
            Verifique seu e-mail
          </h2>
          <p className="mt-2 text-sm text-[var(--foreground)]/70">
            {state.message}
          </p>
        </div>
        <Link
          href="/auth/login"
          className="inline-block text-sm font-medium text-[#1E3A5F] hover:text-[#2A4F7F] underline-offset-4 hover:underline"
        >
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state?.message && !state.success && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
          role="alert"
        >
          {state.message}
        </div>
      )}

      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          Nome completo
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          placeholder="Seu nome completo"
          onBlur={handleBlur}
          className="mt-1.5 block w-full rounded-lg border border-[var(--foreground)]/15 bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:border-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
        />
        {(clientErrors.fullName || state?.errors?.fullName?.[0]) && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            {clientErrors.fullName || state?.errors?.fullName?.[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="seu@email.com"
          onBlur={handleBlur}
          className="mt-1.5 block w-full rounded-lg border border-[var(--foreground)]/15 bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:border-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
        />
        {(clientErrors.email || state?.errors?.email?.[0]) && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            {clientErrors.email || state?.errors?.email?.[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Mínimo de 8 caracteres"
          onBlur={handleBlur}
          className="mt-1.5 block w-full rounded-lg border border-[var(--foreground)]/15 bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:border-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
        />
        {(clientErrors.password || state?.errors?.password?.[0]) && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            {clientErrors.password || state?.errors?.password?.[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-[var(--foreground)]"
        >
          Confirmar senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          placeholder="Digite a senha novamente"
          onBlur={handleBlur}
          className="mt-1.5 block w-full rounded-lg border border-[var(--foreground)]/15 bg-[var(--background)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground)]/40 focus:border-[#1E3A5F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20"
        />
        {(clientErrors.confirmPassword || state?.errors?.confirmPassword?.[0]) && (
          <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            {clientErrors.confirmPassword || state?.errors?.confirmPassword?.[0]}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#1E3A5F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#2A4F7F] focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
      >
        {pending ? "Criando conta..." : "Criar conta"}
      </button>

      <p className="text-center text-sm text-[var(--foreground)]/60">
        Já tem conta?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-[#1E3A5F] hover:text-[#2A4F7F] underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
