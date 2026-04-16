import { createHash } from "crypto";

export function verifyWebhookApiKeyHash(
  headerHash: string | null | undefined,
  apiKey: string | undefined,
): boolean {
  if (!headerHash || !apiKey) {
    return false;
  }

  const expectedHash = createHash("sha256").update(apiKey).digest("hex");

  return headerHash === expectedHash;
}
