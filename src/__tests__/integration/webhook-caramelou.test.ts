// @vitest-environment node

/**
 * Integration tests for POST /api/webhooks/caramelou.
 *
 * Tests the full webhook flow against a real Supabase instance:
 *   1. subscription_created → creates subscription row with correct status and period_end
 *   2. subscription_charge_succeeded → extends current_period_end
 *   3. subscription_canceled → updates status while preserving period_end
 *   4. Idempotency → duplicate event_id produces only one webhook_events row
 *   5. Auth rejection → invalid hash returns 401 with zero DB side effects
 *
 * Uses service_role client for setup/teardown and real Supabase for handler operations.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Environment setup — must happen before importing the route handler
// ---------------------------------------------------------------------------

const SUPABASE_URL = `https://${process.env.CRED_SUPABASE_PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.CRED_SUPABASE_SERVICE_ROLE_KEY!;
const TEST_API_KEY = "test-caramelou-webhook-secret-2026";
const VALID_HASH = createHash("sha256").update(TEST_API_KEY).digest("hex");

process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
process.env.CARAMELOU_API_KEY = TEST_API_KEY;

// ---------------------------------------------------------------------------
// Import route handler after env vars are set
// ---------------------------------------------------------------------------

import { POST } from "@/app/api/webhooks/caramelou/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let admin: SupabaseClient;
let testUserId: string;
let eventCounter = 0;

function uniqueEventId(): string {
  return `evt_test_${Date.now()}_${++eventCounter}`;
}

function createWebhookRequest(
  body: unknown,
  hash: string | null = VALID_HASH,
): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (hash !== null) {
    headers["x-api-key-hash"] = hash;
  }

  return new NextRequest("http://localhost:3000/api/webhooks/caramelou", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function futureDate(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString();
}

function pastDate(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
}

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `webhook-test-${Date.now()}@test.verbum.app`;
  const { data: authUser, error } = await admin.auth.admin.createUser({
    email,
    password: "test-password-123!",
    email_confirm: true,
  });

  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  testUserId = authUser.user.id;

  await admin.from("profiles").upsert({
    id: testUserId,
    email,
    full_name: "Webhook Test User",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
});

afterAll(async () => {
  if (!testUserId) return;

  await admin.from("webhook_events").delete().eq("user_id", testUserId);
  await admin.from("subscriptions").delete().eq("user_id", testUserId);
  await admin.from("profiles").delete().eq("id", testUserId);
  await admin.auth.admin.deleteUser(testUserId);
});

beforeEach(async () => {
  await admin.from("webhook_events").delete().eq("user_id", testUserId);
  await admin.from("subscriptions").delete().eq("user_id", testUserId);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/webhooks/caramelou", () => {
  // =========================================================================
  // 1. subscription_created
  // =========================================================================

  describe("subscription_created", () => {
    it("should create a subscription row with correct status, plan_id, and period_end", async () => {
      const eventId = uniqueEventId();
      const periodStart = pastDate(0);
      const periodEnd = futureDate(30);

      const request = createWebhookRequest({
        event_id: eventId,
        event_type: "subscription_created",
        data: {
          user_id: testUserId,
          plan_id: "monthly",
          status: "active",
          current_period_start: periodStart,
          current_period_end: periodEnd,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.received).toBe(true);

      const { data: subscription } = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", testUserId)
        .single();

      expect(subscription).toBeTruthy();
      expect(subscription!.plan_id).toBe("monthly");
      expect(subscription!.status).toBe("active");
      expect(new Date(subscription!.current_period_end).getTime()).toBe(
        new Date(periodEnd).getTime(),
      );

      const { data: event } = await admin
        .from("webhook_events")
        .select("*")
        .eq("event_id", eventId)
        .single();

      expect(event).toBeTruthy();
      expect(event!.event_type).toBe("subscription_created");
      expect(event!.user_id).toBe(testUserId);
    });
  });

  // =========================================================================
  // 2. subscription_charge_succeeded
  // =========================================================================

  describe("subscription_charge_succeeded", () => {
    it("should extend current_period_end correctly", async () => {
      const originalPeriodEnd = futureDate(5);
      const extendedPeriodEnd = futureDate(35);

      await admin.from("subscriptions").insert({
        user_id: testUserId,
        plan_id: "monthly",
        status: "active",
        current_period_start: pastDate(25),
        current_period_end: originalPeriodEnd,
      });

      const eventId = uniqueEventId();
      const request = createWebhookRequest({
        event_id: eventId,
        event_type: "subscription_charge_succeeded",
        data: {
          user_id: testUserId,
          current_period_end: extendedPeriodEnd,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const { data: subscription } = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", testUserId)
        .single();

      expect(subscription).toBeTruthy();
      expect(new Date(subscription!.current_period_end).getTime()).toBe(
        new Date(extendedPeriodEnd).getTime(),
      );
      expect(subscription!.status).toBe("active");
    });
  });

  // =========================================================================
  // 3. subscription_canceled
  // =========================================================================

  describe("subscription_canceled", () => {
    it("should update status to canceled while preserving current_period_end", async () => {
      const periodEnd = futureDate(15);

      await admin.from("subscriptions").insert({
        user_id: testUserId,
        plan_id: "annual",
        status: "active",
        current_period_start: pastDate(350),
        current_period_end: periodEnd,
      });

      const eventId = uniqueEventId();
      const request = createWebhookRequest({
        event_id: eventId,
        event_type: "subscription_canceled",
        data: {
          user_id: testUserId,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const { data: subscription } = await admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", testUserId)
        .single();

      expect(subscription).toBeTruthy();
      expect(subscription!.status).toBe("canceled");
      expect(new Date(subscription!.current_period_end).getTime()).toBe(
        new Date(periodEnd).getTime(),
      );
    });
  });

  // =========================================================================
  // 4. Idempotency
  // =========================================================================

  describe("idempotency", () => {
    it("should produce only one webhook_events row for duplicate event_id", async () => {
      const eventId = uniqueEventId();
      const periodEnd = futureDate(30);

      const payload = {
        event_id: eventId,
        event_type: "subscription_created",
        data: {
          user_id: testUserId,
          plan_id: "monthly",
          status: "active",
          current_period_start: pastDate(0),
          current_period_end: periodEnd,
        },
      };

      const firstResponse = await POST(createWebhookRequest(payload));
      expect(firstResponse.status).toBe(200);

      const firstBody = await firstResponse.json();
      expect(firstBody.received).toBe(true);
      expect(firstBody.duplicate).toBeUndefined();

      const secondResponse = await POST(createWebhookRequest(payload));
      expect(secondResponse.status).toBe(200);

      const secondBody = await secondResponse.json();
      expect(secondBody.duplicate).toBe(true);

      const { data: events } = await admin
        .from("webhook_events")
        .select("id")
        .eq("event_id", eventId);

      expect(events).toHaveLength(1);

      const { data: subscriptions } = await admin
        .from("subscriptions")
        .select("id")
        .eq("user_id", testUserId);

      expect(subscriptions).toHaveLength(1);
    });
  });

  // =========================================================================
  // 5. Auth rejection
  // =========================================================================

  describe("auth rejection", () => {
    it("should return 401 with invalid hash and no DB changes", async () => {
      const eventId = uniqueEventId();
      const wrongHash = createHash("sha256").update("wrong-key").digest("hex");

      const request = createWebhookRequest(
        {
          event_id: eventId,
          event_type: "subscription_created",
          data: {
            user_id: testUserId,
            plan_id: "monthly",
            status: "active",
            current_period_start: pastDate(0),
            current_period_end: futureDate(30),
          },
        },
        wrongHash,
      );

      const response = await POST(request);
      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe("Unauthorized");

      const { data: events } = await admin
        .from("webhook_events")
        .select("id")
        .eq("event_id", eventId);

      expect(events).toHaveLength(0);

      const { data: subscriptions } = await admin
        .from("subscriptions")
        .select("id")
        .eq("user_id", testUserId);

      expect(subscriptions).toHaveLength(0);
    });

    it("should return 401 when x-api-key-hash header is missing", async () => {
      const request = createWebhookRequest(
        {
          event_id: uniqueEventId(),
          event_type: "subscription_created",
          data: { user_id: testUserId, plan_id: "monthly" },
        },
        null,
      );

      const response = await POST(request);
      expect(response.status).toBe(401);
    });
  });
});
