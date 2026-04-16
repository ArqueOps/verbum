import { describe, it, expect, vi, beforeEach } from "vitest";

const mockRedirect = vi.hoisted(() => vi.fn());
const mockSignInWithPassword = vi.hoisted(() => vi.fn());
const mockCreateClient = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    auth: { signInWithPassword: mockSignInWithPassword },
  }),
);

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mockCreateClient,
}));

import { signIn, isValidRedirectPath } from "../actions";

function makeFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSignInWithPassword.mockResolvedValue({ error: null });
  mockRedirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("isValidRedirectPath", () => {
  it("accepts valid internal paths", () => {
    expect(isValidRedirectPath("/dashboard")).toBe(true);
    expect(isValidRedirectPath("/estudos/abc")).toBe(true);
    expect(isValidRedirectPath("/meus-estudos")).toBe(true);
    expect(isValidRedirectPath("/perfil")).toBe(true);
  });

  it("rejects external URLs with protocol", () => {
    expect(isValidRedirectPath("https://evil.com")).toBe(false);
    expect(isValidRedirectPath("http://evil.com")).toBe(false);
    expect(isValidRedirectPath("ftp://evil.com")).toBe(false);
  });

  it("rejects protocol-relative URLs", () => {
    expect(isValidRedirectPath("//evil.com")).toBe(false);
    expect(isValidRedirectPath("//evil.com/path")).toBe(false);
  });

  it("rejects paths with backslashes", () => {
    expect(isValidRedirectPath("/\\evil.com")).toBe(false);
    expect(isValidRedirectPath("\\evil.com")).toBe(false);
  });

  it("rejects paths that don't start with /", () => {
    expect(isValidRedirectPath("dashboard")).toBe(false);
    expect(isValidRedirectPath("evil.com/path")).toBe(false);
    expect(isValidRedirectPath("")).toBe(false);
  });
});

describe("signIn", () => {
  it("redirects to /dashboard when no redirect param is provided", async () => {
    const formData = makeFormData({
      email: "user@example.com",
      password: "password123",
    });

    await expect(signIn({}, formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("redirects to the specified path when redirect param is a valid internal path", async () => {
    const formData = makeFormData({
      email: "user@example.com",
      password: "password123",
      redirect: "/estudos/abc-123",
    });

    await expect(signIn({}, formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/estudos/abc-123");
  });

  it("falls back to /dashboard when redirect is an external URL", async () => {
    const formData = makeFormData({
      email: "user@example.com",
      password: "password123",
      redirect: "https://evil.com",
    });

    await expect(signIn({}, formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("falls back to /dashboard when redirect is a protocol-relative URL", async () => {
    const formData = makeFormData({
      email: "user@example.com",
      password: "password123",
      redirect: "//evil.com",
    });

    await expect(signIn({}, formData)).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });

  it("returns validation errors for invalid email", async () => {
    const formData = makeFormData({
      email: "not-an-email",
      password: "password123",
    });

    const result = await signIn({}, formData);
    expect(result.fieldErrors?.email).toBeDefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns validation errors for empty fields", async () => {
    const formData = makeFormData({ email: "", password: "" });

    const result = await signIn({}, formData);
    expect(result.fieldErrors?.email).toBeDefined();
    expect(result.fieldErrors?.password).toBeDefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("returns error message on auth failure", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });

    const formData = makeFormData({
      email: "user@example.com",
      password: "wrongpassword",
    });

    const result = await signIn({}, formData);
    expect(result.error).toBe("E-mail ou senha inválidos");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("does not redirect when auth fails even with valid redirect param", async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: "Invalid credentials" },
    });

    const formData = makeFormData({
      email: "user@example.com",
      password: "wrong",
      redirect: "/estudos/abc",
    });

    const result = await signIn({}, formData);
    expect(result.error).toBe("E-mail ou senha inválidos");
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
