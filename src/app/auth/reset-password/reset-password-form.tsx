"use client";

import { useState } from "react";
import { resetPassword } from "@/app/auth/actions";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [pending, setPending] = useState(false);

  function validateFields(password: string, confirmPassword: string): boolean {
    const errors: typeof fieldErrors = {};

    if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres`;
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = "As senhas não coincidem";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!validateFields(password, confirmPassword)) {
      return;
    }

    setPending(true);

    try {
      const result = await resetPassword({ password });

      if (result.error) {
        setError(result.error);
        setPending(false);
      }
    } catch {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground/80"
        >
          Nova senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
          className="mt-1.5 block w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
        />
        {fieldErrors.password && (
          <p className="mt-1.5 text-sm text-red-600">
            {fieldErrors.password}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-foreground/80"
        >
          Confirmar nova senha
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          placeholder="Repita a nova senha"
          className="mt-1.5 block w-full rounded-lg border border-foreground/15 bg-background px-3.5 py-2.5 text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
        />
        {fieldErrors.confirmPassword && (
          <p className="mt-1.5 text-sm text-red-600">
            {fieldErrors.confirmPassword}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
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
        {pending ? "Redefinindo..." : "Redefinir senha"}
      </button>
    </form>
  );
}
