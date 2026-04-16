import { createHash, timingSafeEqual } from "crypto";

export function verifyWebhookApiKeyHash(
  headerHash: string | null | undefined,
  apiKey: string | undefined,
): boolean {
  if (!headerHash || !apiKey) return false;

  const expectedHash = createHash("sha256").update(apiKey).digest("hex");

  if (headerHash.length !== expectedHash.length) return false;

  return timingSafeEqual(
    Buffer.from(headerHash, "utf8"),
    Buffer.from(expectedHash, "utf8"),
  );
}
