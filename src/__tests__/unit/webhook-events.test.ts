// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processWebhookEvent,
  type WebhookPayload,
} from "@/lib/webhook-processor";

function createMockSupabase() {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockUpsert = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();

  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    upsert: mockUpsert,
  });

  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ single: mockSingle });
  mockSingle.mockResolvedValue({ data: null, error: null });

  mockInsert.mockResolvedValue({ data: null, error: null });
  mockUpsert.mockResolvedValue({ data: null, error: null });
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  const testUser = {
    id: "user-uuid-123",
    email: "test@example.com",
  };

  const supabase = {
    from: mockFrom,
    auth: {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users: [testUser] },
        }),
      },
    },
  } as unknown as Parameters<typeof processWebhookEvent>[0];

  return {
    supabase,
    mockFrom,
    mockSelect,
    mockInsert,
    mockUpdate,
    mockUpsert,
    mockEq,
    mockSingle,
    testUser,
  };
}

function makePayload(overrides: Partial<WebhookPayload> = {}): WebhookPayload {
  return {
    event_id: `evt_${Date.now()}`,
    event_type: "subscription.created",
    customer_email: "test@example.com",
    frequency_type: "monthly",
    next_charge_at: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

describe("processWebhookEvent", () => {
  let mock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    mock = createMockSupabase();
    vi.clearAllMocks();
  });

  describe("subscription.created", () => {
    it("should upsert subscription with status=active and mapped plan_id", async () => {
      const payload = makePayload({
        event_type: "subscription.created",
        frequency_type: "monthly",
        next_charge_at: "2026-06-01T00:00:00Z",
      });

      const result = await processWebhookEvent(mock.supabase, payload);

      expect(result.action).toBe("created");

      const upsertCalls = mock.mockFrom.mock.calls.filter(
        (call) => call[0] === "subscriptions"
      );
      expect(upsertCalls.length).toBeGreaterThan(0);

      expect(mock.mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mock.testUser.id,
          status: "active",
          plan_id: "plan_monthly",
          current_period_end: "2026-06-01T00:00:00Z",
        }),
        { onConflict: "user_id" }
      );
    });

    it("should map annual frequency_type to plan_annual", async () => {
      const payload = makePayload({
        event_type: "subscription.created",
        frequency_type: "annual",
      });

      await processWebhookEvent(mock.supabase, payload);

      expect(mock.mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ plan_id: "plan_annual" }),
        expect.any(Object)
      );
    });

    it("should set plan_id to null when frequency_type is missing", async () => {
      const payload = makePayload({
        event_type: "subscription.created",
        frequency_type: undefined,
      });

      await processWebhookEvent(mock.supabase, payload);

      expect(mock.mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ plan_id: null }),
        expect.any(Object)
      );
    });

    it("should record the event in webhook_events", async () => {
      const payload = makePayload({ event_type: "subscription.created" });

      await processWebhookEvent(mock.supabase, payload);

      expect(mock.mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: payload.event_id,
          event_type: "subscription.created",
          user_id: mock.testUser.id,
        })
      );
    });
  });

  describe("subscription.renewed", () => {
    it("should set status=active and extend current_period_end", async () => {
      const payload = makePayload({
        event_type: "subscription.renewed",
        next_charge_at: "2026-07-01T00:00:00Z",
      });

      const result = await processWebhookEvent(mock.supabase, payload);

      expect(result.action).toBe("updated");

      const subscriptionCalls = mock.mockFrom.mock.calls.filter(
        (call) => call[0] === "subscriptions"
      );
      expect(subscriptionCalls.length).toBeGreaterThan(0);

      expect(mock.mockUpdate).toHaveBeenCalledWith({
        status: "active",
        current_period_end: "2026-07-01T00:00:00Z",
      });
    });
  });

  describe("subscription.updated", () => {
    it("should update plan_id when frequency_type changes", async () => {
      const payload = makePayload({
        event_type: "subscription.updated",
        frequency_type: "annual",
        next_charge_at: "2027-04-01T00:00:00Z",
      });

      const result = await processWebhookEvent(mock.supabase, payload);

      expect(result.action).toBe("updated");
      expect(mock.mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_id: "plan_annual",
          current_period_end: "2027-04-01T00:00:00Z",
        })
      );
    });

    it("should only update fields that are present in payload", async () => {
      const payload = makePayload({
        event_type: "subscription.updated",
        frequency_type: "monthly",
        next_charge_at: undefined,
      });

      await processWebhookEvent(mock.supabase, payload);

      expect(mock.mockUpdate).toHaveBeenCalledWith({ plan_id: "plan_monthly" });
    });

    it("should be a no-op update when no relevant fields change", async () => {
      const payload = makePayload({
        event_type: "subscription.updated",
        frequency_type: undefined,
        next_charge_at: undefined,
      });

      const result = await processWebhookEvent(mock.supabase, payload);

      expect(result.action).toBe("updated");
      const subscriptionUpdateCalls = mock.mockFrom.mock.calls.filter(
        (call) => call[0] === "subscriptions"
      );
      const hasUpdateCall = subscriptionUpdateCalls.some(() =>
        mock.mockUpdate.mock.calls.length > 0
      );
      expect(hasUpdateCall).toBe(false);
    });
  });

  describe("subscription.cancelled", () => {
    it("should set status=canceled without changing current_period_end", async () => {
      const payload = makePayload({
        event_type: "subscription.cancelled",
      });

      const result = await processWebhookEvent(mock.supabase, payload);

      expect(result.action).toBe("updated");
      expect(mock.mockUpdate).toHaveBeenCalledWith({ status: "canceled" });
    });
  });

  describe("subscription.ended", () => {
    it("should set status=expired", async () => {
      const payload = makePayload({
        event_type: "subscription.ended",
      });

      const result = await processWebhookEvent(mock.supabase, payload);

      expect(result.action).toBe("updated");
      expect(mock.mockUpdate).toHaveBeenCalledWith({ status: "expired" });
    });
  });

  describe("sale_success_credit", () => {
    it("should not modify subscriptions and return no_op", async () => {
      const payload = makePayload({
        event_type: "sale_success_credit",
      });

      const result = await processWebhookEvent(mock.supabase, payload);

      expect(result.action).toBe("no_op");
      expect(result.reason).toBe("credit_event");

      const subscriptionCalls = mock.mockFrom.mock.calls.filter(
        (call) => call[0] === "subscriptions"
      );
      expect(subscriptionCalls).toHaveLength(0);
    });
  });

  describe("unknown event type", () => {
    it("should return no_op for unrecognized event types", async () => {
      const payload = makePayload({
        event_type: "some.unknown.event",
      });

      const result = await processWebhookEvent(mock.supabase, payload);

      expect(result.action).toBe("no_op");
      expect(result.reason).toBe("unknown_event_type");
    });

    it("should still log the event in webhook_events", async () => {
      const payload = makePayload({
        event_type: "some.unknown.event",
      });

      await processWebhookEvent(mock.supabase, payload);

      expect(mock.mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: payload.event_id,
          event_type: "some.unknown.event",
        })
      );
    });
  });

  describe("idempotency", () => {
    it("should skip processing when event_id already exists", async () => {
      mock.mockSingle.mockResolvedValueOnce({
        data: { id: "existing-uuid" },
        error: null,
      });

      const payload = makePayload({ event_type: "subscription.created" });

      const result = await processWebhookEvent(mock.supabase, payload);

      expect(result.action).toBe("skipped");
      expect(result.reason).toBe("duplicate_event");
      expect(mock.mockInsert).not.toHaveBeenCalled();
      expect(mock.mockUpsert).not.toHaveBeenCalled();
    });

    it("should not call auth.admin.listUsers for duplicate events", async () => {
      mock.mockSingle.mockResolvedValueOnce({
        data: { id: "existing-uuid" },
        error: null,
      });

      const payload = makePayload({ event_type: "subscription.renewed" });

      await processWebhookEvent(mock.supabase, payload);

      expect(mock.supabase.auth.admin.listUsers).not.toHaveBeenCalled();
    });
  });

  describe("customer email not found", () => {
    it("should log event and return skipped when user does not exist", async () => {
      (mock.supabase.auth.admin.listUsers as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { users: [] },
      });

      const payload = makePayload({
        event_type: "subscription.created",
        customer_email: "nonexistent@example.com",
      });

      const result = await processWebhookEvent(mock.supabase, payload);

      expect(result.action).toBe("skipped");
      expect(result.reason).toBe("user_not_found");
    });

    it("should record the event with null user_id when user not found", async () => {
      (mock.supabase.auth.admin.listUsers as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { users: [] },
      });

      const payload = makePayload({
        event_type: "subscription.created",
        customer_email: "ghost@example.com",
      });

      await processWebhookEvent(mock.supabase, payload);

      expect(mock.mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: payload.event_id,
          user_id: null,
        })
      );
    });

    it("should not touch subscriptions table when user not found", async () => {
      (mock.supabase.auth.admin.listUsers as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        data: { users: [] },
      });

      const payload = makePayload({
        event_type: "subscription.created",
        customer_email: "nobody@example.com",
      });

      await processWebhookEvent(mock.supabase, payload);

      const subscriptionCalls = mock.mockFrom.mock.calls.filter(
        (call) => call[0] === "subscriptions"
      );
      expect(subscriptionCalls).toHaveLength(0);
    });
  });
});
