// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAdminMetrics,
  getStudiesPerDay,
  getSubscribersPerDay,
  getCancellationReasons,
} from "../admin-metrics";

type MockSupabase = {
  from: ReturnType<typeof vi.fn>;
};

function createCountChain(count: number) {
  return { data: null, count, error: null };
}

function createMockSupabaseForMetrics(config: {
  profilesCount?: number;
  studiesCount?: number;
  publishedStudiesCount?: number;
  activeSubsCount?: number;
  canceledSubsCount?: number;
}): MockSupabase {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue(createCountChain(config.profilesCount ?? 0)),
        };
      }
      if (table === "studies") {
        return {
          select: vi.fn().mockImplementation((_fields: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: vi.fn().mockReturnValue(createCountChain(config.publishedStudiesCount ?? 0)),
                ...createCountChain(config.studiesCount ?? 0),
              };
            }
            return { data: [], error: null };
          }),
        };
      }
      if (table === "subscriptions") {
        return {
          select: vi.fn().mockImplementation((_fields: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: vi.fn().mockImplementation((_col: string, val: string) => {
                  if (val === "active") return createCountChain(config.activeSubsCount ?? 0);
                  if (val === "canceled") return createCountChain(config.canceledSubsCount ?? 0);
                  return createCountChain(0);
                }),
              };
            }
            return { data: [], error: null };
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ data: [], error: null }) };
    }),
  };
}

describe("admin-metrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAdminMetrics", () => {
    it("should return correct counts for all metrics", async () => {
      const mockClient = createMockSupabaseForMetrics({
        profilesCount: 100,
        studiesCount: 50,
        publishedStudiesCount: 30,
        activeSubsCount: 20,
        canceledSubsCount: 5,
      });

      const result = await getAdminMetrics(mockClient as unknown as SupabaseClient);

      expect(result.totalUsers).toBe(100);
      expect(result.totalStudies).toBe(50);
      expect(result.totalPublishedStudies).toBe(30);
      expect(result.activeSubscriptions).toBe(20);
      expect(result.canceledSubscriptions).toBe(5);
    });

    it("should return zeros when all data is empty", async () => {
      const mockClient = createMockSupabaseForMetrics({});

      const result = await getAdminMetrics(mockClient as unknown as SupabaseClient);

      expect(result.totalUsers).toBe(0);
      expect(result.totalStudies).toBe(0);
      expect(result.totalPublishedStudies).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.canceledSubscriptions).toBe(0);
    });

    it("should handle null counts gracefully", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ data: null, count: null, error: null }),
            data: null,
            count: null,
            error: null,
          }),
        }),
      };

      const result = await getAdminMetrics(mockClient as unknown as SupabaseClient);

      expect(result.totalUsers).toBe(0);
      expect(result.totalStudies).toBe(0);
      expect(result.totalPublishedStudies).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.canceledSubscriptions).toBe(0);
    });

    it("should query the correct tables", async () => {
      const mockClient = createMockSupabaseForMetrics({});

      await getAdminMetrics(mockClient as unknown as SupabaseClient);

      expect(mockClient.from).toHaveBeenCalledWith("profiles");
      expect(mockClient.from).toHaveBeenCalledWith("studies");
      expect(mockClient.from).toHaveBeenCalledWith("subscriptions");
    });
  });

  describe("getStudiesPerDay", () => {
    it("should group studies by date and include zero-count days", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [
                { created_at: "2026-04-10T08:00:00.000Z" },
                { created_at: "2026-04-10T14:30:00.000Z" },
                { created_at: "2026-04-11T09:00:00.000Z" },
              ],
              error: null,
            }),
          }),
        }),
      };

      const result = await getStudiesPerDay(mockClient as unknown as SupabaseClient, 30);

      const apr10 = result.find((p) => p.date === "2026-04-10");
      const apr11 = result.find((p) => p.date === "2026-04-11");
      expect(apr10?.count).toBe(2);
      expect(apr11?.count).toBe(1);
      expect(result.length).toBe(30);
    });

    it("should return all days with zero counts when no studies exist", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };

      const result = await getStudiesPerDay(mockClient as unknown as SupabaseClient, 7);

      expect(result).toHaveLength(7);
      for (const point of result) {
        expect(point.count).toBe(0);
      }
    });

    it("should handle null data gracefully", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      const result = await getStudiesPerDay(mockClient as unknown as SupabaseClient);

      expect(result).toHaveLength(30);
      for (const point of result) {
        expect(point.count).toBe(0);
      }
    });

    it("should sort results by date ascending", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };

      const result = await getStudiesPerDay(mockClient as unknown as SupabaseClient, 5);

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i]!.date <= result[i + 1]!.date).toBe(true);
      }
    });

    it("should throw on supabase error", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: { message: "DB error" },
            }),
          }),
        }),
      };

      await expect(
        getStudiesPerDay(mockClient as unknown as SupabaseClient),
      ).rejects.toEqual({ message: "DB error" });
    });
  });

  describe("getSubscribersPerDay", () => {
    it("should group subscribers by date and include zero-count days", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [
                { created_at: "2026-04-08T10:00:00.000Z" },
                { created_at: "2026-04-08T16:00:00.000Z" },
                { created_at: "2026-04-09T12:00:00.000Z" },
              ],
              error: null,
            }),
          }),
        }),
      };

      const result = await getSubscribersPerDay(mockClient as unknown as SupabaseClient, 30);

      const apr8 = result.find((p) => p.date === "2026-04-08");
      const apr9 = result.find((p) => p.date === "2026-04-09");
      expect(apr8?.count).toBe(2);
      expect(apr9?.count).toBe(1);
      expect(result.length).toBe(30);
    });

    it("should return all days with zero counts when no subscribers exist", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        }),
      };

      const result = await getSubscribersPerDay(mockClient as unknown as SupabaseClient, 7);

      expect(result).toHaveLength(7);
      for (const point of result) {
        expect(point.count).toBe(0);
      }
    });

    it("should handle null data gracefully", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      const result = await getSubscribersPerDay(mockClient as unknown as SupabaseClient);

      expect(result).toHaveLength(30);
      for (const point of result) {
        expect(point.count).toBe(0);
      }
    });

    it("should throw on supabase error", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: { message: "connection failed" },
            }),
          }),
        }),
      };

      await expect(
        getSubscribersPerDay(mockClient as unknown as SupabaseClient),
      ).rejects.toEqual({ message: "connection failed" });
    });
  });

  describe("getCancellationReasons", () => {
    it("should group and sort cancellation reasons by count descending", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                data: [
                  { cancellation_reason: "Muito caro" },
                  { cancellation_reason: "Não uso mais" },
                  { cancellation_reason: "Muito caro" },
                  { cancellation_reason: "Muito caro" },
                  { cancellation_reason: "Não uso mais" },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };

      const result = await getCancellationReasons(mockClient as unknown as SupabaseClient);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ reason: "Muito caro", count: 3 });
      expect(result[1]).toEqual({ reason: "Não uso mais", count: 2 });
    });

    it("should return empty array when no cancellations exist", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      };

      const result = await getCancellationReasons(mockClient as unknown as SupabaseClient);

      expect(result).toEqual([]);
    });

    it("should handle null data gracefully", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                data: null,
                error: null,
              }),
            }),
          }),
        }),
      };

      const result = await getCancellationReasons(mockClient as unknown as SupabaseClient);

      expect(result).toEqual([]);
    });

    it("should throw on supabase error", async () => {
      const mockClient: MockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                data: null,
                error: { message: "permission denied" },
              }),
            }),
          }),
        }),
      };

      await expect(
        getCancellationReasons(mockClient as unknown as SupabaseClient),
      ).rejects.toEqual({ message: "permission denied" });
    });

    it("should query subscriptions table with correct filters", async () => {
      const notFn = vi.fn().mockReturnValue({ data: [], error: null });
      const eqFn = vi.fn().mockReturnValue({ not: notFn });
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
      const fromFn = vi.fn().mockReturnValue({ select: selectFn });
      const mockClient: MockSupabase = { from: fromFn };

      await getCancellationReasons(mockClient as unknown as SupabaseClient);

      expect(fromFn).toHaveBeenCalledWith("subscriptions");
      expect(selectFn).toHaveBeenCalledWith("cancellation_reason");
      expect(eqFn).toHaveBeenCalledWith("status", "canceled");
      expect(notFn).toHaveBeenCalledWith("cancellation_reason", "is", null);
    });
  });
});
