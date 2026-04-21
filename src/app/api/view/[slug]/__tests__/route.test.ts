// @vitest-environment node

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockRpc = vi.fn();
const mockMaybeSingle = vi.fn();
const mockFrom = vi.fn(() => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: mockMaybeSingle,
      }),
    }),
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

import { POST } from "../route";

function buildRequest(slug: string, cookie?: string): NextRequest {
  const url = `http://localhost:3000/api/view/${slug}`;
  const headers = new Headers();
  if (cookie) {
    headers.set("cookie", cookie);
  }
  return new NextRequest(url, { method: "POST", headers });
}

function buildParams(slug: string): { params: Promise<{ slug: string }> } {
  return { params: Promise.resolve({ slug }) };
}

describe("POST /api/view/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 when slug not found in studies (no cookie path)", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    const response = await POST(
      buildRequest("nonexistent-slug"),
      buildParams("nonexistent-slug"),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Estudo não encontrado");
  });

  it("should return 404 when slug not found in studies (cookie path)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await POST(
      buildRequest("nonexistent-slug", "viewed_nonexistent-slug=1"),
      buildParams("nonexistent-slug"),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Estudo não encontrado");
  });

  it("should increment and return incremented=true on first call without cookie", async () => {
    mockRpc.mockResolvedValue({ data: 42, error: null });

    const response = await POST(
      buildRequest("my-study"),
      buildParams("my-study"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incremented).toBe(true);
    expect(body.view_count).toBe(42);

    expect(mockRpc).toHaveBeenCalledWith("increment_view_count", {
      study_slug: "my-study",
    });
  });

  it("should skip increment and return incremented=false when cookie present", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { view_count: 10 },
      error: null,
    });

    const response = await POST(
      buildRequest("my-study", "viewed_my-study=1"),
      buildParams("my-study"),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.incremented).toBe(false);
    expect(body.view_count).toBe(10);

    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("should set cookie with HttpOnly, Secure, SameSite=Lax, maxAge=86400", async () => {
    mockRpc.mockResolvedValue({ data: 1, error: null });

    const response = await POST(
      buildRequest("test-slug"),
      buildParams("test-slug"),
    );

    const setCookieHeader = response.headers.getSetCookie();
    const viewedCookie = setCookieHeader.find((c: string) =>
      c.startsWith("viewed_test-slug="),
    );

    expect(viewedCookie).toBeDefined();
    expect(viewedCookie).toContain("HttpOnly");
    expect(viewedCookie).toContain("Secure");
    expect(viewedCookie).toMatch(/SameSite=Lax/i);
    expect(viewedCookie).toContain("Max-Age=86400");
    expect(viewedCookie).toContain("Path=/");
  });

  it("should call atomic RPC increment_view_count with correct slug", async () => {
    mockRpc.mockResolvedValue({ data: 5, error: null });

    await POST(
      buildRequest("specific-slug"),
      buildParams("specific-slug"),
    );

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("increment_view_count", {
      study_slug: "specific-slug",
    });
  });

  it("should return 400 for empty slug", async () => {
    const response = await POST(
      buildRequest(""),
      buildParams(""),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Slug inválido");
  });

  it("should return 500 when RPC returns an error", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "DB connection failed" },
    });

    const response = await POST(
      buildRequest("my-study"),
      buildParams("my-study"),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Erro interno");
  });
});
