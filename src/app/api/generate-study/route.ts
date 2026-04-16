import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const generateStudySchema = z.object({
  book_id: z.number({ message: "book_id must be a number" }),
  chapter: z.number({ message: "chapter must be a number" }),
});

const BIBLE_API_BASE = "https://www.abibliadigital.com.br/api/verses/nvi";
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o";
const MAX_PARSE_RETRIES = 2;

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function fetchBiblePassage(
  bookId: number,
  chapter: number,
): Promise<string | null> {
  try {
    const response = await fetch(`${BIBLE_API_BASE}/${bookId}/${chapter}`);
    if (!response.ok) {
      console.warn(`Bible API returned ${response.status}, proceeding without passage text`);
      return null;
    }
    const data = await response.json();
    if (data.verses && Array.isArray(data.verses)) {
      return data.verses
        .map((v: { number: number; text: string }) => `${v.number}. ${v.text}`)
        .join("\n");
    }
    return data.text ?? null;
  } catch (error) {
    console.warn("Bible API unavailable, proceeding without passage text", error);
    return null;
  }
}

async function callOpenAI(
  passageText: string | null,
  bookId: number,
  chapter: number,
): Promise<{ parsed: true; study: Record<string, unknown> } | { parsed: false; error: string }> {
  const systemPrompt = `You are a Bible study assistant. Generate a structured study in JSON format with fields: title (string), content (string with markdown), verse_reference (string), sections (array of {title, content}).`;

  const userPrompt = passageText
    ? `Generate a Bible study for book ID ${bookId}, chapter ${chapter}. Here is the passage text:\n\n${passageText}`
    : `Generate a Bible study for book ID ${bookId}, chapter ${chapter}. The passage text was unavailable, so use your knowledge.`;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    return { parsed: false, error: `OpenAI API error: ${response.status}` };
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content;

  if (!rawContent) {
    return { parsed: false, error: "No content in OpenAI response" };
  }

  try {
    const study = JSON.parse(rawContent);
    return { parsed: true, study };
  } catch {
    return { parsed: false, error: "Failed to parse OpenAI response as JSON" };
  }
}

export async function POST(request: Request) {
  // 1. Parse & validate input
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = generateStudySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { book_id: bookId, chapter } = parsed.data;

  // 2. Auth check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Profile & credits check
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_remaining")
    .eq("id", user.id)
    .single();

  const credits = (profile as Record<string, unknown> | null)?.credits_remaining as number ?? 0;

  // 4. Subscription check
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const hasActiveSubscription = !!subscription;

  // 5. Access check
  if (credits <= 0 && !hasActiveSubscription) {
    return Response.json(
      { error: "No credits remaining and no active subscription" },
      { status: 403 },
    );
  }

  // 6. Stream the study generation
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Fetch Bible passage (with fallback)
        controller.enqueue(
          encoder.encode(sseEvent("data", { status: "fetching_passage" })),
        );
        const passageText = await fetchBiblePassage(bookId, chapter);

        controller.enqueue(
          encoder.encode(sseEvent("data", { status: "generating_study" })),
        );

        // Try OpenAI with retry on parse failure
        let result: Awaited<ReturnType<typeof callOpenAI>> | null = null;
        for (let attempt = 0; attempt < MAX_PARSE_RETRIES; attempt++) {
          result = await callOpenAI(passageText, bookId, chapter);
          if (result.parsed) break;

          controller.enqueue(
            encoder.encode(
              sseEvent("data", {
                status: "retrying",
                attempt: attempt + 1,
                reason: result.error,
              }),
            ),
          );
        }

        if (!result || !result.parsed) {
          // Both attempts failed — do NOT decrement credits
          controller.enqueue(
            encoder.encode(
              sseEvent("error", {
                error: "Failed to generate study after retries",
                details: !result || result.parsed ? undefined : result.error,
              }),
            ),
          );
          controller.close();
          return;
        }

        // Decrement credits (only on success)
        if (credits > 0 && !hasActiveSubscription) {
          await supabase
            .from("profiles")
            .update({
              credits_remaining: credits - 1,
            } as Record<string, unknown>)
            .eq("id", user.id);
        }

        controller.enqueue(
          encoder.encode(sseEvent("done", { study: result.study })),
        );
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            sseEvent("error", {
              error: "Internal server error",
              details: error instanceof Error ? error.message : "Unknown error",
            }),
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
