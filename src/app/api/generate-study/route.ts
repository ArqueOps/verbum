import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { fetchBiblePassage } from "@/lib/bible-api";
import {
  generateStudyStream,
  parseStudyResponse,
  type StudySection,
  type GenerateStudyParams,
} from "@/lib/openai";

const TOTAL_TIMEOUT_MS = 60_000;
const MODEL_USED = "gpt-5.4";

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

  // 3. Daily-limit / subscription check (free = 1 estudo/dia; pago = ilimitado)
  const { data: limitData, error: limitError } = await supabase.rpc(
    "check_user_daily_limit",
    { p_user_id: user.id },
  );

  if (limitError || !limitData) {
    return NextResponse.json(
      { error: "Falha ao verificar limite diário.", code: "LIMIT_CHECK_FAILED" },
      { status: 500 },
    );
  }

  const limit = limitData as {
    can_generate: boolean;
    has_active_subscription: boolean;
    studies_today: number;
    daily_limit: number;
  };

  if (!limit.can_generate) {
    return NextResponse.json(
      {
        error:
          "Limite diário atingido. Volte amanhã ou assine um plano para estudos ilimitados.",
        code: "DAILY_LIMIT_REACHED",
      },
      { status: 403 },
    );
  }

  const hasActiveSubscription = limit.has_active_subscription;

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

  const generateParams: GenerateStudyParams = {
    book: book_id,
    chapter,
    verseStart: verse_start,
    verseEnd: verse_end,
    passageText,
    versionId: version_id,
  };

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

        for await (const chunk of generateStudyStream(generateParams)) {
          if (totalAbort.signal.aborted) break;
          fullResponse += chunk;
          sendEvent(chunk);
        }

        // 7. Validate JSON using Zod-based parser
        let sections: StudySection[];
        try {
          sections = parseStudyResponse(fullResponse);
        } catch {
          // Retry 1x
          try {
            let retryResponse = "";
            for await (const chunk of generateStudyStream(generateParams)) {
              if (totalAbort.signal.aborted) break;
              retryResponse += chunk;
            }
            sections = parseStudyResponse(retryResponse);
            fullResponse = retryResponse;
          } catch {
            sendEvent("Erro ao gerar estudo. Tente novamente.", "error");
            return;
          }
        }

        // 8. Save study to DB
        const studyTitle = `Estudo: ${verseReference}`;
        const slug = generateSlug(studyTitle);
        const { data: savedStudy, error: insertError } = await supabase
          .from("studies")
          .insert({
            title: studyTitle,
            content: fullResponse,
            verse_reference: verseReference,
            slug: `${slug}-${Date.now()}`,
            owner_id: user.id,
            model_used: MODEL_USED,
            language: "pt-BR",
          })
          .select("id, slug")
          .single();

        if (insertError || !savedStudy) {
          sendEvent("Erro ao salvar estudo.", "error");
          return;
        }

        // Save sections
        const dbSections = sections.map((section) => ({
          study_id: savedStudy.id,
          title: section.title,
          content: section.content,
          section_type: section.section_type,
          position: section.order_index + 1,
        }));

        await supabase.from("study_sections").insert(dbSections);

        // No credit decrement — daily limit is derived from COUNT(studies today).
        // Free users that hit limit will be blocked on the next /api/generate-study
        // request via check_user_daily_limit.
        void hasActiveSubscription;

        sendEvent(savedStudy.slug, "done");
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
