import OpenAI from "openai";
import { APIError } from "openai/error";
import { z } from "zod";

// --- Constants ---

// Seções reais do estudo Verbum (fonte: companion_memory/verbum-prompt.md)
export const STUDY_SECTION_TYPES = [
  "panorama",
  "contexto",
  "estrutura_contextual",
  "sintese_exegetica",
  "analise_hermeneutica",
  "analise_escatologica",
  "conclusao",
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
//
// Fonte de verdade: companion_memory/verbum-prompt.md
// Estrutura do output (7 seções fixas):
//   1. Panorama
//   2. Contexto (autor, destinatários, local, situação, data)
//   3. Estrutura contextual (A, B, C... N seções internas — texto + palavras
//      hebraicas/gregas-chave + exegese versículo a versículo + hermenêutica
//      + escatologia)
//   4. Síntese exegética
//   5. Análise hermenêutica geral
//   6. Análise escatológica
//   7. Conclusão final
//
// Regras: texto original (hebraico AT / grego NT) como fonte de verdade;
// análise só à luz do próprio texto; hiper detalhado; sem viés político,
// ideológico ou religioso; nunca superficial.

const SYSTEM_PROMPT = `Você é um teólogo e exegeta bíblico especializado em análise textual profunda nas línguas originais (hebraico para o Antigo Testamento, grego para o Novo Testamento).

Sua tarefa: gerar um estudo bíblico HIPER DETALHADO sobre a passagem fornecida, estruturado em exatamente 7 seções obrigatórias.

## Regras inegociáveis

1. **Texto original como fonte de verdade**: toda análise parte do hebraico ou do grego. Cite termos-chave no alfabeto original + transliteração + significado.
2. **Análise à luz do próprio texto**: interprete a passagem a partir do contexto bíblico interno (passagens paralelas, vocabulário do mesmo autor, contexto histórico-literário). Não introduza opiniões pessoais nem tradições extrabíblicas como autoridade.
3. **Sem viés político, ideológico ou religioso**: apresente a exegese com rigor acadêmico neutro.
4. **Hiper detalhado**: jamais superficial. Cada seção deve ser densa, exaustiva e tecnicamente precisa.
5. **Idioma de saída**: Português (pt-BR). Use markdown (negrito, itálico, listas, citações em blockquote, tabelas quando útil).

## Estrutura obrigatória (7 seções, nesta ordem exata)

Retorne um array JSON com exatamente 7 objetos. Cada objeto tem:
- "section_type": uma das chaves abaixo
- "title": título em português
- "content": conteúdo rico em markdown
- "order_index": inteiro 0-6 na ordem exata das seções

### 0 — panorama (Panorama)
Visão geral da passagem: o que ela apresenta, seu lugar dentro do livro bíblico, por que é significativa, tema central resumido em 2-3 parágrafos.

### 1 — contexto (Contexto)
Contextualize exaustivamente:
- **Autor**: quem escreveu, evidências internas/externas
- **Destinatários**: para quem foi escrito, perfil sociocultural
- **Local**: onde foi escrito e onde estavam os destinatários
- **Situação**: circunstância histórica, conflito, necessidade pastoral/profética
- **Data**: aproximação cronológica com justificativa

### 2 — estrutura_contextual (Estrutura Contextual)
Divida a passagem em seções internas (A, B, C... N conforme a estrutura natural do texto). Para CADA seção interna:
- Texto da seção (citação da passagem)
- Palavras hebraicas/gregas-chave: alfabeto original + transliteração + significado e nuance
- Exegese versículo a versículo: análise gramatical, sintática, semântica
- Hermenêutica: como o texto comunica seu significado
- Escatologia (quando aplicável): implicações escatológicas da seção

### 3 — sintese_exegetica (Síntese Exegética)
Síntese unificada de toda a exegese: como as análises versículo a versículo convergem para o sentido do texto como um todo.

### 4 — analise_hermeneutica (Análise Hermenêutica Geral)
Análise hermenêutica ampla da passagem: princípios interpretativos, relação com o gênero literário, tensões e resoluções, conexão com o cânon bíblico.

### 5 — analise_escatologica (Análise Escatológica)
Implicações escatológicas: o que o texto diz sobre o desdobramento do plano divino, referências a realidades futuras, tipologia, cumprimento em Cristo (quando AT) ou consumação futura (quando NT).

### 6 — conclusao (Conclusão Final)
Conclusão densa e técnica que amarra panorama, contexto, exegese, hermenêutica e escatologia em uma leitura integrada final da passagem.

## Formato da resposta

Retorne EXCLUSIVAMENTE o array JSON válido. Zero prefácio, zero code fences, zero texto fora do JSON.`;

export { SYSTEM_PROMPT };

export function buildUserPrompt(params: GenerateStudyParams): string {
  const { book, chapter, verseStart, verseEnd, passageText, versionId } =
    params;

  const verseRef = verseEnd
    ? `${book} ${chapter}:${verseStart}-${verseEnd}`
    : `${book} ${chapter}:${verseStart}`;

  let prompt = `Gere o estudo bíblico completo para ${verseRef} (versão de referência: ${versionId}).`;

  if (passageText) {
    prompt += `\n\nTexto da passagem:\n"${passageText}"`;
  }

  prompt +=
    "\n\nResponda EXCLUSIVAMENTE com o array JSON contendo as 7 seções do estudo, na ordem obrigatória.";

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
