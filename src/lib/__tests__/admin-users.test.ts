import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  listUsers,
  grantSubscription,
  revokeSubscription,
  extendSubscription,
  deactivateAccount,
  getCancellationHistory,
} from "../admin-users";

type ChainMethods = Record<string, ReturnType<typeof vi.fn>>;

function createMockSupabase() {
  const chains: Record<string, ChainMethods> = {};
  const insertChains: Record<string, ChainMethods> = {};

  return {
    from: vi.fn((table: string) => {
      const chain = chains[table] ?? {};
      const insertChain = insertChains[table] ?? {};
      return {
        select: chain.select ?? vi.fn().mockReturnThis(),
        eq: chain.eq ?? vi.fn().mockReturnThis(),
        or: chain.or ?? vi.fn().mockReturnThis(),
        range: chain.range ?? vi.fn().mockReturnThis(),
        order: chain.order ?? vi.fn().mockReturnValue({ data: null, count: 0, error: null }),
        single: chain.single ?? vi.fn().mockReturnValue({ data: null, error: null }),
        insert: insertChain.insert ?? vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockReturnValue({ data: null, error: null }),
          }),
        }),
        update: chain.update ?? vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ error: null }),
        }),
      };
    }),
    _setChain(table: string, c: ChainMethods) {
      chains[table] = c;
    },
    _setInsertChain(table: string, c: ChainMethods) {
      insertChains[table] = c;
    },
  };
}

describe("admin-users", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("listUsers", () => {
    it("should return users with correct joined data", async () => {
      const mockData = [
        {
          id: "user-1",
          email: "user-1",
          display_name: "João Silva",
          role: "premium",
          created_at: "2026-01-01T00:00:00Z",
          studies: [{ count: 5 }],
          subscriptions: [{ status: "active", plan_id: "pro" }],
        },
        {
          id: "user-2",
          email: "user-2",
          display_name: "Maria Santos",
          role: "free",
          created_at: "2026-02-01T00:00:00Z",
          studies: [{ count: 0 }],
          subscriptions: [],
        },
      ];

      const orderResult = { data: mockData, count: 2, error: null };
      const chain: ChainMethods = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(orderResult),
      };

      const supabase = createMockSupabase();
      supabase.from = vi.fn().mockReturnValue(chain);

      const result = await listUsers(supabase as never);

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.users[0]).toEqual({
        id: "user-1",
        email: "user-1",
        display_name: "João Silva",
        role: "premium",
        created_at: "2026-01-01T00:00:00Z",
        study_count: 5,
        subscription_status: "active",
        subscription_plan: "pro",
      });
      expect(result.users[1]).toEqual(
        expect.objectContaining({
          study_count: 0,
          subscription_status: null,
          subscription_plan: null,
        }),
      );
    });

    it("should apply ILIKE search correctly", async () => {
      const orderResult = { data: [], count: 0, error: null };
      const chain: ChainMethods = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(orderResult),
      };
      const supabase = createMockSupabase();
      supabase.from = vi.fn().mockReturnValue(chain);

      await listUsers(supabase as never, { search: "joão" });

      expect(chain.or).toHaveBeenCalledWith(
        "display_name.ilike.%joão%,id.ilike.%joão%",
      );
    });

    it("should apply pagination with correct offset", async () => {
      const orderResult = { data: [], count: 50, error: null };
      const chain: ChainMethods = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(orderResult),
      };
      const supabase = createMockSupabase();
      supabase.from = vi.fn().mockReturnValue(chain);

      await listUsers(supabase as never, { page: 3, pageSize: 10 });

      expect(chain.range).toHaveBeenCalledWith(20, 29);
    });

    it("should throw on Supabase error", async () => {
      const orderResult = { data: null, count: null, error: { message: "connection failed" } };
      const chain: ChainMethods = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(orderResult),
      };
      const supabase = createMockSupabase();
      supabase.from = vi.fn().mockReturnValue(chain);

      await expect(listUsers(supabase as never)).rejects.toThrow(
        "Failed to list users: connection failed",
      );
    });

    it("should not call or() when search is not provided", async () => {
      const orderResult = { data: [], count: 0, error: null };
      const chain: ChainMethods = {
        select: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(orderResult),
      };
      const supabase = createMockSupabase();
      supabase.from = vi.fn().mockReturnValue(chain);

      await listUsers(supabase as never, {});

      expect(chain.or).not.toHaveBeenCalled();
    });
  });

  describe("grantSubscription", () => {
    it("should create subscription with correct period calculation", async () => {
      const now = new Date("2026-04-16T12:00:00.000Z");
      vi.setSystemTime(now);

      const subscriptionId = "sub-new-123";
      const insertSingle = vi.fn().mockReturnValue({
        data: { id: subscriptionId },
        error: null,
      });
      const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
      const insertFn = vi.fn().mockReturnValue({ select: insertSelect });
      const adminInsertFn = vi.fn().mockReturnValue({ error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === "subscriptions") {
            return { insert: insertFn };
          }
          if (table === "subscription_admin_actions") {
            return { insert: adminInsertFn };
          }
          return {};
        }),
      };

      const result = await grantSubscription(supabase as never, {
        userId: "user-1",
        planId: "pro",
        durationDays: 30,
        adminId: "admin-1",
        reason: "Cortesia",
      });

      expect(result.subscriptionId).toBe(subscriptionId);

      const insertCall = insertFn.mock.calls[0]![0];
      expect(insertCall.user_id).toBe("user-1");
      expect(insertCall.plan_id).toBe("pro");
      expect(insertCall.status).toBe("active");

      const periodStart = new Date(insertCall.current_period_start);
      const periodEnd = new Date(insertCall.current_period_end);
      const diffMs = periodEnd.getTime() - periodStart.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      expect(diffDays).toBe(30);

      vi.useRealTimers();
    });

    it("should log admin action for grant", async () => {
      vi.setSystemTime(new Date("2026-04-16T12:00:00.000Z"));

      const subscriptionId = "sub-456";
      const insertSingle = vi.fn().mockReturnValue({
        data: { id: subscriptionId },
        error: null,
      });
      const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
      const subInsertFn = vi.fn().mockReturnValue({ select: insertSelect });
      const adminInsertFn = vi.fn().mockReturnValue({ error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === "subscriptions") return { insert: subInsertFn };
          if (table === "subscription_admin_actions") return { insert: adminInsertFn };
          return {};
        }),
      };

      await grantSubscription(supabase as never, {
        userId: "user-1",
        planId: "pro",
        durationDays: 30,
        adminId: "admin-1",
        reason: "Promotional offer",
      });

      expect(adminInsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          admin_id: "admin-1",
          user_id: "user-1",
          action: "grant",
          subscription_id: subscriptionId,
          reason: "Promotional offer",
          metadata: { plan_id: "pro", duration_days: 30 },
        }),
      );

      vi.useRealTimers();
    });

    it("should throw when subscription insert fails", async () => {
      const insertSingle = vi.fn().mockReturnValue({
        data: null,
        error: { message: "duplicate key" },
      });
      const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
      const insertFn = vi.fn().mockReturnValue({ select: insertSelect });

      const supabase = {
        from: vi.fn().mockReturnValue({ insert: insertFn }),
      };

      await expect(
        grantSubscription(supabase as never, {
          userId: "user-1",
          planId: "pro",
          durationDays: 30,
          adminId: "admin-1",
        }),
      ).rejects.toThrow("Failed to grant subscription: duplicate key");
    });

    it("should set reason to null when not provided", async () => {
      vi.setSystemTime(new Date("2026-04-16T12:00:00.000Z"));

      const subscriptionId = "sub-789";
      const insertSingle = vi.fn().mockReturnValue({
        data: { id: subscriptionId },
        error: null,
      });
      const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
      const subInsertFn = vi.fn().mockReturnValue({ select: insertSelect });
      const adminInsertFn = vi.fn().mockReturnValue({ error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === "subscriptions") return { insert: subInsertFn };
          if (table === "subscription_admin_actions") return { insert: adminInsertFn };
          return {};
        }),
      };

      await grantSubscription(supabase as never, {
        userId: "user-1",
        planId: "basic",
        durationDays: 7,
        adminId: "admin-1",
      });

      expect(adminInsertFn).toHaveBeenCalledWith(
        expect.objectContaining({ reason: null }),
      );

      vi.useRealTimers();
    });
  });

  describe("revokeSubscription", () => {
    it("should set status to canceled and store reason", async () => {
      const subscriptionId = "sub-active-1";
      const selectSingle = vi.fn().mockReturnValue({
        data: { id: subscriptionId },
        error: null,
      });
      const updateEq = vi.fn().mockReturnValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: updateEq });
      const adminInsertFn = vi.fn().mockReturnValue({ error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === "subscriptions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: selectSingle,
                  }),
                }),
              }),
              update: updateFn,
            };
          }
          if (table === "subscription_admin_actions") {
            return { insert: adminInsertFn };
          }
          return {};
        }),
      };

      await revokeSubscription(supabase as never, {
        userId: "user-1",
        adminId: "admin-1",
        reason: "Violation of terms",
      });

      expect(updateFn).toHaveBeenCalledWith({ status: "canceled" });
      expect(updateEq).toHaveBeenCalledWith("id", subscriptionId);
    });

    it("should log admin action for revoke", async () => {
      const subscriptionId = "sub-active-2";
      const selectSingle = vi.fn().mockReturnValue({
        data: { id: subscriptionId },
        error: null,
      });
      const updateEq = vi.fn().mockReturnValue({ error: null });
      const adminInsertFn = vi.fn().mockReturnValue({ error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === "subscriptions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: selectSingle,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({ eq: updateEq }),
            };
          }
          if (table === "subscription_admin_actions") {
            return { insert: adminInsertFn };
          }
          return {};
        }),
      };

      await revokeSubscription(supabase as never, {
        userId: "user-1",
        adminId: "admin-1",
        reason: "Chargeback",
      });

      expect(adminInsertFn).toHaveBeenCalledWith({
        admin_id: "admin-1",
        user_id: "user-1",
        action: "revoke",
        subscription_id: subscriptionId,
        reason: "Chargeback",
      });
    });

    it("should throw when no active subscription found", async () => {
      const selectSingle = vi.fn().mockReturnValue({
        data: null,
        error: { message: "not found" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: selectSingle,
              }),
            }),
          }),
        }),
      };

      await expect(
        revokeSubscription(supabase as never, {
          userId: "user-no-sub",
          adminId: "admin-1",
          reason: "test",
        }),
      ).rejects.toThrow("No active subscription found for user");
    });
  });

  describe("extendSubscription", () => {
    it("should add correct days to current_period_end", async () => {
      const currentEnd = "2026-05-16T12:00:00.000Z";
      const subscriptionId = "sub-extend-1";

      const selectSingle = vi.fn().mockReturnValue({
        data: { id: subscriptionId, current_period_end: currentEnd },
        error: null,
      });
      const updateEq = vi.fn().mockReturnValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: updateEq });
      const adminInsertFn = vi.fn().mockReturnValue({ error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === "subscriptions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: selectSingle,
                  }),
                }),
              }),
              update: updateFn,
            };
          }
          if (table === "subscription_admin_actions") {
            return { insert: adminInsertFn };
          }
          return {};
        }),
      };

      const result = await extendSubscription(supabase as never, {
        userId: "user-1",
        additionalDays: 15,
        adminId: "admin-1",
      });

      const expectedEnd = new Date(
        new Date(currentEnd).getTime() + 15 * 24 * 60 * 60 * 1000,
      ).toISOString();
      expect(result.newPeriodEnd).toBe(expectedEnd);

      expect(updateFn).toHaveBeenCalledWith({
        current_period_end: expectedEnd,
      });
    });

    it("should return error if no active subscription", async () => {
      const selectSingle = vi.fn().mockReturnValue({
        data: null,
        error: { message: "no rows" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: selectSingle,
              }),
            }),
          }),
        }),
      };

      await expect(
        extendSubscription(supabase as never, {
          userId: "user-inactive",
          additionalDays: 30,
          adminId: "admin-1",
        }),
      ).rejects.toThrow("No active subscription found for user");
    });

    it("should log admin action for extend", async () => {
      const currentEnd = "2026-06-01T00:00:00.000Z";
      const subscriptionId = "sub-extend-2";

      const selectSingle = vi.fn().mockReturnValue({
        data: { id: subscriptionId, current_period_end: currentEnd },
        error: null,
      });
      const updateEq = vi.fn().mockReturnValue({ error: null });
      const adminInsertFn = vi.fn().mockReturnValue({ error: null });

      const supabase = {
        from: vi.fn((table: string) => {
          if (table === "subscriptions") {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    single: selectSingle,
                  }),
                }),
              }),
              update: vi.fn().mockReturnValue({ eq: updateEq }),
            };
          }
          if (table === "subscription_admin_actions") {
            return { insert: adminInsertFn };
          }
          return {};
        }),
      };

      await extendSubscription(supabase as never, {
        userId: "user-1",
        additionalDays: 10,
        adminId: "admin-1",
        reason: "Compensation for outage",
      });

      const expectedEnd = new Date(
        new Date(currentEnd).getTime() + 10 * 24 * 60 * 60 * 1000,
      ).toISOString();

      expect(adminInsertFn).toHaveBeenCalledWith({
        admin_id: "admin-1",
        user_id: "user-1",
        action: "extend",
        subscription_id: subscriptionId,
        reason: "Compensation for outage",
        metadata: { additional_days: 10, new_period_end: expectedEnd },
      });
    });
  });

  describe("deactivateAccount", () => {
    it("should set is_active to false", async () => {
      const updateEq = vi.fn().mockReturnValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

      const supabase = {
        from: vi.fn().mockReturnValue({ update: updateFn }),
      };

      await deactivateAccount(supabase as never, "user-1");

      expect(supabase.from).toHaveBeenCalledWith("profiles");
      expect(updateFn).toHaveBeenCalledWith({ is_active: false });
      expect(updateEq).toHaveBeenCalledWith("id", "user-1");
    });

    it("should throw on Supabase error", async () => {
      const updateEq = vi.fn().mockReturnValue({
        error: { message: "permission denied" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue({
          update: vi.fn().mockReturnValue({ eq: updateEq }),
        }),
      };

      await expect(
        deactivateAccount(supabase as never, "user-1"),
      ).rejects.toThrow("Failed to deactivate account: permission denied");
    });
  });

  describe("getCancellationHistory", () => {
    it("should return chronological entries", async () => {
      const mockEntries = [
        {
          id: "cancel-1",
          user_id: "user-1",
          reason: "Requested by user",
          canceled_at: "2026-01-15T10:00:00Z",
          admin_id: null,
        },
        {
          id: "cancel-2",
          user_id: "user-1",
          reason: "Admin revoked",
          canceled_at: "2026-03-20T14:30:00Z",
          admin_id: "admin-1",
        },
      ];

      const orderFn = vi.fn().mockReturnValue({ data: mockEntries, error: null });
      const eqFn = vi.fn().mockReturnValue({ order: orderFn });
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn });

      const supabase = {
        from: vi.fn().mockReturnValue({ select: selectFn }),
      };

      const result = await getCancellationHistory(supabase as never, "user-1");

      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe("cancel-1");
      expect(result[1]!.id).toBe("cancel-2");

      expect(supabase.from).toHaveBeenCalledWith("subscription_cancellations");
      expect(selectFn).toHaveBeenCalledWith(
        "id, user_id, reason, canceled_at, admin_id",
      );
      expect(eqFn).toHaveBeenCalledWith("user_id", "user-1");
      expect(orderFn).toHaveBeenCalledWith("canceled_at", { ascending: true });
    });

    it("should return empty array when no entries found", async () => {
      const orderFn = vi.fn().mockReturnValue({ data: [], error: null });

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: orderFn,
            }),
          }),
        }),
      };

      const result = await getCancellationHistory(supabase as never, "user-no-history");
      expect(result).toEqual([]);
    });

    it("should throw on Supabase error", async () => {
      const orderFn = vi.fn().mockReturnValue({
        data: null,
        error: { message: "table not found" },
      });

      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: orderFn,
            }),
          }),
        }),
      };

      await expect(
        getCancellationHistory(supabase as never, "user-1"),
      ).rejects.toThrow("Failed to fetch cancellation history: table not found");
    });
  });
});
