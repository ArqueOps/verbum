"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { signIn, type SignInState } from "./actions";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "O e-mail é obrigatório")
    .email("Formato de e-mail inválido"),
  password: z.string().min(1, "A senha é obrigatória"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(
    signIn,
    {},
  );

  const {
    register,
    formState: { errors: clientErrors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const emailError =
    clientErrors.email?.message ?? state.fieldErrors?.email?.[0];
  const passwordError =
    clientErrors.password?.message ?? state.fieldErrors?.password?.[0];

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
        >
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground"
        >
          E-mail
        </label>
        <input
          {...register("email")}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="seu@email.com"
          aria-invalid={!!emailError}
          aria-describedby={emailError ? "email-error" : undefined}
          className="rounded-lg border border-[#E8E6E1] bg-white px-3 py-2 text-sm text-foreground placeholder:text-[#7C8594] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none dark:border-[#2A2F36] dark:bg-[#1A1F26]"
        />
        {emailError && (
          <p id="email-error" className="text-xs text-[#C0392B]">
            {emailError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-sm font-medium text-foreground"
          >
            Senha
          </label>
          <Link
            href="/auth/forgot-password"
            className="text-xs text-primary hover:text-primary-light transition-colors"
          >
            Esqueceu a senha?
          </Link>
        </div>
        <input
          {...register("password")}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Sua senha"
          aria-invalid={!!passwordError}
          aria-describedby={passwordError ? "password-error" : undefined}
          className="rounded-lg border border-[#E8E6E1] bg-white px-3 py-2 text-sm font-mono text-foreground placeholder:font-sans placeholder:text-[#7C8594] focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none dark:border-[#2A2F36] dark:bg-[#1A1F26]"
        />
        {passwordError && (
          <p id="password-error" className="text-xs text-[#C0392B]">
            {passwordError}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-light focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {pending ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-center text-sm text-[#7C8594]">
        Não tem uma conta?{" "}
        <Link
          href="/auth/signup"
          className="font-medium text-primary hover:text-primary-light transition-colors"
        >
          Criar conta
        </Link>
      </p>
    </form>
  );
}
