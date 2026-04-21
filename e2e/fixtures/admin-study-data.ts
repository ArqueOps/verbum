export interface AdminStudyRow {
  id: string;
  title: string;
  verse_reference: string;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  slug: string;
  unpublish_reason: string | null;
  profiles: { display_name: string | null } | null;
}

export const ADMIN_STUDIES: AdminStudyRow[] = [
  {
    id: "study-admin-001",
    title: "A Fé que Move Montanhas — Mateus 17:20",
    verse_reference: "Mt 17:20",
    is_published: true,
    published_at: "2026-04-10T14:30:00.000Z",
    created_at: "2026-04-10T12:00:00.000Z",
    slug: "a-fe-que-move-montanhas-mt-17-20",
    unpublish_reason: null,
    profiles: { display_name: "Maria Silva" },
  },
  {
    id: "study-admin-002",
    title: "O Sermão do Monte — Mateus 5:1-12",
    verse_reference: "Mt 5:1-12",
    is_published: true,
    published_at: "2026-04-09T10:00:00.000Z",
    created_at: "2026-04-09T08:00:00.000Z",
    slug: "o-sermao-do-monte-mt-5-1-12",
    unpublish_reason: null,
    profiles: { display_name: "João Souza" },
  },
  {
    id: "study-admin-003",
    title: "A Criação do Mundo — Gênesis 1:1-31",
    verse_reference: "Gn 1:1-31",
    is_published: false,
    published_at: null,
    created_at: "2026-04-08T09:00:00.000Z",
    slug: "a-criacao-do-mundo-gn-1-1-31",
    unpublish_reason: "Conteúdo impreciso",
    profiles: { display_name: "Ana Oliveira" },
  },
  {
    id: "study-admin-004",
    title: "O Êxodo do Egito — Êxodo 14:21-31",
    verse_reference: "Êx 14:21-31",
    is_published: true,
    published_at: "2026-04-07T15:00:00.000Z",
    created_at: "2026-04-07T12:00:00.000Z",
    slug: "o-exodo-do-egito-ex-14-21-31",
    unpublish_reason: null,
    profiles: { display_name: "Pedro Santos" },
  },
  {
    id: "study-admin-005",
    title: "A Parábola do Semeador — Lucas 8:4-15",
    verse_reference: "Lc 8:4-15",
    is_published: true,
    published_at: "2026-04-06T11:00:00.000Z",
    created_at: "2026-04-06T09:00:00.000Z",
    slug: "a-parabola-do-semeador-lc-8-4-15",
    unpublish_reason: null,
    profiles: { display_name: "Lucas Pereira" },
  },
];

export const ADMIN_USER = {
  id: "admin-user-001",
  email: "admin@verbum.test",
  role: "authenticated" as const,
  app_metadata: { provider: "email" },
  user_metadata: { name: "Admin User" },
  aud: "authenticated" as const,
  created_at: "2026-01-01T00:00:00Z",
};

export const ADMIN_PROFILE = {
  id: "admin-user-001",
  role: "admin",
  display_name: "Admin User",
  credits_remaining: 999,
};

export const NON_ADMIN_PROFILE = {
  id: "nonadmin-user-001",
  role: "free",
  display_name: "Regular User",
  credits_remaining: 5,
};
