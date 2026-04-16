import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchBiblePassage } from "@/lib/bible-api";
import {
  streamStudyGeneration,
  generateStudyNonStreaming,
  validateStudyJson,
  type GeneratedStudy,
} from "@/lib/openai";

const TOTAL_TIMEOUT_MS = 60_000;
const MODEL_USED = "gpt-4o";

const requestSchema = z.object({
  book_id: z.string().min(1),
  chapter: z.number().int().positive(),
  verse_start: z.number().int().positive(),
  verse_end: z.number().int().positive().optional(),
  version_id: z.string().min(1),
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export async function POST(request: NextRequest) {
  // 1. Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const validation = requestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Dados de entrada inválidos",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  const { book_id, chapter, verse_start, verse_end, version_id } =
    validation.data;

  // 2. Auth check
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Não autenticado", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  // 3. Credits/subscription check
  const { data: profile } = await supabase
    .from("profiles")
    .select("credits_remaining")
    .eq("id", user.id)
    .single();

  const { data: activeSubscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("current_period_end", new Date().toISOString())
    .limit(1)
    .single();

  const hasActiveSubscription = !!activeSubscription;
  const creditsRemaining = (profile as Record<string, unknown>)
    ?.credits_remaining as number | null;

  if (!hasActiveSubscription && (creditsRemaining === 0 || creditsRemaining === null)) {
    return NextResponse.json(
      {
        error: "Créditos insuficientes. Adquira um plano para continuar.",
        code: "INSUFFICIENT_CREDITS",
      },
      { status: 403 },
    );
  }

  // 4. Fetch passage text with 5s timeout
  let passageText: string | undefined;
  let verseReference: string;

  try {
    const passage = await fetchBiblePassage(
      book_id,
      chapter,
      verse_start,
      verse_end,
      version_id,
    );
    passageText = passage.text || undefined;
    verseReference = passage.verseReference;
  } catch (err) {
    console.warn("Failed to fetch Bible passage, proceeding without text:", err);
    const endRef = verse_end ? `-${verse_end}` : "";
    verseReference = `${book_id} ${chapter}:${verse_start}${endRef}`;
  }

  // 5-9. Stream response via SSE
  const totalAbort = new AbortController();
  const totalTimeout = setTimeout(
    () => totalAbort.abort(),
    TOTAL_TIMEOUT_MS,
  );

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function sendEvent(data: string, event?: string) {
        if (event) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      }

      try {
        // Stream from OpenAI
        let fullResponse = "";
        const streamIterable = await streamStudyGeneration(
          verseReference,
          passageText,
          totalAbort.signal,
        );

        for await (const chunk of streamIterable) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullResponse += content;
            sendEvent(content);
          }
        }

        // 7. Validate JSON
        let study: GeneratedStudy | null = validateStudyJson(fullResponse);

        if (!study) {
          // Retry 1x non-streaming
          try {
            const retryResponse = await generateStudyNonStreaming(
              verseReference,
              passageText,
              totalAbort.signal,
            );
            study = validateStudyJson(retryResponse);
          } catch {
            // Retry also failed
          }

          if (!study) {
            sendEvent("Erro ao gerar estudo. Tente novamente.", "error");
            return;
          }
        }

        // 8. Save study to DB
        const slug = generateSlug(study.title);
        const { data: savedStudy, error: insertError } = await supabase
          .from("studies")
          .insert({
            title: study.title,
            content: fullResponse,
            verse_reference: verseReference,
            slug: `${slug}-${Date.now()}`,
            owner_id: user.id,
            model_used: MODEL_USED,
            language: "pt-BR",
          })
          .select("id")
          .single();

        if (insertError || !savedStudy) {
          sendEvent("Erro ao salvar estudo.", "error");
          return;
        }

        // Save sections
        const sections = study.sections.map((section, index) => ({
          study_id: savedStudy.id,
          title: section.title,
          content: section.content,
          position: index + 1,
        }));

        await supabase.from("study_sections").insert(sections);

        // Decrement credits only if no active subscription
        if (!hasActiveSubscription && creditsRemaining && creditsRemaining > 0) {
          await supabase
            .from("profiles")
            .update({
              credits_remaining: creditsRemaining - 1,
            } as Record<string, unknown>)
            .eq("id", user.id);
        }

        // Increment study count (best effort)
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("study_count")
          .eq("id", user.id)
          .single();

        if (currentProfile) {
          await supabase
            .from("profiles")
            .update({ study_count: currentProfile.study_count + 1 })
            .eq("id", user.id);
        }

        sendEvent(savedStudy.id, "done");
      } catch (err) {
        const message =
          totalAbort.signal.aborted
            ? "Tempo limite excedido."
            : "Erro interno ao gerar estudo.";
        console.error("Study generation error:", err);
        sendEvent(message, "error");
      } finally {
        clearTimeout(totalTimeout);
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
