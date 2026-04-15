"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground/80"
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
          className="mt-1.5 block w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
        />
        {state.fieldErrors?.email && (
          <p className="mt-1.5 text-sm text-red-600">
            {state.fieldErrors.email[0]}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground/80"
        >
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="Sua senha"
          className="mt-1.5 block w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
        />
        {state.fieldErrors?.password && (
          <p className="mt-1.5 text-sm text-red-600">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      {state.error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
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

      <div className="flex items-center justify-between text-sm">
        <Link
          href="/auth/signup"
          className="font-medium text-primary hover:text-primary-light transition-colors"
        >
          Criar conta
        </Link>
        <Link
          href="/auth/forgot-password"
          className="text-foreground/60 hover:text-foreground/80 transition-colors"
        >
          Esqueceu a senha?
        </Link>
      </div>
    </form>
  );
}
