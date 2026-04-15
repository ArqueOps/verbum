import { describe, it, expect, beforeEach, vi } from "vitest";

const { mockExchangeCodeForSession, mockCreateClient } = vi.hoisted(() => {
  const mockExchangeCodeForSession = vi.fn();
  const mockCreateClient = vi.fn(() =>
    Promise.resolve({
      auth: {
        exchangeCodeForSession: mockExchangeCodeForSession,
      },
    })
  );
  return { mockExchangeCodeForSession, mockCreateClient };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: mockCreateClient,
}));

import { GET } from "../route";

function buildRequest(url: string): Request {
  return new Request(url);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful code exchange", () => {
    it("should exchange code for session and redirect to /dashboard", async () => {
      // Arrange
      mockExchangeCodeForSession.mockResolvedValue({ error: null });
      const request = buildRequest(
        "http://localhost:3000/auth/callback?code=valid-auth-code"
      );

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe(
        "/dashboard"
      );
      expect(mockCreateClient).toHaveBeenCalledOnce();
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith(
        "valid-auth-code"
      );
    });

    it("should preserve the origin in the redirect URL", async () => {
      // Arrange
      mockExchangeCodeForSession.mockResolvedValue({ error: null });
      const request = buildRequest(
        "https://verbum.vercel.app/auth/callback?code=abc123"
      );

      // Act
      const response = await GET(request);

      // Assert
      const location = new URL(response.headers.get("location")!);
      expect(location.origin).toBe("https://verbum.vercel.app");
      expect(location.pathname).toBe("/dashboard");
    });
  });

  describe("missing code parameter", () => {
    it("should redirect to /login with error when code is absent", async () => {
      // Arrange
      const request = buildRequest("http://localhost:3000/auth/callback");

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("error")).toBe("missing_code");
    });

    it("should not attempt to create a Supabase client when code is missing", async () => {
      // Arrange
      const request = buildRequest("http://localhost:3000/auth/callback");

      // Act
      await GET(request);

      // Assert
      expect(mockCreateClient).not.toHaveBeenCalled();
      expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
    });

    it("should redirect to /login with error when code is empty string", async () => {
      // Arrange
      const request = buildRequest(
        "http://localhost:3000/auth/callback?code="
      );

      // Act
      const response = await GET(request);

      // Assert
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("error")).toBe("missing_code");
    });
  });

  describe("exchangeCodeForSession failure", () => {
    it("should redirect to /login with error when exchange fails", async () => {
      // Arrange
      mockExchangeCodeForSession.mockResolvedValue({
        error: new Error("invalid_grant: code expired"),
      });
      const request = buildRequest(
        "http://localhost:3000/auth/callback?code=expired-code"
      );

      // Act
      const response = await GET(request);

      // Assert
      expect(response.status).toBe(307);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("error")).toBe("auth_callback_error");
    });

    it("should still call exchangeCodeForSession with the provided code", async () => {
      // Arrange
      mockExchangeCodeForSession.mockResolvedValue({
        error: { message: "server_error" },
      });
      const request = buildRequest(
        "http://localhost:3000/auth/callback?code=bad-code"
      );

      // Act
      await GET(request);

      // Assert
      expect(mockExchangeCodeForSession).toHaveBeenCalledWith("bad-code");
    });

    it("should preserve origin when exchange fails", async () => {
      // Arrange
      mockExchangeCodeForSession.mockResolvedValue({
        error: new Error("exchange failed"),
      });
      const request = buildRequest(
        "https://verbum.vercel.app/auth/callback?code=fail"
      );

      // Act
      const response = await GET(request);

      // Assert
      const location = new URL(response.headers.get("location")!);
      expect(location.origin).toBe("https://verbum.vercel.app");
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("error")).toBe("auth_callback_error");
    });
  });
});
