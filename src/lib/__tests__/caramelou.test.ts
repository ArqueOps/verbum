import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getCheckoutUrl } from "../caramelou";
import type { CheckoutPlan } from "../caramelou";

// --- Helpers ---

const MOCK_ENV = {
  CARAMELOU_PRODUCT_ID_MONTHLY: "prod_monthly_abc123",
  CARAMELOU_PRODUCT_ID_ANNUAL: "prod_annual_xyz789",
  NEXT_PUBLIC_APP_URL: "https://verbum.vercel.app",
};

function setEnv(overrides: Partial<typeof MOCK_ENV> = {}): void {
  const env = { ...MOCK_ENV, ...overrides };
  process.env.CARAMELOU_PRODUCT_ID_MONTHLY = env.CARAMELOU_PRODUCT_ID_MONTHLY;
  process.env.CARAMELOU_PRODUCT_ID_ANNUAL = env.CARAMELOU_PRODUCT_ID_ANNUAL;
  process.env.NEXT_PUBLIC_APP_URL = env.NEXT_PUBLIC_APP_URL;
}

function clearEnv(): void {
  delete process.env.CARAMELOU_PRODUCT_ID_MONTHLY;
  delete process.env.CARAMELOU_PRODUCT_ID_ANNUAL;
  delete process.env.NEXT_PUBLIC_APP_URL;
}

// --- Tests ---

describe("getCheckoutUrl", () => {
  beforeEach(() => {
    setEnv();
  });

  afterEach(() => {
    clearEnv();
  });

  // --- Success paths ---

  describe("URL generation for monthly plan", () => {
    it("should generate correct URL with monthly product ID", () => {
      // Arrange
      const params = { plan: "monthly" as CheckoutPlan, userId: "user-001", email: "user@example.com" };

      // Act
      const url = getCheckoutUrl(params);

      // Assert
      expect(url).toContain("product_id=prod_monthly_abc123");
      expect(url).toContain("customer_email=user%40example.com");
      expect(url).toContain("client_reference_id=user-001");
      expect(url).toContain("return_url=");
      expect(url.startsWith("https://verbum.vercel.app/api/checkout?")).toBe(true);
    });
  });

  describe("URL generation for annual plan", () => {
    it("should generate correct URL with annual product ID", () => {
      // Arrange
      const params = { plan: "annual" as CheckoutPlan, userId: "user-002", email: "annual@example.com" };

      // Act
      const url = getCheckoutUrl(params);

      // Assert
      expect(url).toContain("product_id=prod_annual_xyz789");
      expect(url).toContain("customer_email=annual%40example.com");
      expect(url).toContain("client_reference_id=user-002");
      expect(url.startsWith("https://verbum.vercel.app/api/checkout?")).toBe(true);
    });
  });

  // --- URL encoding ---

  describe("URL encoding", () => {
    it("should URL-encode email with special characters (+, ., @)", () => {
      // Arrange
      const params = {
        plan: "monthly" as CheckoutPlan,
        userId: "user-003",
        email: "user+tag.extra@example.com",
      };

      // Act
      const url = getCheckoutUrl(params);

      // Assert
      const urlObj = new URL(url);
      const customerEmail = urlObj.searchParams.get("customer_email");
      expect(customerEmail).toBe("user+tag.extra@example.com");
      // The raw URL string should have encoded @ and + characters
      expect(url).toContain("customer_email=user%2Btag.extra%40example.com");
    });

    it("should URL-encode return_url correctly", () => {
      // Arrange
      const params = { plan: "monthly" as CheckoutPlan, userId: "user-004", email: "a@b.com" };

      // Act
      const url = getCheckoutUrl(params);

      // Assert
      const urlObj = new URL(url);
      const returnUrl = urlObj.searchParams.get("return_url");
      expect(returnUrl).toBe("https://verbum.vercel.app/dashboard?checkout=success");
    });

    it("should handle email with unicode characters", () => {
      // Arrange
      const params = {
        plan: "annual" as CheckoutPlan,
        userId: "user-005",
        email: "josé@domínio.com",
      };

      // Act
      const url = getCheckoutUrl(params);

      // Assert
      const urlObj = new URL(url);
      expect(urlObj.searchParams.get("customer_email")).toBe("josé@domínio.com");
    });
  });

  // --- Error paths: missing env vars ---

  describe("missing environment variables", () => {
    it("should throw when CARAMELOU_PRODUCT_ID_MONTHLY is missing and plan=monthly", () => {
      // Arrange
      delete process.env.CARAMELOU_PRODUCT_ID_MONTHLY;
      const params = { plan: "monthly" as CheckoutPlan, userId: "user-006", email: "test@test.com" };

      // Act & Assert
      expect(() => getCheckoutUrl(params)).toThrow(
        "Missing environment variable: CARAMELOU_PRODUCT_ID_MONTHLY",
      );
    });

    it("should throw when CARAMELOU_PRODUCT_ID_ANNUAL is missing and plan=annual", () => {
      // Arrange
      delete process.env.CARAMELOU_PRODUCT_ID_ANNUAL;
      const params = { plan: "annual" as CheckoutPlan, userId: "user-007", email: "test@test.com" };

      // Act & Assert
      expect(() => getCheckoutUrl(params)).toThrow(
        "Missing environment variable: CARAMELOU_PRODUCT_ID_ANNUAL",
      );
    });

    it("should throw when NEXT_PUBLIC_APP_URL is missing", () => {
      // Arrange
      delete process.env.NEXT_PUBLIC_APP_URL;
      const params = { plan: "monthly" as CheckoutPlan, userId: "user-008", email: "test@test.com" };

      // Act & Assert
      expect(() => getCheckoutUrl(params)).toThrow(
        "Missing environment variable: NEXT_PUBLIC_APP_URL",
      );
    });

    it("should not throw for missing annual env var when plan=monthly", () => {
      // Arrange
      delete process.env.CARAMELOU_PRODUCT_ID_ANNUAL;
      const params = { plan: "monthly" as CheckoutPlan, userId: "user-009", email: "test@test.com" };

      // Act & Assert
      expect(() => getCheckoutUrl(params)).not.toThrow();
    });

    it("should not throw for missing monthly env var when plan=annual", () => {
      // Arrange
      delete process.env.CARAMELOU_PRODUCT_ID_MONTHLY;
      const params = { plan: "annual" as CheckoutPlan, userId: "user-010", email: "test@test.com" };

      // Act & Assert
      expect(() => getCheckoutUrl(params)).not.toThrow();
    });
  });

  // --- Edge cases ---

  describe("edge cases", () => {
    it("should include all required query parameters", () => {
      // Arrange
      const params = { plan: "monthly" as CheckoutPlan, userId: "uuid-abc-123", email: "user@test.com" };

      // Act
      const url = getCheckoutUrl(params);
      const urlObj = new URL(url);

      // Assert
      expect(urlObj.searchParams.has("product_id")).toBe(true);
      expect(urlObj.searchParams.has("customer_email")).toBe(true);
      expect(urlObj.searchParams.has("client_reference_id")).toBe(true);
      expect(urlObj.searchParams.has("return_url")).toBe(true);
    });

    it("should use the app URL as base for the checkout endpoint", () => {
      // Arrange
      setEnv({ NEXT_PUBLIC_APP_URL: "https://custom-domain.com" });
      const params = { plan: "monthly" as CheckoutPlan, userId: "user-011", email: "test@test.com" };

      // Act
      const url = getCheckoutUrl(params);

      // Assert
      expect(url.startsWith("https://custom-domain.com/api/checkout?")).toBe(true);
    });

    it("should use the app URL in return_url", () => {
      // Arrange
      setEnv({ NEXT_PUBLIC_APP_URL: "https://my-app.com" });
      const params = { plan: "annual" as CheckoutPlan, userId: "user-012", email: "test@test.com" };

      // Act
      const url = getCheckoutUrl(params);
      const urlObj = new URL(url);

      // Assert
      expect(urlObj.searchParams.get("return_url")).toContain("https://my-app.com/dashboard");
    });
  });
});
