import OpenAI from "openai";

const OPENAI_MODEL = "gpt-4o";

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("Missing environment variable: OPENAI_API_KEY");
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export const STUDY_SECTION_TYPES = [
  "context",
  "interpretation",
  "application",
  "cross_references",
  "reflection",
  "prayer",
  "summary",
] as const;

export type StudySectionType = (typeof STUDY_SECTION_TYPES)[number];

export interface StudySection {
  section_type: StudySectionType;
  title: string;
  content: string;
}

export interface GeneratedStudy {
  title: string;
  sections: StudySection[];
}

function buildStudyPrompt(verseReference: string, passageText?: string): string {
  const passageBlock = passageText
    ? `\n\nTexto da passagem:\n${passageText}`
    : "";

  return `Você é um teólogo e professor bíblico experiente. Gere um estudo bíblico completo e profundo sobre a passagem: ${verseReference}.${passageBlock}

Responda SOMENTE com um JSON válido (sem markdown, sem texto antes ou depois) com a seguinte estrutura:
{
  "title": "Título do estudo",
  "sections": [
    { "section_type": "context", "title": "Contexto Histórico e Cultural", "content": "..." },
    { "section_type": "interpretation", "title": "Interpretação do Texto", "content": "..." },
    { "section_type": "application", "title": "Aplicação Prática", "content": "..." },
    { "section_type": "cross_references", "title": "Referências Cruzadas", "content": "..." },
    { "section_type": "reflection", "title": "Perguntas para Reflexão", "content": "..." },
    { "section_type": "prayer", "title": "Sugestão de Oração", "content": "..." },
    { "section_type": "summary", "title": "Resumo do Estudo", "content": "..." }
  ]
}

O estudo deve ser em português brasileiro, profundo, acessível e teologicamente fundamentado.
Cada seção deve ter conteúdo rico e detalhado (mínimo 3 parágrafos por seção, exceto prayer).
TODOS os 7 section_types são obrigatórios.`;
}

export async function streamStudyGeneration(
  verseReference: string,
  passageText?: string,
  signal?: AbortSignal,
): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const client = getOpenAIClient();

  const stream = await client.chat.completions.create(
    {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente teológico que gera estudos bíblicos estruturados em JSON.",
        },
        {
          role: "user",
          content: buildStudyPrompt(verseReference, passageText),
        },
      ],
      stream: true,
      temperature: 0.7,
      max_tokens: 4096,
    },
    { signal },
  );

  return stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
}

export async function generateStudyNonStreaming(
  verseReference: string,
  passageText?: string,
  signal?: AbortSignal,
): Promise<string> {
  const client = getOpenAIClient();

  const response = await client.chat.completions.create(
    {
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "Você é um assistente teológico que gera estudos bíblicos estruturados em JSON.",
        },
        {
          role: "user",
          content: buildStudyPrompt(verseReference, passageText),
        },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    },
    { signal },
  );

  return response.choices[0]?.message?.content ?? "";
}

export function validateStudyJson(raw: string): GeneratedStudy | null {
  try {
    const parsed = JSON.parse(raw);

    if (
      typeof parsed.title !== "string" ||
      !Array.isArray(parsed.sections) ||
      parsed.sections.length < 7
    ) {
      return null;
    }

    const sectionTypes = new Set(
      parsed.sections.map((s: StudySection) => s.section_type),
    );

    for (const required of STUDY_SECTION_TYPES) {
      if (!sectionTypes.has(required)) return null;
    }

    for (const section of parsed.sections) {
      if (
        typeof section.section_type !== "string" ||
        typeof section.title !== "string" ||
        typeof section.content !== "string"
      ) {
        return null;
      }
    }

    return parsed as GeneratedStudy;
  } catch {
    return null;
  }
}
