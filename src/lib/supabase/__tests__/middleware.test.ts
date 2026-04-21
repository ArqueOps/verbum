import { describe, it, expect } from "vitest";
import { isPublicRoute, PUBLIC_ROUTES_EXACT, PUBLIC_ROUTES_PREFIX } from "../middleware";

describe("isPublicRoute", () => {
  describe("public routes (no auth redirect)", () => {
    it("returns true for '/' (exact match)", () => {
      expect(isPublicRoute("/")).toBe(true);
    });

    it("returns true for '/pricing'", () => {
      expect(isPublicRoute("/pricing")).toBe(true);
    });

    it("returns true for '/auth/signup'", () => {
      expect(isPublicRoute("/auth/signup")).toBe(true);
    });

    it("returns true for '/login'", () => {
      expect(isPublicRoute("/login")).toBe(true);
    });

    it("returns true for '/blog'", () => {
      expect(isPublicRoute("/blog")).toBe(true);
    });

    it("returns true for '/estudos'", () => {
      expect(isPublicRoute("/estudos")).toBe(true);
    });

    it("returns true for nested public paths (prefix match)", () => {
      expect(isPublicRoute("/pricing/pro")).toBe(true);
      expect(isPublicRoute("/blog/some-post")).toBe(true);
      expect(isPublicRoute("/estudos/some-slug")).toBe(true);
      expect(isPublicRoute("/auth/callback")).toBe(true);
    });
  });

  describe("protected routes (require authentication)", () => {
    it("returns false for '/meus-estudos'", () => {
      expect(isPublicRoute("/meus-estudos")).toBe(false);
    });

    it("returns false for '/generate'", () => {
      expect(isPublicRoute("/generate")).toBe(false);
    });

    it("returns false for '/perfil'", () => {
      expect(isPublicRoute("/perfil")).toBe(false);
    });

    it("returns false for '/admin'", () => {
      expect(isPublicRoute("/admin")).toBe(false);
    });

    it("returns false for '/settings'", () => {
      expect(isPublicRoute("/settings")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("'/' does not make all routes public (exact match only)", () => {
      expect(isPublicRoute("/")).toBe(true);
      expect(isPublicRoute("/anything-else")).toBe(false);
    });

    it("all PUBLIC_ROUTES_EXACT entries are recognized", () => {
      for (const route of PUBLIC_ROUTES_EXACT) {
        expect(isPublicRoute(route)).toBe(true);
      }
    });

    it("all PUBLIC_ROUTES_PREFIX entries are recognized", () => {
      for (const route of PUBLIC_ROUTES_PREFIX) {
        expect(isPublicRoute(route)).toBe(true);
      }
    });
  });
});
