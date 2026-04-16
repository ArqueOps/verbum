import { verifyWebhookApiKeyHash } from "@/lib/webhook-auth";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const apiKeyHash = request.headers.get("x-api-key-hash");
  const apiKey = process.env.CARAMELOU_API_KEY;

  if (!verifyWebhookApiKeyHash(apiKeyHash, apiKey)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
