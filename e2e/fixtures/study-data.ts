/**
 * Typed fixtures for public study page E2E tests.
 * Used by page.route() to intercept Supabase PostgREST calls.
 *
 * Shapes align with the studies + profiles tables in the DB schema.
 */

export interface StudyRow {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  verse_reference: string;
  content: string;
  model_used: string;
  language: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export const PUBLISHED_STUDY_SLUG = "a-fe-que-move-montanhas-mt-17-20";

export const PUBLISHED_STUDY: StudyRow = {
  id: "study-e2e-001",
  owner_id: "profile-e2e-001",
  slug: PUBLISHED_STUDY_SLUG,
  title: "A Fé que Move Montanhas — Mateus 17:20",
  verse_reference: "Mt 17:20",
  content: [
    "## Contexto Histórico",
    "Este versículo faz parte do diálogo de Jesus com seus discípulos após a incapacidade de curar um menino epiléptico.",
    "",
    "## Análise do Texto Original",
    "A palavra grega para fé (*pistis*) indica confiança plena e inabalável.",
    "",
    "## Interpretação Teológica",
    "Jesus usa a metáfora da semente de mostarda para ilustrar que a fé não depende de quantidade, mas de qualidade.",
    "",
    "## Aplicação Prática",
    "A fé genuína não é medida por grandeza, mas pela direção — deve estar voltada para Deus.",
    "",
    "## Conexões com Outros Textos",
    "Compare com Marcos 11:23 e Lucas 17:6, onde a mesma lição é repetida em contextos diferentes.",
    "",
    "## Reflexão Devocional",
    "Considere: em quais áreas da sua vida você tem permitido a dúvida ocupar o lugar da fé?",
    "",
    "## Oração Sugerida",
    "Senhor, aumenta a minha fé. Ajuda-me a confiar em Ti mesmo quando as circunstâncias parecem impossíveis. Amém.",
  ].join("\n"),
  model_used: "gpt-5.4",
  language: "pt",
  is_published: true,
  published_at: "2026-04-10T14:30:00.000Z",
  created_at: "2026-04-10T12:00:00.000Z",
  updated_at: "2026-04-10T14:30:00.000Z",
};

export const STUDY_AUTHOR: ProfileRow = {
  id: "profile-e2e-001",
  display_name: "Maria Silva",
  avatar_url: null,
};

/** The 7 sections expected in the study content (## headings) */
export const EXPECTED_SECTIONS = [
  "Contexto Histórico",
  "Análise do Texto Original",
  "Interpretação Teológica",
  "Aplicação Prática",
  "Conexões com Outros Textos",
  "Reflexão Devocional",
  "Oração Sugerida",
];
