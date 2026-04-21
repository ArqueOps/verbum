import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { grantSubscription } from "@/lib/admin-users";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  planInterval: z.enum(["monthly", "annual"]),
  periodMonths: z.number().int().positive().max(36),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido" },
      { status: 400 },
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.issues },
      { status: 400 },
    );
  }

  try {
    const supabase = await createServerSupabaseClient();
    await grantSubscription(supabase, {
      userId: id,
      planId: parsed.data.planInterval,
      durationDays: parsed.data.periodMonths * 30,
      adminId: auth.admin.id,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 },
    );
  }
}
