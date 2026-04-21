/**
 * "O que a Bíblia diz sobre...?" — prompt e parser.
 *
 * Fonte: companion_memory/verbum-features-completo.md funcionalidade #2.
 *
 * REGRA INEGOCIÁVEL: a resposta deve se basear exclusivamente no texto bíblico.
 * Zero referência externa, zero interpretação particular, zero opinião pastoral.
 * O modelo busca passagens reais e explica o que cada uma diz sobre o tema.
 */

import OpenAI from "openai";
import { APIError } from "openai/error";
import { z } from "zod";

const MODEL = "gpt-5.4";
const TIMEOUT_MS = 60_000;
const MAX_RETRIES = 3;

const RETRYABLE_STATUS = new Set([429, 500, 503]);

// --- Schema ---

export const topicReferenceSchema = z.object({
  title: z.string().min(1),             // "Confiança em meio à ansiedade"
  book: z.string().min(1),              // "Filipenses"
  abbrev: z.string().min(1),            // "Fp"
  chapter: z.number().int().positive(),
  verse_start: z.number().int().positive(),
  verse_end: z.number().int().positive().optional(),
  summary: z.string().min(1),           // "Paulo exorta a não ansiar por nada..."
  detail: z.string().min(1),            // exposição detalhada deste trecho sobre o assunto
});

export const topicResponseSchema = z.object({
  synthesis: z.string().min(1),
  references: z.array(topicReferenceSchema).min(1).max(20),
});

export type TopicReference = z.infer<typeof topicReferenceSchema>;
export type TopicResponse = z.infer<typeof topicResponseSchema>;

export class TopicParseError extends Error {
  constructor(
    message: string,
    public readonly rawText: string,
  ) {
    super(message);
    this.name = "TopicParseError";
  }
}

// --- Client ---

let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set");
    client = new OpenAI({ apiKey, timeout: TIMEOUT_MS });
  }
  return client;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRetryable(err: unknown): boolean {
  return err instanceof APIError && RETRYABLE_STATUS.has(err.status as number);
}

// --- Prompts ---

const SYSTEM_PROMPT = `Você é um teólogo e exegeta bíblico especializado em análise textual profunda nas línguas originais.

Sua tarefa: responder à pergunta "O que a Bíblia diz sobre [ASSUNTO]?" com rigor exegético.

## Regras inegociáveis

1. **Fonte exclusiva**: o próprio texto bíblico. Nada de tradição, teologia sistemática externa, opinião pastoral ou devocional.
2. **Texto original como referência**: quando relevante, cite o termo hebraico/grego e sua nuance.
3. **Precisão de citação**: use referências exatas (livro, capítulo, versículos). Se não houver passagem bíblica clara sobre o assunto, diga explicitamente na síntese.
4. **Sem viés**: político, ideológico, denominacional. Neutralidade acadêmica.
5. **Idioma**: pt-BR. Markdown no summary e detail quando útil.

## Formato da resposta

Retorne um JSON com este formato exato:

\`\`\`json
{
  "synthesis": "Síntese geral do que a Bíblia diz sobre o assunto em 2-4 parágrafos em markdown. Aponta o panorama teológico sem aprofundar em cada passagem.",
  "references": [
    {
      "title": "Título descritivo curto da passagem em relação ao tema",
      "book": "Nome completo do livro (ex: Filipenses, Provérbios, Gênesis)",
      "abbrev": "Abreviatura de 2-3 letras (ex: Fp, Pv, Gn)",
      "chapter": 4,
      "verse_start": 6,
      "verse_end": 7,
      "summary": "Resumo do que esta passagem diz sobre o tema em 1-2 frases.",
      "detail": "Exposição detalhada em markdown: (1) contexto da passagem, (2) o que o texto literalmente diz sobre o tema, (3) termo-chave hebraico/grego se aplicável, (4) como isso responde à pergunta."
    }
  ]
}
\`\`\`

Forneça entre 5 e 15 passagens, organizadas por relevância (mais centrais primeiro). Retorne APENAS o JSON válido, sem code fences, sem texto fora dele.`;

export async function* generateTopicSearchStream(
  query: string,
  language = "pt-BR",
): AsyncGenerator<string> {
  const openai = getClient();
  const userPrompt = `Pergunta: "O que a Bíblia diz sobre ${query}?"\nIdioma da resposta: ${language}\n\nResponda APENAS com o JSON contendo synthesis + references, conforme a estrutura definida.`;

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(1000 * Math.pow(2, attempt - 1));
    }
    try {
      const stream = await openai.chat.completions.create({
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        stream: true,
        temperature: 0.4,
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) yield content;
      }
      return;
    } catch (err) {
      lastError = err;
      if (!isRetryable(err) || attempt === MAX_RETRIES - 1) throw err;
    }
  }
  throw lastError;
}

export function parseTopicResponse(fullText: string): TopicResponse {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fullText.trim());
  } catch {
    throw new TopicParseError("Failed to parse topic response as JSON", fullText);
  }
  const result = topicResponseSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new TopicParseError(
      `Topic response validation failed: ${issues}`,
      fullText,
    );
  }
  return result.data;
}
