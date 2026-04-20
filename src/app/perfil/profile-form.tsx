"use client";

import { useActionState } from "react";
import Image from "next/image";
import { updateProfile, type ProfileFormState } from "./actions";

interface ProfileFormProps {
  initialDisplayName: string;
  initialAvatarUrl: string;
  initialSex: "male" | "female" | null;
  initialAge: number | null;
  initialCuriosity: string | null;
  initialLocale: "pt-BR" | "en" | "es";
  initialSocials: Record<
    | "instagram"
    | "facebook"
    | "linkedin"
    | "youtube"
    | "threads"
    | "tiktok"
    | "substack",
    string | null
  >;
}

const initialState: ProfileFormState = { success: false, message: "" };

const SOCIAL_FIELDS: { key: keyof ProfileFormProps["initialSocials"]; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "seuusername" },
  { key: "facebook", label: "Facebook", placeholder: "seuusername" },
  { key: "linkedin", label: "LinkedIn", placeholder: "seu-username" },
  { key: "youtube", label: "YouTube", placeholder: "@seucanal" },
  { key: "threads", label: "Threads", placeholder: "seuusername" },
  { key: "tiktok", label: "TikTok", placeholder: "seuusername" },
  { key: "substack", label: "Substack", placeholder: "seunewsletter" },
];

export function ProfileForm({
  initialDisplayName,
  initialAvatarUrl,
  initialSex,
  initialAge,
  initialCuriosity,
  initialLocale,
  initialSocials,
}: ProfileFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfile, initialState);

  const inputCls =
    "block w-full rounded-lg border border-foreground/20 bg-background px-3 py-2 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

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

      {/* Display name + Avatar */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="displayName" className="block text-sm font-medium text-foreground">
            Nome
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            defaultValue={initialDisplayName}
            className={inputCls}
          />
          {state.errors?.displayName && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.errors.displayName[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="avatarUrl" className="block text-sm font-medium text-foreground">
            URL do avatar (opcional)
          </label>
          <input
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            defaultValue={initialAvatarUrl}
            placeholder="https://exemplo.com/foto.jpg"
            className={inputCls}
          />
          {state.errors?.avatarUrl && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.errors.avatarUrl[0]}</p>
          )}
        </div>
      </div>

      {initialAvatarUrl && (
        <div className="flex items-center gap-4">
          <Image
            src={initialAvatarUrl}
            alt="Avatar atual"
            width={64}
            height={64}
            className="h-16 w-16 rounded-full border border-foreground/10 object-cover"
          />
          <span className="text-sm text-foreground/60">Avatar atual</span>
        </div>
      )}

      {/* Sex, age, locale */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <label htmlFor="sex" className="block text-sm font-medium text-foreground">
            Sexo
          </label>
          <select id="sex" name="sex" defaultValue={initialSex ?? ""} className={inputCls}>
            <option value="">—</option>
            <option value="male">Masculino</option>
            <option value="female">Feminino</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="age" className="block text-sm font-medium text-foreground">
            Idade
          </label>
          <input
            id="age"
            name="age"
            type="number"
            min={10}
            max={120}
            defaultValue={initialAge ?? ""}
            className={inputCls}
          />
          {state.errors?.age && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.errors.age[0]}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="locale" className="block text-sm font-medium text-foreground">
            Idioma
          </label>
          <select id="locale" name="locale" defaultValue={initialLocale} className={inputCls}>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </div>
      </div>

      {/* Curiosity */}
      <div className="space-y-2">
        <label htmlFor="curiosity" className="block text-sm font-medium text-foreground">
          Uma curiosidade sobre você
        </label>
        <textarea
          id="curiosity"
          name="curiosity"
          rows={3}
          maxLength={500}
          defaultValue={initialCuriosity ?? ""}
          placeholder="Ex: costumo estudar pela manhã, gosto de Salmos, sou de Pernambuco..."
          className={inputCls}
        />
        {state.errors?.curiosity && (
          <p className="text-sm text-red-600 dark:text-red-400">{state.errors.curiosity[0]}</p>
        )}
      </div>

      {/* Social usernames */}
      <div className="space-y-3 rounded-lg border border-foreground/10 bg-muted/20 p-4">
        <p className="text-sm font-medium text-foreground">Redes sociais (apenas o nome de usuário, sem @)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((f) => (
            <div key={f.key} className="space-y-1">
              <label
                htmlFor={`social_${f.key}`}
                className="block text-xs font-medium text-foreground/70"
              >
                {f.label}
              </label>
              <input
                id={`social_${f.key}`}
                name={`social_${f.key}`}
                type="text"
                maxLength={64}
                defaultValue={initialSocials[f.key] ?? ""}
                placeholder={f.placeholder}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-[#C8963E] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#B5862F] focus:outline-none focus:ring-2 focus:ring-[#C8963E]/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Salvando..." : "Salvar alterações"}
      </button>
    </form>
  );
}
