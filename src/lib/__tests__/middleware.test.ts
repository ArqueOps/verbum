// @vitest-environment node
import { describe, it, expect } from "vitest";

import { isPublicRoute, PUBLIC_ROUTES } from "../supabase/middleware";

describe("isPublicRoute", () => {
  describe("public routes do not trigger auth redirect", () => {
    it("'/' is public", () => {
      expect(isPublicRoute("/")).toBe(true);
    });

    it("'/pricing' is public", () => {
      expect(isPublicRoute("/pricing")).toBe(true);
    });

    it("'/auth/signup' is public", () => {
      expect(isPublicRoute("/auth/signup")).toBe(true);
    });

    it("'/login' is public", () => {
      expect(isPublicRoute("/login")).toBe(true);
    });

    it("'/signup' is public", () => {
      expect(isPublicRoute("/signup")).toBe(true);
    });

    it("'/auth/callback' is public", () => {
      expect(isPublicRoute("/auth/callback")).toBe(true);
    });

    it("'/auth/forgot-password' is public", () => {
      expect(isPublicRoute("/auth/forgot-password")).toBe(true);
    });

    it("'/auth/reset-password' is public", () => {
      expect(isPublicRoute("/auth/reset-password")).toBe(true);
    });

    it("'/blog' is public", () => {
      expect(isPublicRoute("/blog")).toBe(true);
    });

    it("'/estudos' is public", () => {
      expect(isPublicRoute("/estudos")).toBe(true);
    });

    it("'/api/og' is public", () => {
      expect(isPublicRoute("/api/og")).toBe(true);
    });
  });

  describe("sub-paths of public routes are also public", () => {
    it("'/blog/some-post' is public", () => {
      expect(isPublicRoute("/blog/some-post")).toBe(true);
    });

    it("'/estudos/some-study' is public", () => {
      expect(isPublicRoute("/estudos/some-study")).toBe(true);
    });

    it("'/auth/callback?code=abc' pathname is public", () => {
      expect(isPublicRoute("/auth/callback")).toBe(true);
    });

    it("'/pricing/enterprise' is public", () => {
      expect(isPublicRoute("/pricing/enterprise")).toBe(true);
    });
  });

  describe("protected routes require authentication", () => {
    it("'/meus-estudos' is protected", () => {
      expect(isPublicRoute("/meus-estudos")).toBe(false);
    });

    it("'/generate' is protected", () => {
      expect(isPublicRoute("/generate")).toBe(false);
    });

    it("'/perfil' is protected", () => {
      expect(isPublicRoute("/perfil")).toBe(false);
    });

    it("'/perfil/cancelar' is protected", () => {
      expect(isPublicRoute("/perfil/cancelar")).toBe(false);
    });

    it("'/admin' is protected", () => {
      expect(isPublicRoute("/admin")).toBe(false);
    });

    it("'/dashboard' is protected", () => {
      expect(isPublicRoute("/dashboard")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("'/' does not make all routes public", () => {
      expect(isPublicRoute("/some-random-path")).toBe(false);
    });

    it("PUBLIC_ROUTES array contains expected entries", () => {
      expect(PUBLIC_ROUTES).toContain("/");
      expect(PUBLIC_ROUTES).toContain("/pricing");
      expect(PUBLIC_ROUTES).toContain("/auth/signup");
      expect(PUBLIC_ROUTES).toContain("/login");
    });
  });
});
