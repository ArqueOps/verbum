/**
 * Integration tests for search_published_studies RPC function.
 *
 * Tests verify that the PostgreSQL RPC function correctly:
 *   1. Full-text search matches in title field
 *   2. Full-text search matches in content field
 *   3. Portuguese stemming works (e.g. 'oração' matches 'orações')
 *   4. Testament filter ('old'/'new') returns correct subset
 *   5. Book filter (book_id) returns correct subset
 *   6. Combined filters return correct intersection
 *   7. Only is_public=true studies are returned
 *   8. Empty results return empty array
 *   9. Empty query with no filters returns all published studies
 *
 * Uses real Supabase instance with service role client for setup/teardown
 * and anon client for RPC calls (function grants to anon and authenticated).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const SUPABASE_URL = `https://${process.env.CRED_SUPABASE_PROJECT_REF}.supabase.co`;
const ANON_KEY = process.env.CRED_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.CRED_SUPABASE_SERVICE_ROLE_KEY!;

// ---------------------------------------------------------------------------
// Client factories
// ---------------------------------------------------------------------------

function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

describe("search_published_studies RPC", () => {
  let serviceClient: SupabaseClient;
  let anonClient: SupabaseClient;
  let testUserId: string;

  // Bible book IDs fetched from the real DB
  let genesisBookId: string;
  let salmoBookId: string;
  let joaoBookId: string;

  // Study IDs for cleanup
  const studyIds: string[] = [];

  beforeAll(async () => {
    serviceClient = createServiceClient();
    anonClient = createAnonClient();

    // Create test user
    const email = `search-rpc-test-${Date.now()}@test.verbum.app`;
    const { data: authUser, error: authError } =
      await serviceClient.auth.admin.createUser({
        email,
        password: "TestPassword123!",
        email_confirm: true,
      });

    if (authError) throw new Error(`Failed to create test user: ${authError.message}`);
    testUserId = authUser.user.id;

    // Fetch real bible_books for test references
    const { data: books, error: booksError } = await serviceClient
      .from("bible_books")
      .select("id, name, testament")
      .in("name", ["Gênesis", "Salmos", "João"]);

    if (booksError) throw new Error(`Failed to fetch bible_books: ${booksError.message}`);
    if (!books || books.length < 3) {
      throw new Error(
        `Expected 3 bible_books (Gênesis, Salmos, João), got ${books?.length ?? 0}. ` +
        `Found: ${books?.map((b: { name: string }) => b.name).join(", ")}`
      );
    }

    for (const book of books) {
      if (book.name === "Gênesis") genesisBookId = book.id;
      if (book.name === "Salmos") salmoBookId = book.id;
      if (book.name === "João") joaoBookId = book.id;
    }

    // Insert test studies via service role (bypasses RLS)
    const studies = [
      {
        user_id: testUserId,
        title: "A Criação do Mundo e a Soberania Divina",
        content: "Estudo sobre como Deus criou todas as coisas com sabedoria e poder.",
        book: "Gênesis",
        chapter: 1,
        verse_start: 1,
        verse_end: 31,
        is_public: true,
      },
      {
        user_id: testUserId,
        title: "As Orações dos Salmos",
        content: "Uma análise das orações de louvor e súplica encontradas nos Salmos.",
        book: "Salmos",
        chapter: 23,
        verse_start: 1,
        verse_end: 6,
        is_public: true,
      },
      {
        user_id: testUserId,
        title: "O Amor de Deus em João",
        content: "Porque Deus amou o mundo de tal maneira que deu o seu Filho.",
        book: "João",
        chapter: 3,
        verse_start: 16,
        verse_end: 16,
        is_public: true,
      },
      {
        // Private study — should NEVER appear in results
        user_id: testUserId,
        title: "Estudo Privado sobre Fé",
        content: "Este estudo não deveria aparecer nos resultados de busca.",
        book: "Gênesis",
        chapter: 15,
        verse_start: 6,
        verse_end: 6,
        is_public: false,
      },
    ];

    for (const study of studies) {
      const { data, error } = await serviceClient
        .from("studies")
        .insert(study)
        .select("id")
        .single();

      if (error) throw new Error(`Failed to insert study "${study.title}": ${error.message}`);
      studyIds.push(data!.id);
    }
  }, 30_000);

  afterAll(async () => {
    // Clean up test data
    for (const id of studyIds) {
      await serviceClient.from("studies").delete().eq("id", id);
    }
    if (testUserId) {
      await serviceClient.from("profiles").delete().eq("id", testUserId);
      await serviceClient.auth.admin.deleteUser(testUserId);
    }
  });

  // =========================================================================
  // 1. Full-text search — title match
  // =========================================================================

  it("should find studies matching by title", async () => {
    const { data, error } = await anonClient.rpc("search_published_studies", {
      query: "Criação do Mundo",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);

    const ids = data!.map((r: { id: string }) => r.id);
    expect(ids).toContain(studyIds[0]); // "A Criação do Mundo..."
  });

  // =========================================================================
  // 2. Full-text search — content match
  // =========================================================================

  it("should find studies matching by content", async () => {
    const { data, error } = await anonClient.rpc("search_published_studies", {
      query: "louvor súplica",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const ids = data!.map((r: { id: string }) => r.id);
    expect(ids).toContain(studyIds[1]); // "As Orações dos Salmos"
  });

  // =========================================================================
  // 3. Portuguese stemming (singular → plural)
  // =========================================================================

  it("should find studies using Portuguese stemming (Salmo → Salmos)", async () => {
    // Portuguese Snowball stemmer reduces regular plurals to the same stem
    // "Salmo" (singular) should match "Salmos" (plural) in title/content
    const { data, error } = await anonClient.rpc("search_published_studies", {
      query: "Salmo",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const ids = data!.map((r: { id: string }) => r.id);
    // Study with "Salmos" in title should be found via stemmed "Salmo"
    expect(ids).toContain(studyIds[1]); // "As Orações dos Salmos"
  });

  // =========================================================================
  // 4. Testament filter
  // =========================================================================

  it("should filter by testament='old' (Antigo Testamento)", async () => {
    const { data, error } = await anonClient.rpc("search_published_studies", {
      testament: "old",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);

    // All returned studies should have book_testament = 'OT'
    for (const row of data!) {
      expect(row.book_testament).toBe("OT");
    }

    const ids = data!.map((r: { id: string }) => r.id);
    // Gênesis study should be present (OT)
    expect(ids).toContain(studyIds[0]);
    // Salmos study should be present (OT)
    expect(ids).toContain(studyIds[1]);
    // João study should NOT be present (NT)
    expect(ids).not.toContain(studyIds[2]);
  });

  it("should filter by testament='new' (Novo Testamento)", async () => {
    const { data, error } = await anonClient.rpc("search_published_studies", {
      testament: "new",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    for (const row of data!) {
      expect(row.book_testament).toBe("NT");
    }

    const ids = data!.map((r: { id: string }) => r.id);
    // João study should be present (NT)
    expect(ids).toContain(studyIds[2]);
    // Gênesis and Salmos should NOT be present (OT)
    expect(ids).not.toContain(studyIds[0]);
    expect(ids).not.toContain(studyIds[1]);
  });

  // =========================================================================
  // 5. Book filter (book_id)
  // =========================================================================

  it("should filter by book_id", async () => {
    const { data, error } = await anonClient.rpc("search_published_studies", {
      book_id: salmoBookId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const ids = data!.map((r: { id: string }) => r.id);
    // Only the Salmos study should match
    expect(ids).toContain(studyIds[1]);
    expect(ids).not.toContain(studyIds[0]);
    expect(ids).not.toContain(studyIds[2]);
  });

  // =========================================================================
  // 6. Combined filters (query + testament + book_id)
  // =========================================================================

  it("should return correct intersection with combined filters", async () => {
    // Search for "Criação" in the Old Testament, book = Gênesis
    const { data, error } = await anonClient.rpc("search_published_studies", {
      query: "Criação",
      testament: "old",
      book_id: genesisBookId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const ids = data!.map((r: { id: string }) => r.id);
    expect(ids).toContain(studyIds[0]); // Gênesis study matches all 3 filters
    expect(ids).not.toContain(studyIds[1]); // Salmos — wrong book_id
    expect(ids).not.toContain(studyIds[2]); // João — wrong testament
  });

  it("should return empty when combined filters have no intersection", async () => {
    // Search for "Criação" but in João (NT) — no match
    const { data, error } = await anonClient.rpc("search_published_studies", {
      query: "Criação",
      book_id: joaoBookId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toHaveLength(0);
  });

  // =========================================================================
  // 7. Only is_public=true studies are returned
  // =========================================================================

  it("should never return private (is_public=false) studies", async () => {
    // The private study has "Fé" in the title — search for it
    const { data, error } = await anonClient.rpc("search_published_studies", {
      query: "Estudo Privado",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const ids = data!.map((r: { id: string }) => r.id);
    // studyIds[3] is the private study — must NOT appear
    expect(ids).not.toContain(studyIds[3]);
  });

  it("should not include private studies even when no filters are applied", async () => {
    const { data, error } = await anonClient.rpc("search_published_studies", {});

    expect(error).toBeNull();
    expect(data).toBeDefined();

    const ids = data!.map((r: { id: string }) => r.id);
    expect(ids).not.toContain(studyIds[3]);
  });

  // =========================================================================
  // 8. Empty query with no filters returns all published studies
  // =========================================================================

  it("should return all published studies when no filters provided", async () => {
    const { data, error } = await anonClient.rpc("search_published_studies", {});

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);

    const ids = data!.map((r: { id: string }) => r.id);
    // All 3 public studies should be present
    expect(ids).toContain(studyIds[0]);
    expect(ids).toContain(studyIds[1]);
    expect(ids).toContain(studyIds[2]);
    // Private study must not appear
    expect(ids).not.toContain(studyIds[3]);
  });

  // =========================================================================
  // 9. No matches returns empty array
  // =========================================================================

  it("should return empty array when no studies match the query", async () => {
    const { data, error } = await anonClient.rpc("search_published_studies", {
      query: "xyznonexistentquerythatmatchesnothing",
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data).toEqual([]);
  });

  // =========================================================================
  // 10. Return shape validation
  // =========================================================================

  it("should return correct fields and verse_reference format", async () => {
    const { data, error } = await anonClient.rpc("search_published_studies", {
      book_id: genesisBookId,
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    expect(data!.length).toBeGreaterThanOrEqual(1);

    const study = data!.find((r: { id: string }) => r.id === studyIds[0]);
    expect(study).toBeDefined();

    // Validate return shape
    expect(study).toHaveProperty("id");
    expect(study).toHaveProperty("title");
    expect(study).toHaveProperty("verse_reference");
    expect(study).toHaveProperty("book_name");
    expect(study).toHaveProperty("book_abbreviation");
    expect(study).toHaveProperty("book_testament");
    expect(study).toHaveProperty("created_at");

    // Validate verse_reference format: "Gênesis 1:1-31"
    expect(study!.verse_reference).toBe("Gênesis 1:1-31");
    expect(study!.book_name).toBe("Gênesis");
    expect(study!.book_testament).toBe("OT");
  });

  // =========================================================================
  // 11. Results are ordered by created_at DESC
  // =========================================================================

  it("should return results ordered by created_at DESC", async () => {
    const { data, error } = await anonClient.rpc("search_published_studies", {});

    expect(error).toBeNull();
    expect(data).toBeDefined();

    // Filter to only our test studies for ordering check
    const testResults = data!.filter((r: { id: string }) => studyIds.includes(r.id));

    for (let i = 1; i < testResults.length; i++) {
      const prev = new Date(testResults[i - 1].created_at).getTime();
      const curr = new Date(testResults[i].created_at).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });
});
