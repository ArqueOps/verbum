import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata = {
  title: "Configurações — Verbum",
  description: "Ajuste idioma, senha e redes sociais.",
};

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("locale, social_instagram, social_facebook, social_linkedin, social_youtube, social_threads, social_tiktok, social_substack")
    .eq("id", user.id)
    .single();

  const p = (profile ?? {}) as Record<string, unknown>;

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
            Configurações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Idioma da interface, senha e redes sociais.
          </p>
        </header>

        <SettingsForm
          initialLocale={(p.locale as "pt-BR" | "en" | "es" | null) ?? "pt-BR"}
          initialSocials={{
            instagram: (p.social_instagram as string | null) ?? null,
            facebook: (p.social_facebook as string | null) ?? null,
            linkedin: (p.social_linkedin as string | null) ?? null,
            youtube: (p.social_youtube as string | null) ?? null,
            threads: (p.social_threads as string | null) ?? null,
            tiktok: (p.social_tiktok as string | null) ?? null,
            substack: (p.social_substack as string | null) ?? null,
          }}
        />

        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Segurança
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Para alterar sua senha, use o fluxo de recuperação de senha.
          </p>
          <Link
            href="/auth/forgot-password"
            className="mt-3 inline-flex text-sm font-medium text-[#C8963E] hover:underline"
          >
            Alterar senha
          </Link>
        </div>

        <p className="text-xs text-muted-foreground">
          Ao mudar o idioma, estudos já gerados passam a ser exibidos traduzidos na visualização — o texto original permanece intacto no banco.
        </p>
      </div>
    </main>
  );
}
