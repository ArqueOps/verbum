import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  generateTopicSearchStream,
  parseTopicResponse,
} from "@/lib/openai-topic";

const TOTAL_TIMEOUT_MS = 60_000;

const bodySchema = z.object({
  query: z.string().min(3).max(200),
  language: z.string().optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo inválido", code: "INVALID_BODY" },
      { status: 400 },
    );
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }
  const { query, language = "pt-BR" } = parsed.data;

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

  // Uses the same daily limit system as /generate-study
  // (conceptually, a topic search is also a consumption of the AI budget).
  const { data: limitData } = await supabase.rpc("check_user_daily_limit", {
    p_user_id: user.id,
  });
  const limit = limitData as {
    can_generate: boolean;
    has_active_subscription: boolean;
  } | null;
  if (!limit?.can_generate) {
    return NextResponse.json(
      {
        error:
          "Limite diário atingido. Volte amanhã ou assine um plano para continuar.",
        code: "DAILY_LIMIT_REACHED",
      },
      { status: 403 },
    );
  }

  const totalAbort = new AbortController();
  const totalTimeout = setTimeout(() => totalAbort.abort(), TOTAL_TIMEOUT_MS);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string, event?: string) => {
        if (event) {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
        } else {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
      };

      try {
        let fullResponse = "";
        for await (const chunk of generateTopicSearchStream(query, language)) {
          if (totalAbort.signal.aborted) break;
          fullResponse += chunk;
          send(chunk);
        }

        const parsedTopic = parseTopicResponse(fullResponse);

        const { data: saved, error: insertError } = await supabase
          .from("topic_searches")
          .insert({
            user_id: user.id,
            query,
            synthesis: parsedTopic.synthesis,
            results: parsedTopic.references,
            language,
          })
          .select("id")
          .single();

        if (insertError) {
          console.error("Failed to persist topic_search:", insertError);
        }

        send(JSON.stringify({ id: saved?.id, ...parsedTopic }), "done");
      } catch (err) {
        const message = totalAbort.signal.aborted
          ? "Tempo limite excedido."
          : "Erro ao processar a busca.";
        console.error("Topic search error:", err);
        send(message, "error");
      } finally {
        clearTimeout(totalTimeout);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
