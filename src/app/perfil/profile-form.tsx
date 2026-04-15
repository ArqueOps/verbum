"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileFormState } from "./actions";

interface ProfileFormProps {
  initialDisplayName: string;
  initialAvatarUrl: string;
}

const initialState: ProfileFormState = {
  success: false,
  message: "",
};

export function ProfileForm({
  initialDisplayName,
  initialAvatarUrl,
}: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(
    updateProfile,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-6">
      {state.message && (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-sm ${
            state.success
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="displayName"
          className="block text-sm font-medium text-foreground"
        >
          Nome de Exibição
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          required
          defaultValue={initialDisplayName}
          placeholder="Seu nome de exibição"
          className="block w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {state.errors?.displayName && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.errors.displayName[0]}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="avatarUrl"
          className="block text-sm font-medium text-foreground"
        >
          URL do Avatar
        </label>
        <input
          id="avatarUrl"
          name="avatarUrl"
          type="url"
          defaultValue={initialAvatarUrl}
          placeholder="https://exemplo.com/sua-foto.jpg"
          className="block w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {state.errors?.avatarUrl && (
          <p className="text-sm text-red-600 dark:text-red-400">
            {state.errors.avatarUrl[0]}
          </p>
        )}
        <p className="text-xs text-foreground/50">
          Insira a URL de uma imagem para usar como avatar.
        </p>
      </div>

      {initialAvatarUrl && (
        <div className="flex items-center gap-4">
          <img
            src={initialAvatarUrl}
            alt="Avatar atual"
            className="h-16 w-16 rounded-full border border-foreground/10 object-cover"
          />
          <span className="text-sm text-foreground/60">Avatar atual</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar Alterações"}
      </button>
    </form>
  );
}
