import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Config: Supabase admin access for test data setup / teardown
// ---------------------------------------------------------------------------

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  `https://${process.env.CRED_SUPABASE_PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.CRED_SUPABASE_SERVICE_ROLE_KEY ?? "";
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-test@verbum.test";

/**
 * Slug format produced by generateStudySlug:
 * {book}-{chapter}-{vStart}[-{vEnd}]-estudo[-{suffix}]
 * e.g. genesis-1-1-5-estudo, genesis-1-1-estudo, genesis-1-1-5-estudo-2
 */
const PUBLICATION_SLUG_RE = /^[a-z]+-\d+-\d+(-\d+)?-estudo(-\d+)?$/;

// ---------------------------------------------------------------------------
// Helper: Supabase admin requests (service_role_key bypasses RLS)
// ---------------------------------------------------------------------------

async function supabaseAdmin(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      ...(init.headers as Record<string, string>),
    },
  });
}

async function getTestUserId(): Promise<string> {
  const res = await supabaseAdmin("/auth/v1/admin/users");
  if (!res.ok) throw new Error(`Failed to list users: ${res.status}`);
  const data = await res.json();
  const user = data.users?.find(
    (u: { email: string }) => u.email === TEST_EMAIL,
  );
  if (!user) {
    throw new Error(
      `Test user "${TEST_EMAIL}" not found. Run: node e2e/create-test-user.mjs`,
    );
  }
  return user.id as string;
}

async function createTestStudy(
  ownerId: string,
): Promise<{ id: string; slug: string }> {
  const slug = `e2e-publish-test-${Date.now()}`;
  const res = await supabaseAdmin("/rest/v1/studies", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      title: "Estudo: Gn 1:1-5",
      verse_reference: "Gn 1:1-5",
      content: "E2E test content for publish/unpublish flow validation.",
      model_used: "gpt-5.4",
      language: "pt",
      slug,
      is_published: false,
      owner_id: ownerId,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create test study: ${res.status} — ${body}`);
  }

  const rows = await res.json();
  const study = Array.isArray(rows) ? rows[0] : rows;
  return { id: study.id, slug: study.slug };
}

async function deleteTestStudy(studyId: string): Promise<void> {
  await supabaseAdmin(`/rest/v1/studies?id=eq.${studyId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Tests — Publish / Unpublish / Re-publish flow
// ---------------------------------------------------------------------------

test.describe("Publish and unpublish study flow", () => {
  let studyId: string;
  let initialSlug: string;

  test.beforeAll(async () => {
    if (!SERVICE_ROLE_KEY) {
      throw new Error(
        "CRED_SUPABASE_SERVICE_ROLE_KEY is required for E2E data setup",
      );
    }
    const userId = await getTestUserId();
    const study = await createTestStudy(userId);
    studyId = study.id;
    initialSlug = study.slug;
  });

  test.afterAll(async () => {
    if (studyId) {
      await deleteTestStudy(studyId);
    }
  });

  test("publish, unpublish, and re-publish preserves slug", async ({
    page,
  }) => {
    // -----------------------------------------------------------------------
    // Step 1: Navigate to /meus-estudos and find the test study
    // -----------------------------------------------------------------------
    await page.goto("/meus-estudos");

    // Locate the <li> containing our study card by its unique href
    const studyItem = page.locator("li").filter({
      has: page.locator(`a[href="/estudos/${initialSlug}"]`),
    });
    await expect(studyItem).toBeVisible({ timeout: 10_000 });

    // Verify initial draft state
    await expect(studyItem.getByText("Rascunho")).toBeVisible();

    // -----------------------------------------------------------------------
    // Step 2: Publish — click button, verify badge + slug format
    // -----------------------------------------------------------------------
    const publishButton = studyItem.locator(
      'button[aria-label="Publicar estudo"]',
    );
    await expect(publishButton).toBeVisible();

    const [publishResponse] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/publish-study") && resp.status() === 200,
      ),
      publishButton.click(),
    ]);

    const publishBody = await publishResponse.json();
    const publishedSlug: string = publishBody.data.slug;

    // Verify slug follows {book}-{chapter}-{vStart}-{vEnd}-estudo format
    expect(publishedSlug).toMatch(PUBLICATION_SLUG_RE);

    // Verify badge changed to "Publicado"
    await expect(studyItem.getByText("Publicado")).toBeVisible();
    await expect(studyItem.getByText("Rascunho")).not.toBeVisible();

    // Verify success toast
    await expect(
      page.getByText("Estudo publicado com sucesso"),
    ).toBeVisible();

    // -----------------------------------------------------------------------
    // Step 3: Unpublish — verify badge reverts to "Rascunho"
    // -----------------------------------------------------------------------
    const unpublishButton = studyItem.locator(
      'button[aria-label="Despublicar estudo"]',
    );
    await expect(unpublishButton).toBeVisible();

    await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/publish-study") && resp.status() === 200,
      ),
      unpublishButton.click(),
    ]);

    // Verify badge reverted
    await expect(studyItem.getByText("Rascunho")).toBeVisible();
    await expect(studyItem.getByText("Publicado")).not.toBeVisible();

    // Verify success toast
    await expect(
      page.getByText("Estudo despublicado com sucesso"),
    ).toBeVisible();

    // -----------------------------------------------------------------------
    // Step 4: Re-publish — verify slug is preserved (not regenerated)
    // -----------------------------------------------------------------------
    const republishButton = studyItem.locator(
      'button[aria-label="Publicar estudo"]',
    );
    await expect(republishButton).toBeVisible();

    const [republishResponse] = await Promise.all([
      page.waitForResponse(
        (resp) =>
          resp.url().includes("/api/publish-study") && resp.status() === 200,
      ),
      republishButton.click(),
    ]);

    const republishBody = await republishResponse.json();

    // Slug must be identical to the first publication
    expect(republishBody.data.slug).toBe(publishedSlug);

    // Badge shows "Publicado" again
    await expect(studyItem.getByText("Publicado")).toBeVisible();
  });
});
