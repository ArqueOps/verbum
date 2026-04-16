import { describe, it, expect, vi } from "vitest";
import robots from "../robots";

describe("robots", () => {
  it("should return allow rules for public pages", () => {
    const result = robots();
    const rules = result.rules;
    const allow = Array.isArray(rules) ? rules[0]!.allow : rules.allow;

    expect(allow).toContain("/");
    expect(allow).toContain("/estudos/*");
    expect(allow).toContain("/blog");
  });

  it("should return disallow rules for private/internal routes", () => {
    const result = robots();
    const rules = result.rules;
    const disallow = Array.isArray(rules) ? rules[0]!.disallow : rules.disallow;

    expect(disallow).toContain("/meus-estudos");
    expect(disallow).toContain("/perfil");
    expect(disallow).toContain("/admin");
    expect(disallow).toContain("/api/");
  });

  it("should set userAgent to wildcard", () => {
    const result = robots();
    const rules = result.rules;
    const userAgent = Array.isArray(rules)
      ? rules[0]!.userAgent
      : rules.userAgent;

    expect(userAgent).toBe("*");
  });

  it("should include sitemap URL referencing /sitemap.xml", () => {
    const result = robots();

    expect(result.sitemap).toBeDefined();
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/);
  });

  it("should use custom base URL for sitemap when env var is set", async () => {
    const originalEnv = process.env.NEXT_PUBLIC_BASE_URL;
    process.env.NEXT_PUBLIC_BASE_URL = "https://custom.domain.com";

    vi.resetModules();
    const { default: robotsFn } = await import("../robots");
    const result = robotsFn();

    expect(result.sitemap).toBe("https://custom.domain.com/sitemap.xml");

    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_BASE_URL = originalEnv;
    } else {
      delete process.env.NEXT_PUBLIC_BASE_URL;
    }
  });
});
