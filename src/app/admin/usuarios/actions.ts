"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient as createClient } from "@/lib/supabase/server";
import {
  grantSubscription,
  revokeSubscription,
  extendSubscription,
  deactivateAccount,
} from "@/lib/admin-users";
import {
  grantSubscriptionSchema,
  revokeSubscriptionSchema,
  extendSubscriptionSchema,
  deactivateAccountSchema,
} from "@/lib/validations/admin-users";

export type ActionResult = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    redirect("/");
  }

  return user.id;
}

export async function grantSubscriptionAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await requireAdmin();

  const raw = {
    userId: formData.get("userId") as string,
    planInterval: formData.get("planInterval") as string,
    periodMonths: Number(formData.get("periodMonths")),
  };

  const parsed = grantSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Corrija os erros abaixo.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();
  const durationDays =
    parsed.data.planInterval === "annual"
      ? parsed.data.periodMonths * 365
      : parsed.data.periodMonths * 30;

  try {
    await grantSubscription(supabase, {
      userId: parsed.data.userId,
      planId: parsed.data.planInterval,
      durationDays,
      adminId,
    });
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Erro desconhecido." };
  }

  revalidatePath("/admin/usuarios");
  return { success: true, message: "Assinatura ativada com sucesso!" };
}

export async function revokeSubscriptionAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await requireAdmin();

  const raw = {
    userId: formData.get("userId") as string,
    reason: formData.get("reason") as string,
  };

  const parsed = revokeSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Corrija os erros abaixo.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();

  try {
    await revokeSubscription(supabase, {
      userId: parsed.data.userId,
      adminId,
      reason: parsed.data.reason,
    });
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Erro desconhecido." };
  }

  revalidatePath("/admin/usuarios");
  return { success: true, message: "Assinatura desativada com sucesso!" };
}

export async function extendSubscriptionAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const adminId = await requireAdmin();

  const raw = {
    userId: formData.get("userId") as string,
    days: Number(formData.get("days")),
  };

  const parsed = extendSubscriptionSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Corrija os erros abaixo.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();

  try {
    await extendSubscription(supabase, {
      userId: parsed.data.userId,
      additionalDays: parsed.data.days,
      adminId,
    });
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Erro desconhecido." };
  }

  revalidatePath("/admin/usuarios");
  return { success: true, message: `Assinatura estendida em ${parsed.data.days} dias!` };
}

export async function deactivateAccountAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const raw = {
    userId: formData.get("userId") as string,
  };

  const parsed = deactivateAccountSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Corrija os erros abaixo.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const supabase = await createClient();

  try {
    await deactivateAccount(supabase, parsed.data.userId);
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Erro desconhecido." };
  }

  revalidatePath("/admin/usuarios");
  return { success: true, message: "Conta desativada com sucesso!" };
}
