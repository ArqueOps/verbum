"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, "O nome de exibição não pode ficar vazio.")
    .min(2, "O nome de exibição deve ter pelo menos 2 caracteres.")
    .max(100, "O nome de exibição deve ter no máximo 100 caracteres."),
  avatarUrl: z
    .string()
    .url("A URL do avatar é inválida.")
    .or(z.literal(""))
    .transform((val) => (val === "" ? null : val)),
});

export type ProfileFormState = {
  success: boolean;
  message: string;
  errors?: {
    displayName?: string[];
    avatarUrl?: string[];
  };
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
    displayName: formData.get("displayName") as string,
    avatarUrl: formData.get("avatarUrl") as string,
  };

  const parsed = profileSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      message: "Corrija os erros abaixo.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      avatar_url: parsed.data.avatarUrl,
    })
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      message: "Erro ao salvar as alterações. Tente novamente.",
    };
  }

  return {
    success: true,
    message: "Perfil atualizado com sucesso!",
  };
}
