// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  getAdminMetrics,
  getStudiesPerDay,
  getSubscribersPerDay,
  getCancellationReasons,
} from "../admin-metrics";

function createMockSupabase(config: {
  profilesCount?: number;
  studiesCount?: number;
  publishedStudiesCount?: number;
  activeSubsCount?: number;
  canceledSubsCount?: number;
  studiesPerDayData?: Array<{ created_at: string }>;
  subscribersPerDayData?: Array<{ created_at: string }>;
  cancellationData?: Array<{ cancellation_reason: string }>;
}) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            data: null,
            count: config.profilesCount ?? 0,
            error: null,
          }),
        };
      }
      if (table === "studies") {
        return {
          select: vi.fn().mockImplementation(
            (_fields: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.head) {
                return {
                  eq: vi.fn().mockReturnValue({
                    data: null,
                    count: config.publishedStudiesCount ?? 0,
                    error: null,
                  }),
                  data: null,
                  count: config.studiesCount ?? 0,
                  error: null,
                };
              }
              return {
                gte: vi.fn().mockReturnValue({
                  data: config.studiesPerDayData ?? [],
                  error: null,
                }),
              };
            },
          ),
        };
      }
      if (table === "subscriptions") {
        return {
          select: vi.fn().mockImplementation(
            (_fields: string, opts?: { count?: string; head?: boolean }) => {
              if (opts?.head) {
                return {
                  eq: vi.fn().mockImplementation((_col: string, val: string) => {
                    if (val === "active") {
                      return {
                        data: null,
                        count: config.activeSubsCount ?? 0,
                        error: null,
                      };
                    }
                    if (val === "canceled") {
                      return {
                        not: vi.fn().mockReturnValue({
                          data: config.cancellationData ?? [],
                          error: null,
                        }),
                        data: null,
                        count: config.canceledSubsCount ?? 0,
                        error: null,
                      };
                    }
                    return { data: null, count: 0, error: null };
                  }),
                };
              }
              return {
                gte: vi.fn().mockReturnValue({
                  data: config.subscribersPerDayData ?? [],
                  error: null,
                }),
                eq: vi.fn().mockReturnValue({
                  not: vi.fn().mockReturnValue({
                    data: config.cancellationData ?? [],
                    error: null,
                  }),
                }),
              };
            },
          ),
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
    it("should return correct total counts", async () => {
      const mockClient = createMockSupabase({
        profilesCount: 100,
        studiesCount: 50,
        publishedStudiesCount: 30,
        activeSubsCount: 20,
        canceledSubsCount: 5,
      });

      const result = await getAdminMetrics(mockClient as never);

      expect(result.totalUsers).toBe(100);
      expect(result.totalStudies).toBe(50);
      expect(result.totalPublishedStudies).toBe(30);
      expect(result.activeSubscriptions).toBe(20);
      expect(result.canceledSubscriptions).toBe(5);
    });

    it("should return zeros when all data is empty", async () => {
      const mockClient = createMockSupabase({
        profilesCount: 0,
        studiesCount: 0,
        publishedStudiesCount: 0,
        activeSubsCount: 0,
        canceledSubsCount: 0,
      });

      const result = await getAdminMetrics(mockClient as never);

      expect(result.totalUsers).toBe(0);
      expect(result.totalStudies).toBe(0);
      expect(result.totalPublishedStudies).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.canceledSubscriptions).toBe(0);
    });
  });

  describe("getStudiesPerDay", () => {
    it("should group studies by date", async () => {
      const mockClient = createMockSupabase({
        studiesPerDayData: [
          { created_at: "2026-04-10T08:00:00.000Z" },
          { created_at: "2026-04-10T14:30:00.000Z" },
          { created_at: "2026-04-11T09:00:00.000Z" },
        ],
      });

      const result = await getStudiesPerDay(mockClient as never, 30);

      const apr10 = result.find((r) => r.date === "2026-04-10");
      const apr11 = result.find((r) => r.date === "2026-04-11");
      expect(apr10?.count).toBe(2);
      expect(apr11?.count).toBe(1);
    });

    it("should return entries when no studies exist", async () => {
      const mockClient = createMockSupabase({
        studiesPerDayData: [],
      });

      const result = await getStudiesPerDay(mockClient as never, 7);

      expect(result.length).toBe(7);
      for (const point of result) {
        expect(point.count).toBe(0);
      }
    });

    it("should handle null data gracefully", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      const result = await getStudiesPerDay(mockClient as never);

      expect(result.length).toBeGreaterThan(0);
      for (const point of result) {
        expect(point.count).toBe(0);
      }
    });
  });

  describe("getSubscribersPerDay", () => {
    it("should group new subscribers by date", async () => {
      const mockClient = createMockSupabase({
        subscribersPerDayData: [
          { created_at: "2026-04-08T10:00:00.000Z" },
          { created_at: "2026-04-08T16:00:00.000Z" },
          { created_at: "2026-04-09T12:00:00.000Z" },
          { created_at: "2026-04-10T08:00:00.000Z" },
        ],
      });

      const result = await getSubscribersPerDay(mockClient as never, 30);

      const apr8 = result.find((r) => r.date === "2026-04-08");
      const apr9 = result.find((r) => r.date === "2026-04-09");
      const apr10 = result.find((r) => r.date === "2026-04-10");
      expect(apr8?.count).toBe(2);
      expect(apr9?.count).toBe(1);
      expect(apr10?.count).toBe(1);
    });

    it("should return entries when no subscribers exist", async () => {
      const mockClient = createMockSupabase({
        subscribersPerDayData: [],
      });

      const result = await getSubscribersPerDay(mockClient as never, 7);

      expect(result.length).toBe(7);
      for (const point of result) {
        expect(point.count).toBe(0);
      }
    });

    it("should handle null data gracefully", async () => {
      const mockClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: null,
            }),
          }),
        }),
      };

      const result = await getSubscribersPerDay(mockClient as never);

      expect(result.length).toBeGreaterThan(0);
      for (const point of result) {
        expect(point.count).toBe(0);
      }
    });
  });

  describe("getCancellationReasons", () => {
    it("should group and sort cancellation reasons by count descending", async () => {
      const mockClient = createMockSupabase({
        cancellationData: [
          { cancellation_reason: "Muito caro" },
          { cancellation_reason: "Não uso mais" },
          { cancellation_reason: "Muito caro" },
          { cancellation_reason: "Muito caro" },
          { cancellation_reason: "Não uso mais" },
        ],
      });

      const result = await getCancellationReasons(mockClient as never);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ reason: "Muito caro", count: 3 });
      expect(result[1]).toEqual({ reason: "Não uso mais", count: 2 });
    });

    it("should return empty array when no cancellations exist", async () => {
      const mockClient = createMockSupabase({
        cancellationData: [],
      });

      const result = await getCancellationReasons(mockClient as never);

      expect(result).toEqual([]);
    });

    it("should handle null data from query gracefully", async () => {
      const mockClient = {
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

      const result = await getCancellationReasons(mockClient as never);

      expect(result).toEqual([]);
    });
  });
});
