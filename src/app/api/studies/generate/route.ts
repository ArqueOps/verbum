<<<<<<< HEAD
import { z } from "zod";
import OpenAI from "openai";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const generateStudySchema = z.object({
  book: z.string().min(1),
  chapter: z.number().int().positive(),
  verseStart: z.number().int().positive(),
  verseEnd: z.number().int().positive(),
  bibleVersion: z.string().min(1),
});

const STUDY_SECTIONS = [
  { sectionType: "historical-context", title: "Contexto Hist\u00f3rico", position: 1 },
  { sectionType: "keywords", title: "Palavras-Chave", position: 2 },
  { sectionType: "cross-references", title: "Refer\u00eancias Cruzadas", position: 3 },
  { sectionType: "theological-analysis", title: "An\u00e1lise Teol\u00f3gica", position: 4 },
  { sectionType: "cultural-context", title: "Contexto Cultural", position: 5 },
  { sectionType: "practical-application", title: "Aplica\u00e7\u00e3o Pr\u00e1tica", position: 6 },
  { sectionType: "reflection-questions", title: "Perguntas para Reflex\u00e3o", position: 7 },
] as const;

const SECTION_DELIMITER = "<<<SECTION_BREAK>>>";

function buildSystemPrompt(): string {
  return `You are a biblical scholar and theologian with deep expertise in hermeneutics, biblical languages, and historical context. Generate comprehensive Bible study content in Brazilian Portuguese.

You MUST output exactly 7 sections of content, separated by the exact delimiter: ${SECTION_DELIMITER}

The 7 sections, in order, are:
1. Contexto Hist\u00f3rico \u2014 Historical background of the passage, author, audience, and circumstances.
2. Palavras-Chave \u2014 Key Hebrew/Greek words with original meanings and theological significance.
3. Refer\u00eancias Cruzadas \u2014 Related Bible passages that illuminate the text, with brief explanations.
4. An\u00e1lise Teol\u00f3gica \u2014 Core theological themes, doctrinal implications, and scholarly perspectives.
5. Contexto Cultural \u2014 Cultural practices, customs, and social norms relevant to understanding the passage.
6. Aplica\u00e7\u00e3o Pr\u00e1tica \u2014 How to apply the passage's teachings in daily life today.
7. Perguntas para Reflex\u00e3o \u2014 Thought-provoking questions for personal or group study.

Rules:
- Write ALL content in Brazilian Portuguese.
- Use rich markdown formatting (bold, italics, lists, blockquotes).
- Output ONLY the content of each section (do NOT include section titles/headers).
- Separate each section with exactly: ${SECTION_DELIMITER}
- Do NOT include the delimiter at the beginning or end of your output.
- Each section should be substantive (at least 3-4 paragraphs or equivalent).`;
}

function generateSlug(book: string, chapter: number, verseStart: number, verseEnd: number, version: string): string {
  const bookSlug = book
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");
  const timestamp = Date.now().toString(36);
  return `${bookSlug}-${chapter}-${verseStart}-${verseEnd}-${version.toLowerCase()}-${timestamp}`;
}

export async function POST(request: Request) {
  const startTime = Date.now();

  // 1. Authenticate user
  const supabase = await createServerSupabaseClient();
=======
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

const SECTION_TYPES = [
  "introduction",
  "historical_context",
  "exegesis",
  "theological_reflection",
  "cross_references",
  "practical_application",
  "prayer",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

interface GenerateStudyRequest {
  verseReference: string;
  language?: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const supabase = await createServerSupabaseClient();

>>>>>>> origin/feature/task-804e0646-integration-test-for-sse-study-generation-endpoint
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
<<<<<<< HEAD
    return Response.json(
      { error: "N\u00e3o autenticado", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  // 2. Check credits
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits_remaining")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return Response.json(
      { error: "Perfil n\u00e3o encontrado", code: "PROFILE_NOT_FOUND" },
      { status: 404 },
    );
  }

  const creditsRemaining = (profile as Record<string, unknown>).credits_remaining as number;
  if (creditsRemaining <= 0) {
    return Response.json(
      { error: "Cr\u00e9ditos insuficientes", code: "NO_CREDITS" },
      { status: 402 },
    );
  }

  // 3. Validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Corpo da requisi\u00e7\u00e3o inv\u00e1lido", code: "INVALID_JSON" },
      { status: 400 },
    );
  }

  const parsed = generateStudySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Dados inv\u00e1lidos", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { book, chapter, verseStart, verseEnd, bibleVersion } = parsed.data;
  const verseReference = `${book} ${chapter}:${verseStart}-${verseEnd}`;

  // 4. Stream study generation via SSE
  const encoder = new TextEncoder();
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const stream = new ReadableStream({
    async start(controller) {
      const sections: { sectionType: string; title: string; content: string; position: number }[] = [];

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5.4",
          stream: true,
          temperature: 0.7,
          messages: [
            { role: "system", content: buildSystemPrompt() },
            {
              role: "user",
              content: `Gere um estudo b\u00edblico completo para: ${verseReference} (vers\u00e3o: ${bibleVersion})`,
            },
          ],
        });

        let buffer = "";
        let currentSectionIndex = 0;

        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          buffer += delta;

          // Check for section delimiters in buffer
          let delimiterIndex: number;
          while ((delimiterIndex = buffer.indexOf(SECTION_DELIMITER)) !== -1) {
            const sectionContent = buffer.slice(0, delimiterIndex).trim();
            buffer = buffer.slice(delimiterIndex + SECTION_DELIMITER.length);

            const sectionDef = STUDY_SECTIONS[currentSectionIndex];
            if (sectionDef && sectionContent.length > 0) {
              const sectionData = {
                sectionType: sectionDef.sectionType,
                title: sectionDef.title,
                content: sectionContent,
                position: sectionDef.position,
              };
              sections.push(sectionData);

              const event = JSON.stringify({
                type: "section",
                sectionType: sectionDef.sectionType,
                title: sectionDef.title,
                content: sectionContent,
              });
              controller.enqueue(encoder.encode(`data: ${event}\n\n`));
              currentSectionIndex++;
            }
          }
        }

        // Emit the last section (no trailing delimiter)
        const lastSectionDef = STUDY_SECTIONS[currentSectionIndex];
        if (buffer.trim().length > 0 && lastSectionDef) {
          const sectionData = {
            sectionType: lastSectionDef.sectionType,
            title: lastSectionDef.title,
            content: buffer.trim(),
            position: lastSectionDef.position,
          };
          sections.push(sectionData);

          const event = JSON.stringify({
            type: "section",
            sectionType: lastSectionDef.sectionType,
            title: lastSectionDef.title,
            content: buffer.trim(),
          });
          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        }

        // 5. Persist study and sections to DB
        const generationTimeMs = Date.now() - startTime;
        const fullContent = sections.map((s) => `## ${s.title}\n\n${s.content}`).join("\n\n");
        const slug = generateSlug(book, chapter, verseStart, verseEnd, bibleVersion);
        const studyTitle = `Estudo: ${verseReference} (${bibleVersion})`;

        const { data: study, error: studyError } = await supabase
          .from("studies")
          .insert({
            title: studyTitle,
            content: fullContent,
            verse_reference: verseReference,
            slug,
            model_used: "gpt-5.4",
            owner_id: user.id,
            language: "pt-BR",
          })
          .select("id")
          .single();

        if (studyError || !study) {
          const errorEvent = JSON.stringify({
            type: "error",
            message: "Falha ao salvar estudo",
          });
          controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
          controller.close();
          return;
        }

        // Insert study sections
        const sectionInserts = sections.map((s) => ({
          study_id: study.id,
          title: s.title,
          content: s.content,
          position: s.position,
        }));

        const { error: sectionsError } = await supabase
          .from("study_sections")
          .insert(sectionInserts);

        if (sectionsError) {
          const errorEvent = JSON.stringify({
            type: "error",
            message: "Falha ao salvar se\u00e7\u00f5es do estudo",
          });
          controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
          controller.close();
          return;
        }

        // 6. Decrement credits
        await supabase.rpc("decrement_credits" as never, { user_id: user.id } as never);

        // 7. Emit metadata event
        const metadataEvent = JSON.stringify({
          type: "metadata",
          generationTimeMs,
          studyId: study.id,
          slug,
        });
        controller.enqueue(encoder.encode(`data: ${metadataEvent}\n\n`));
      } catch (error) {
        const errorEvent = JSON.stringify({
          type: "error",
          message: "Erro interno ao gerar estudo",
        });
        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
      } finally {
        controller.close();
      }
=======
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*, plans(*)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const creditsRemaining = getCreditsRemaining(subscription);

  if (creditsRemaining <= 0) {
    return new Response(
      JSON.stringify({ error: "No credits remaining", credits_remaining: 0 }),
      {
        status: 402,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const body: GenerateStudyRequest = await request.json();
  const { verseReference, language = "pt-BR" } = body;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sections: Array<{
        sectionType: SectionType;
        title: string;
        content: string;
        position: number;
      }> = [];

      for (let i = 0; i < SECTION_TYPES.length; i++) {
        const sectionType = SECTION_TYPES[i]!;

        const sectionContent = await generateSection(
          verseReference,
          sectionType,
          language,
        );

        const sectionEvent = {
          type: "section",
          sectionType,
          title: sectionContent.title,
          content: sectionContent.content,
          position: i + 1,
        };

        sections.push({
          sectionType,
          title: sectionContent.title,
          content: sectionContent.content,
          position: i + 1,
        });

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(sectionEvent)}\n\n`),
        );
      }

      const { data: study, error: studyError } = await supabase
        .from("studies")
        .insert({
          title: `Study: ${verseReference}`,
          content: sections.map((s) => s.content).join("\n\n"),
          verse_reference: verseReference,
          slug: generateSlug(verseReference),
          model_used: "gpt-5.4",
          language,
          owner_id: user.id,
        })
        .select("id")
        .single();

      if (studyError || !study) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message: "Failed to save study" })}\n\n`,
          ),
        );
        controller.close();
        return;
      }

      const sectionsToInsert = sections.map((s) => ({
        study_id: study.id,
        title: s.title,
        content: s.content,
        position: s.position,
      }));

      await supabase.from("study_sections").insert(sectionsToInsert);

      const generationTimeMs = Date.now() - startTime;

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "metadata",
            studyId: study.id,
            generationTimeMs,
          })}\n\n`,
        ),
      );

      controller.close();
>>>>>>> origin/feature/task-804e0646-integration-test-for-sse-study-generation-endpoint
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
<<<<<<< HEAD
=======

async function generateSection(
  verseReference: string,
  sectionType: SectionType,
  language: string,
): Promise<{ title: string; content: string }> {
  const apiKey = process.env.OPENAI_API_KEY;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.4",
      messages: [
        {
          role: "system",
          content: `You are a biblical scholar. Generate a "${sectionType}" section for a study on "${verseReference}" in ${language}. Respond with JSON: { "title": "...", "content": "..." }`,
        },
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return { title: parsed.title, content: parsed.content };
}

function generateSlug(verseReference: string): string {
  return verseReference
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getCreditsRemaining(
  subscription: Record<string, unknown> | null,
): number {
  if (!subscription) return 0;

  const plan = subscription.plans as Record<string, unknown> | null;
  if (!plan) return 0;

  const features = plan.features as Record<string, unknown> | null;
  if (!features) return 0;

  const limit = (features.study_limit as number) ?? 0;
  return limit;
}
>>>>>>> origin/feature/task-804e0646-integration-test-for-sse-study-generation-endpoint
