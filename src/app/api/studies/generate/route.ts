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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
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
