"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, "O nome deve ter pelo menos 2 caracteres.")
    .max(100, "O nome deve ter no máximo 100 caracteres."),
  avatarUrl: z
    .string()
    .url("URL do avatar inválida.")
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  sex: z.enum(["male", "female", ""]).transform((v) => (v === "" ? null : v)),
  age: z
    .string()
    .regex(/^\d*$/, "Idade deve ser um número.")
    .transform((v) => (v === "" ? null : Number(v)))
    .refine((v) => v === null || (v >= 10 && v <= 120), "Idade entre 10 e 120."),
  curiosity: z
    .string()
    .max(500, "Curiosidade deve ter no máximo 500 caracteres.")
    .transform((v) => (v.trim() === "" ? null : v.trim())),
  locale: z.enum(["pt-BR", "en", "es"]).default("pt-BR"),
  social_instagram: z.string().max(64).transform((v) => strip(v)),
  social_facebook: z.string().max(64).transform((v) => strip(v)),
  social_linkedin: z.string().max(64).transform((v) => strip(v)),
  social_youtube: z.string().max(64).transform((v) => strip(v)),
  social_threads: z.string().max(64).transform((v) => strip(v)),
  social_tiktok: z.string().max(64).transform((v) => strip(v)),
  social_substack: z.string().max(64).transform((v) => strip(v)),
});

function strip(v: string): string | null {
  const trimmed = v.trim().replace(/^@/, "").replace(/^https?:\/\/[^/]+\//i, "");
  return trimmed === "" ? null : trimmed;
}

export type ProfileFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const rawData = {
    displayName: (formData.get("displayName") as string) ?? "",
    avatarUrl: (formData.get("avatarUrl") as string) ?? "",
    sex: (formData.get("sex") as string) ?? "",
    age: (formData.get("age") as string) ?? "",
    curiosity: (formData.get("curiosity") as string) ?? "",
    locale: (formData.get("locale") as string) ?? "pt-BR",
    social_instagram: (formData.get("social_instagram") as string) ?? "",
    social_facebook: (formData.get("social_facebook") as string) ?? "",
    social_linkedin: (formData.get("social_linkedin") as string) ?? "",
    social_youtube: (formData.get("social_youtube") as string) ?? "",
    social_threads: (formData.get("social_threads") as string) ?? "",
    social_tiktok: (formData.get("social_tiktok") as string) ?? "",
    social_substack: (formData.get("social_substack") as string) ?? "",
  };

  const parsed = profileSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      message: "Corrija os erros abaixo.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const d = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.displayName,
      avatar_url: d.avatarUrl,
      sex: d.sex,
      age: d.age,
      curiosity: d.curiosity,
      locale: d.locale,
      social_instagram: d.social_instagram,
      social_facebook: d.social_facebook,
      social_linkedin: d.social_linkedin,
      social_youtube: d.social_youtube,
      social_threads: d.social_threads,
      social_tiktok: d.social_tiktok,
      social_substack: d.social_substack,
    } as Record<string, unknown>)
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      message: "Erro ao salvar as alterações. Tente novamente.",
    };
  }

  return { success: true, message: "Perfil atualizado com sucesso!" };
}
