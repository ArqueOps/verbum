"use server";

import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  generateStudyStream,
  parseStudyResponse,
  type StudySection,
  type GenerateStudyParams,
} from "@/lib/openai";
import { fetchBiblePassage } from "@/lib/bible-api";

// --- Constants ---

const MODEL_USED = "gpt-5.4";

// --- Input Validation Schema ---

const generateStudyInputSchema = z.object({
  bookId: z.string().min(1),
  chapter: z.number().int().positive(),
  verseStart: z.number().int().positive(),
  verseEnd: z.number().int().positive().optional(),
  versionId: z.string().min(1),
});

// --- Types ---

export interface GenerateStudyInput {
  bookId: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  versionId: string;
}

export interface StudySectionResult {
  id: string;
  studyId: string;
  sectionType: string;
  title: string;
  content: string;
  displayOrder: number;
}

export interface StudyResult {
  study: {
    id: string;
    title: string;
    verseReference: string;
    slug: string;
    modelUsed: string;
    language: string;
    createdAt: string;
  };
  sections: StudySectionResult[];
  creditsRemaining: number;
  generationTimeMs: number;
}

export interface CreditState {
  creditsRemaining: number;
  hasActiveSubscription: boolean;
  role: "free" | "premium" | "admin";
}

interface StudyActionError {
  error: string;
  creditsRemaining?: number;
}

type GenerateStudyResult =
  | { success: true; data: StudyResult }
  | { success: false; error: StudyActionError };

type GetCreditsResult =
  | { success: true; data: CreditState }
  | { success: false; error: StudyActionError };

// --- Helpers ---

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function collectStreamResponse(params: GenerateStudyParams): Promise<string> {
  let fullResponse = "";
  for await (const chunk of generateStudyStream(params)) {
    fullResponse += chunk;
  }
  return fullResponse;
}

// --- Section type mapping (OpenAI -> DB enum) ---

const SECTION_TYPE_MAP: Record<string, string> = {
  context: "context",
  word_study: "key_words",
  theology: "theological_analysis",
  cross_references: "cross_references",
  commentaries: "historical_context",
  application: "practical_application",
  reflection: "reflection_questions",
};

function mapSectionType(openaiType: string): string {
  return SECTION_TYPE_MAP[openaiType] ?? openaiType;
}

// --- Server Actions ---

export async function generateAndSaveStudy(
  input: GenerateStudyInput,
): Promise<GenerateStudyResult> {
  // 1. Validate input
  const validation = generateStudyInputSchema.safeParse(input);
  if (!validation.success) {
    return {
      success: false,
      error: { error: "VALIDATION_ERROR" },
    };
  }

  const { bookId, chapter, verseStart, verseEnd, versionId } = validation.data;

  // 2. Check authentication
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: { error: "UNAUTHORIZED" },
    };
  }

  // 3. Check credits via RPC before generation
  const { data: creditCheck, error: creditError } = await supabase.rpc(
    "check_user_credits",
    { p_user_id: user.id },
  );

  if (creditError) {
    console.error("check_user_credits RPC error:", creditError);
    return {
      success: false,
      error: { error: "CREDIT_CHECK_FAILED" },
    };
  }

  const creditData = creditCheck as {
    credits_remaining: number;
    has_active_subscription: boolean;
  } | null;

  if (
    creditData &&
    !creditData.has_active_subscription &&
    creditData.credits_remaining <= 0
  ) {
    return {
      success: false,
      error: {
        error: "NO_CREDITS",
        creditsRemaining: 0,
      },
    };
  }

  // 4. Fetch Bible passage text
  let passageText: string | undefined;
  let verseReference: string;

  try {
    const passage = await fetchBiblePassage(
      bookId,
      chapter,
      verseStart,
      verseEnd,
      versionId,
    );
    passageText = passage.text || undefined;
    verseReference = passage.verseReference;
  } catch (err) {
    console.warn("Failed to fetch Bible passage, proceeding without text:", err);
    const endRef = verseEnd ? `-${verseEnd}` : "";
    verseReference = `${bookId} ${chapter}:${verseStart}${endRef}`;
  }

  // 5. Generate study with OpenAI — measure time
  const generateParams: GenerateStudyParams = {
    book: bookId,
    chapter,
    verseStart,
    verseEnd,
    passageText,
    versionId,
  };

  const generationStartMs = Date.now();

  let fullResponse: string;
  let sections: StudySection[];

  try {
    fullResponse = await collectStreamResponse(generateParams);
    sections = parseStudyResponse(fullResponse);
  } catch {
    // Retry once on parse failure
    try {
      fullResponse = await collectStreamResponse(generateParams);
      sections = parseStudyResponse(fullResponse);
    } catch {
      return {
        success: false,
        error: { error: "GENERATION_FAILED" },
      };
    }
  }

  const generationTimeMs = Date.now() - generationStartMs;

  // 6. Build study data for atomic RPC call
  const studyTitle = `Estudo: ${verseReference}`;
  const slug = `${generateSlug(studyTitle)}-${Date.now()}`;

  const sectionsPayload = sections.map((section) => ({
    section_type: mapSectionType(section.section_type),
    title: section.title,
    content: section.content,
    display_order: section.order_index,
  }));

  // 7. Atomic credit consumption + study save via RPC
  const { data: rpcResult, error: saveError } = await supabase.rpc(
    "consume_credit_and_save_study",
    {
      p_user_id: user.id,
      p_title: studyTitle,
      p_content: fullResponse,
      p_verse_reference: verseReference,
      p_slug: slug,
      p_model_used: MODEL_USED,
      p_language: "pt-BR",
      p_generation_time_ms: generationTimeMs,
      p_sections: JSON.stringify(sectionsPayload),
    },
  );

  if (saveError) {
    console.error("consume_credit_and_save_study RPC error:", saveError);

    // Handle race condition: RPC may return NO_CREDITS if credits were consumed
    // between our check and the save attempt
    if (saveError.message?.includes("NO_CREDITS")) {
      return {
        success: false,
        error: {
          error: "NO_CREDITS",
          creditsRemaining: 0,
        },
      };
    }

    return {
      success: false,
      error: { error: "SAVE_FAILED" },
    };
  }

  const result = rpcResult as {
    study_id: string;
    credits_remaining: number;
    sections: Array<{
      id: string;
      section_type: string;
      title: string;
      content: string;
      display_order: number;
    }>;
    created_at: string;
  } | null;

  if (!result) {
    return {
      success: false,
      error: { error: "SAVE_FAILED" },
    };
  }

  // 8. Return structured response
  return {
    success: true,
    data: {
      study: {
        id: result.study_id,
        title: studyTitle,
        verseReference,
        slug,
        modelUsed: MODEL_USED,
        language: "pt-BR",
        createdAt: result.created_at,
      },
      sections: (result.sections ?? []).map((s) => ({
        id: s.id,
        studyId: result.study_id,
        sectionType: s.section_type,
        title: s.title,
        content: s.content,
        displayOrder: s.display_order,
      })),
      creditsRemaining: result.credits_remaining,
      generationTimeMs,
    },
  };
}

export async function getUserCredits(): Promise<GetCreditsResult> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: { error: "UNAUTHORIZED" },
    };
  }

  const { data: creditCheck, error: rpcError } = await supabase.rpc(
    "check_user_credits",
    { p_user_id: user.id },
  );

  if (rpcError) {
    console.error("check_user_credits RPC error:", rpcError);
    return {
      success: false,
      error: { error: "CREDIT_CHECK_FAILED" },
    };
  }

  const creditData = creditCheck as {
    credits_remaining: number;
    has_active_subscription: boolean;
    role: "free" | "premium" | "admin";
  } | null;

  if (!creditData) {
    return {
      success: false,
      error: { error: "CREDIT_CHECK_FAILED" },
    };
  }

  return {
    success: true,
    data: {
      creditsRemaining: creditData.credits_remaining,
      hasActiveSubscription: creditData.has_active_subscription,
      role: creditData.role,
    },
  };
}
