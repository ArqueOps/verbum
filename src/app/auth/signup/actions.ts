"use server";

import { z } from "zod";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";

const serverSignupSchema = z.object({
  fullName: z
    .string()
    .min(2, "Nome deve ter no mínimo 2 caracteres")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .trim(),
  email: z.string().email("E-mail inválido").trim(),
  password: z.string().min(8, "Mínimo de 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type SignupState = {
  errors?: {
    fullName?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
  message?: string;
  success?: boolean;
} | undefined;

export async function signUp(
  prevState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const validatedFields = serverSignupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { fullName, email, password } = validatedFields.data;

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return {
      message: error.message === "User already registered"
        ? "Este e-mail já está cadastrado"
        : "Erro ao criar conta. Tente novamente.",
    };
  }

  return {
    success: true,
    message: "Verifique seu e-mail para confirmar o cadastro",
  };
}
