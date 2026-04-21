import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  study_id: z.string().uuid(),
  channel: z.enum([
    "web_share_api",
    "whatsapp",
    "copy_link",
    "twitter",
    "facebook",
    "other",
  ]),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error" }, { status: 400 });
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from("share_events").insert({
    study_id: parsed.data.study_id,
    channel: parsed.data.channel,
    user_id: user?.id ?? null,
  });
  return NextResponse.json({ ok: true });
}
