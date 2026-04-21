"use client";

import { useTransition, useState } from "react";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/browser";

type Locale = "pt-BR" | "en" | "es";

interface Socials {
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  youtube: string | null;
  threads: string | null;
  tiktok: string | null;
  substack: string | null;
}

export function SettingsForm({
  initialLocale,
  initialSocials,
}: {
  initialLocale: Locale;
  initialSocials: Socials;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [socials, setSocials] = useState<Socials>(initialSocials);
  const [pending, startTransition] = useTransition();

  function updateSocial(key: keyof Socials, value: string) {
    setSocials((s) => ({ ...s, [key]: value || null }));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Sessão expirada. Entre novamente.");
        return;
      }
      const clean = (v: string | null): string | null =>
        v ? v.trim().replace(/^@/, "") || null : null;

      const { error } = await supabase
        .from("profiles")
        .update({
          locale,
          social_instagram: clean(socials.instagram),
          social_facebook: clean(socials.facebook),
          social_linkedin: clean(socials.linkedin),
          social_youtube: clean(socials.youtube),
          social_threads: clean(socials.threads),
          social_tiktok: clean(socials.tiktok),
          social_substack: clean(socials.substack),
        } as Record<string, unknown>)
        .eq("id", user.id);
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
        return;
      }
      toast.success("Configurações salvas.");
    });
  }

  const input =
    "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-border bg-card p-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          Idioma da interface
        </label>
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          className={input}
        >
          <option value="pt-BR">Português (Brasil)</option>
          <option value="en">English</option>
          <option value="es">Español</option>
        </select>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">
          Redes sociais (apenas o nome de usuário, sem @)
        </legend>
        {([
          ["instagram", "Instagram"],
          ["facebook", "Facebook"],
          ["linkedin", "LinkedIn"],
          ["youtube", "YouTube"],
          ["threads", "Threads"],
          ["tiktok", "TikTok"],
          ["substack", "Substack"],
        ] as const).map(([key, label]) => (
          <div key={key} className="grid grid-cols-[110px_1fr] items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground">{label}</label>
            <input
              type="text"
              maxLength={64}
              value={socials[key] ?? ""}
              onChange={(e) => updateSocial(key, e.target.value)}
              placeholder="seuusername"
              className={input}
            />
          </div>
        ))}
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-[#C8963E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#B5862F] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
