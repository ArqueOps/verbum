import { createHash } from "crypto";
import { describe, it, expect } from "vitest";
import { verifyWebhookApiKeyHash } from "@/lib/webhook-auth";

const TEST_API_KEY = "test-caramelou-secret-key-2026";
const VALID_HASH = createHash("sha256").update(TEST_API_KEY).digest("hex");

describe("verifyWebhookApiKeyHash", () => {
  it("should return true when hash matches SHA-256 of API key", () => {
    const result = verifyWebhookApiKeyHash(VALID_HASH, TEST_API_KEY);

    expect(result).toBe(true);
  });

  it("should return false when hash does not match", () => {
    const wrongHash = createHash("sha256")
      .update("wrong-key")
      .digest("hex");

    const result = verifyWebhookApiKeyHash(wrongHash, TEST_API_KEY);

    expect(result).toBe(false);
  });

  it("should return false when header is null (missing header)", () => {
    const result = verifyWebhookApiKeyHash(null, TEST_API_KEY);

    expect(result).toBe(false);
  });

  it("should return false when header is undefined", () => {
    const result = verifyWebhookApiKeyHash(undefined, TEST_API_KEY);

    expect(result).toBe(false);
  });

  it("should return false when header is empty string", () => {
    const result = verifyWebhookApiKeyHash("", TEST_API_KEY);

    expect(result).toBe(false);
  });

  it("should return false when API key env var is undefined", () => {
    const result = verifyWebhookApiKeyHash(VALID_HASH, undefined);

    expect(result).toBe(false);
  });

  it("should return false when both header and API key are missing", () => {
    const result = verifyWebhookApiKeyHash(null, undefined);

    expect(result).toBe(false);
  });

  it("should reject a plaintext API key passed as hash", () => {
    const result = verifyWebhookApiKeyHash(TEST_API_KEY, TEST_API_KEY);

    expect(result).toBe(false);
  });

  it("should be case-sensitive for hex hash comparison", () => {
    const upperHash = VALID_HASH.toUpperCase();

    const result = verifyWebhookApiKeyHash(upperHash, TEST_API_KEY);

    expect(result).toBe(false);
  });
});
