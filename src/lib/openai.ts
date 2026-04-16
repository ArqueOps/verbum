import OpenAI from "openai";
import { APIError } from "openai/error";
import { z } from "zod";

// --- Constants ---

export const STUDY_SECTION_TYPES = [
  "context",
  "word_study",
  "theology",
  "cross_references",
  "commentaries",
  "application",
  "reflection",
] as const;

// --- Zod Schemas ---

export const studySectionSchema = z.object({
  section_type: z.enum(STUDY_SECTION_TYPES),
  title: z.string().min(1),
  content: z.string().min(1),
  order_index: z.number().int().min(0).max(6),
});

export const studyResponseSchema = z
  .array(studySectionSchema)
  .length(7)
  .refine(
    (sections) => {
      const types = new Set(sections.map((s) => s.section_type));
      return (
        types.size === 7 &&
        STUDY_SECTION_TYPES.every((t) => types.has(t))
      );
    },
    {
      message:
        "Response must contain exactly one of each section_type: " +
        STUDY_SECTION_TYPES.join(", "),
    },
  )
  .refine(
    (sections) => {
      const sorted = [...sections].sort(
        (a, b) => a.order_index - b.order_index,
      );
      return sorted.every((s, i) => s.order_index === i);
    },
    { message: "order_index must be sequential from 0 to 6" },
  );

// --- Types ---

export type StudySection = z.infer<typeof studySectionSchema>;

export interface GenerateStudyParams {
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  passageText?: string;
  versionId: string;
}

// --- Errors ---

export class StudyParseError extends Error {
  constructor(
    message: string,
    public readonly rawText: string,
  ) {
    super(message);
    this.name = "StudyParseError";
  }
}

// --- OpenAI Client ---

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    client = new OpenAI({ apiKey, timeout: 60_000 });
  }
  return client;
}

// --- Prompts ---

const SYSTEM_PROMPT = `You are a biblical scholar and theologian. Generate a Bible study as a JSON array with exactly 7 sections.

Each section must have:
- "section_type": one of "context", "word_study", "theology", "cross_references", "commentaries", "application", "reflection"
- "title": section title in Portuguese
- "content": rich content in Portuguese using markdown formatting (bold, italic, lists, blockquotes)
- "order_index": integer from 0 to 6, matching this order: context=0, word_study=1, theology=2, cross_references=3, commentaries=4, application=5, reflection=6

Section guidelines:
- context (Contexto Historico): historical, cultural, and literary context of the passage
- word_study (Estudo de Palavras): key Hebrew/Greek words, their meanings and nuances
- theology (Teologia): theological themes and doctrinal insights
- cross_references (Referencias Cruzadas): related passages with brief explanations
- commentaries (Comentarios): scholarly perspectives and traditional interpretations
- application (Aplicacao Pratica): practical applications for daily life
- reflection (Reflexao): devotional questions and meditation prompts

Return ONLY the JSON array. No markdown code fences, no extra text.`;

export { SYSTEM_PROMPT };

export function buildUserPrompt(params: GenerateStudyParams): string {
  const { book, chapter, verseStart, verseEnd, passageText, versionId } =
    params;

  const verseRef = verseEnd
    ? `${book} ${chapter}:${verseStart}-${verseEnd}`
    : `${book} ${chapter}:${verseStart}`;

  let prompt = `Gere um estudo biblico completo para ${verseRef} (versao: ${versionId}).`;

  if (passageText) {
    prompt += `\n\nTexto da passagem:\n"${passageText}"`;
  }

  prompt +=
    "\n\nResponda APENAS com o array JSON contendo as 7 secoes do estudo.";

  return prompt;
}

// --- Retry Logic ---

const RETRYABLE_STATUS_CODES = new Set([429, 500, 503]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

function isRetryableError(error: unknown): boolean {
  return error instanceof APIError && RETRYABLE_STATUS_CODES.has(error.status as number);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Core Functions ---

export async function* generateStudyStream(
  params: GenerateStudyParams,
): AsyncGenerator<string> {
  const openai = getClient();
  const userPrompt = buildUserPrompt(params);

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await sleep(delayMs);
    }

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-5.4",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        temperature: 0.7,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }

      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableError(error) || attempt === MAX_RETRIES - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

export function parseStudyResponse(fullText: string): StudySection[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(fullText.trim());
  } catch {
    throw new StudyParseError(
      "Failed to parse study response as JSON",
      fullText,
    );
  }

  const result = studyResponseSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new StudyParseError(
      `Study response validation failed: ${issues}`,
      fullText,
    );
  }

  return result.data;
}
