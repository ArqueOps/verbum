// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAdminMetrics,
  getStudiesPerDay,
  getSubscribersPerDay,
  getCancellationReasons,
} from "../admin-metrics";

function createMockAdminClient(config: {
  studiesCount?: number;
  activeSubscribersCount?: number;
  monthlyCount?: number;
  annualCount?: number;
  canceledCount?: number;
  topUsersData?: Array<{
    owner_id: string;
    profiles: { display_name: string | null } | null;
  }>;
  studiesPerDayData?: Array<{ created_at: string }>;
  subscribersPerDayData?: Array<{ created_at: string }>;
  webhookEventsData?: Array<{
    payload: { cancellation_reason?: string };
  }>;
}) {
  const studiesFromCall = {
    select: vi.fn().mockImplementation((fields: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head) {
        return {
          gte: vi.fn().mockReturnValue({
            data: null,
            count: config.studiesCount ?? 0,
            error: null,
          }),
        };
      }
      return {
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            data: config.studiesPerDayData ?? [],
            error: null,
          }),
          data: config.topUsersData ?? [],
          error: null,
        }),
      };
    }),
  };

  const subscriptionsFromCall = {
    select: vi.fn().mockImplementation((fields: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.head) {
        return {
          eq: vi.fn().mockImplementation((_col: string, val: string) => {
            if (val === "active") {
              return {
                eq: vi.fn().mockImplementation((_c: string, planVal: string) => {
                  if (planVal === "monthly") {
                    return { data: null, count: config.monthlyCount ?? 0, error: null };
                  }
                  if (planVal === "annual") {
                    return { data: null, count: config.annualCount ?? 0, error: null };
                  }
                  return { data: null, count: 0, error: null };
                }),
                data: null,
                count: config.activeSubscribersCount ?? 0,
                error: null,
              };
            }
            return { data: null, count: 0, error: null };
          }),
          in: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              count: config.canceledCount ?? 0,
              error: null,
            }),
          }),
        };
      }
      return {
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: config.subscribersPerDayData ?? [],
              error: null,
            }),
          }),
        }),
      };
    }),
  };

  const webhookEventsFromCall = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        data: config.webhookEventsData ?? [],
        error: null,
      }),
    }),
  };

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "studies") return studiesFromCall;
      if (table === "subscriptions") return subscriptionsFromCall;
      if (table === "webhook_events") return webhookEventsFromCall;
      return { select: vi.fn().mockReturnValue({ data: [], error: null }) };
    }),
  };
}

describe("admin-metrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAdminMetrics", () => {
    it("should calculate MRR correctly: 3 monthly + 2 annual = 3×19.90 + 2×(199/12)", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        studiesCount: 50,
        activeSubscribersCount: 5,
        monthlyCount: 3,
        annualCount: 2,
        canceledCount: 0,
        topUsersData: [],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getAdminMetrics("month");

      // Assert
      const expectedMrr = 3 * 19.9 + 2 * (199 / 12);
      expect(result.mrr).toBeCloseTo(expectedMrr, 2);
    });

    it("should calculate ARR as MRR × 12", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        studiesCount: 10,
        activeSubscribersCount: 4,
        monthlyCount: 2,
        annualCount: 2,
        canceledCount: 0,
        topUsersData: [],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getAdminMetrics("month");

      // Assert
      const expectedMrr = 2 * 19.9 + 2 * (199 / 12);
      expect(result.arr).toBeCloseTo(expectedMrr * 12, 2);
    });

    it("should calculate churn rate as cancellations / (active + canceled)", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        studiesCount: 0,
        activeSubscribersCount: 8,
        monthlyCount: 5,
        annualCount: 3,
        canceledCount: 2,
        topUsersData: [],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getAdminMetrics("month");

      // Assert — churn = 2 / (8 + 2) = 0.2
      expect(result.churnRate).toBeCloseTo(0.2, 4);
    });

    it("should return churn rate 0 when there are 0 subscribers and 0 cancellations", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        studiesCount: 0,
        activeSubscribersCount: 0,
        monthlyCount: 0,
        annualCount: 0,
        canceledCount: 0,
        topUsersData: [],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getAdminMetrics("month");

      // Assert
      expect(result.churnRate).toBe(0);
    });

    it("should return zeros when all data is empty", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        studiesCount: 0,
        activeSubscribersCount: 0,
        monthlyCount: 0,
        annualCount: 0,
        canceledCount: 0,
        topUsersData: [],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getAdminMetrics();

      // Assert
      expect(result.totalStudies).toBe(0);
      expect(result.totalSubscribers).toBe(0);
      expect(result.mrr).toBe(0);
      expect(result.arr).toBe(0);
      expect(result.churnRate).toBe(0);
      expect(result.topUsers).toEqual([]);
    });

    it("should return top users sorted by count descending, limited to 10", async () => {
      // Arrange
      const topUsersData = [];
      for (let i = 0; i < 15; i++) {
        const userId = `user-${i}`;
        const count = 15 - i;
        for (let j = 0; j < count; j++) {
          topUsersData.push({
            owner_id: userId,
            profiles: { display_name: `User ${i}` },
          });
        }
      }

      const mockClient = createMockAdminClient({
        studiesCount: topUsersData.length,
        activeSubscribersCount: 0,
        monthlyCount: 0,
        annualCount: 0,
        canceledCount: 0,
        topUsersData,
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getAdminMetrics("month");

      // Assert
      expect(result.topUsers).toHaveLength(10);
      expect(result.topUsers[0]!.count).toBe(15);
      expect(result.topUsers[0]!.displayName).toBe("User 0");
      expect(result.topUsers[9]!.count).toBe(6);
      for (let i = 0; i < result.topUsers.length - 1; i++) {
        expect(result.topUsers[i]!.count).toBeGreaterThanOrEqual(
          result.topUsers[i + 1]!.count,
        );
      }
    });

    it("should use fallback display name when profiles.display_name is null", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        studiesCount: 1,
        activeSubscribersCount: 0,
        monthlyCount: 0,
        annualCount: 0,
        canceledCount: 0,
        topUsersData: [
          { owner_id: "user-1", profiles: { display_name: null } },
        ],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getAdminMetrics("month");

      // Assert
      expect(result.topUsers[0]!.displayName).toBe("Usuário");
    });

    it("should handle MRR with only monthly subscribers", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        studiesCount: 0,
        activeSubscribersCount: 5,
        monthlyCount: 5,
        annualCount: 0,
        canceledCount: 0,
        topUsersData: [],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getAdminMetrics("month");

      // Assert
      expect(result.mrr).toBeCloseTo(5 * 19.9, 2);
    });

    it("should handle MRR with only annual subscribers", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        studiesCount: 0,
        activeSubscribersCount: 4,
        monthlyCount: 0,
        annualCount: 4,
        canceledCount: 0,
        topUsersData: [],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getAdminMetrics("month");

      // Assert
      expect(result.mrr).toBeCloseTo(4 * (199 / 12), 2);
    });
  });

  describe("getStudiesPerDay", () => {
    it("should group studies by date", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        studiesPerDayData: [
          { created_at: "2026-04-10T08:00:00.000Z" },
          { created_at: "2026-04-10T14:30:00.000Z" },
          { created_at: "2026-04-11T09:00:00.000Z" },
        ],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getStudiesPerDay(30);

      // Assert
      expect(result).toEqual([
        { date: "2026-04-10", count: 2 },
        { date: "2026-04-11", count: 1 },
      ]);
    });

    it("should return empty array when no studies exist", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        studiesPerDayData: [],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getStudiesPerDay(7);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle null data gracefully", async () => {
      // Arrange
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getStudiesPerDay();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getSubscribersPerDay", () => {
    it("should group new subscribers by date", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        subscribersPerDayData: [
          { created_at: "2026-04-08T10:00:00.000Z" },
          { created_at: "2026-04-08T16:00:00.000Z" },
          { created_at: "2026-04-09T12:00:00.000Z" },
          { created_at: "2026-04-10T08:00:00.000Z" },
        ],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getSubscribersPerDay(30);

      // Assert
      expect(result).toEqual([
        { date: "2026-04-08", count: 2 },
        { date: "2026-04-09", count: 1 },
        { date: "2026-04-10", count: 1 },
      ]);
    });

    it("should return empty array when no subscribers exist", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        subscribersPerDayData: [],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getSubscribersPerDay(7);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle null data gracefully", async () => {
      // Arrange
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getSubscribersPerDay();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("getCancellationReasons", () => {
    it("should group and sort cancellation reasons by count descending", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        webhookEventsData: [
          { payload: { cancellation_reason: "Muito caro" } },
          { payload: { cancellation_reason: "Não uso mais" } },
          { payload: { cancellation_reason: "Muito caro" } },
          { payload: { cancellation_reason: "Muito caro" } },
          { payload: { cancellation_reason: "Não uso mais" } },
        ],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getCancellationReasons();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        reason: "Muito caro",
        count: 3,
        percentage: 60,
      });
      expect(result[1]).toEqual({
        reason: "Não uso mais",
        count: 2,
        percentage: 40,
      });
    });

    it("should return empty array when no cancellations exist", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        webhookEventsData: [],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getCancellationReasons();

      // Assert
      expect(result).toEqual([]);
    });

    it("should use 'Não informado' when cancellation_reason is missing", async () => {
      // Arrange
      const mockClient = createMockAdminClient({
        webhookEventsData: [
          { payload: {} as { cancellation_reason?: string } },
          { payload: { cancellation_reason: "Mudei de app" } },
          { payload: {} as { cancellation_reason?: string } },
        ],
      });
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getCancellationReasons();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        reason: "Não informado",
        count: 2,
        percentage: 67,
      });
      expect(result[1]).toEqual({
        reason: "Mudei de app",
        count: 1,
        percentage: 33,
      });
    });

    it("should handle null data from webhook_events gracefully", async () => {
      // Arrange
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };
      vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

      // Act
      const result = await getCancellationReasons();

      // Assert
      expect(result).toEqual([]);
    });
  });
});
