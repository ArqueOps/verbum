"use server";

import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface AuthResult {
  error: string | null;
}

interface SignUpParams {
  email: string;
  password: string;
  metadata?: Record<string, unknown>;
}

interface SignInParams {
  email: string;
  password: string;
}

interface ForgotPasswordParams {
  email: string;
}

interface ResetPasswordParams {
  password: string;
}

export async function signUp(params: SignUpParams): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: params.metadata,
    },
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/auth/login?message=Verifique seu e-mail para confirmar o cadastro");
}

export async function signIn(params: SignInParams): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/meus-estudos");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function forgotPassword(
  params: ForgotPasswordParams,
): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(params.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function resetPassword(
  params: ResetPasswordParams,
): Promise<AuthResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: params.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/auth/login?message=Senha redefinida com sucesso. Faça login com sua nova senha.");
}
