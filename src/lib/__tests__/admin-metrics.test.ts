// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  getAdminMetrics,
  getStudiesPerDay,
  getSubscribersPerDay,
  getCancellationReasons,
} from "../admin-metrics";

function createMockSupabase(tables: Record<string, unknown>) {
  return {
    from: vi.fn().mockImplementation((table: string) => tables[table] ?? {
      select: vi.fn().mockReturnValue({ data: [], count: 0, error: null }),
    }),
  } as never;
}

describe("admin-metrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAdminMetrics", () => {
    it("should return correct counts for all metrics", async () => {
      const mockSupabase = createMockSupabase({
        profiles: {
          select: vi.fn().mockReturnValue({
            data: null,
            count: 42,
            error: null,
          }),
        },
        studies: {
          select: vi.fn().mockImplementation((_f: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: vi.fn().mockReturnValue({
                  data: null,
                  count: 10,
                  error: null,
                }),
                data: null,
                count: 25,
                error: null,
              };
            }
            return { data: [], error: null };
          }),
        },
        subscriptions: {
          select: vi.fn().mockImplementation((_f: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.head) {
              return {
                eq: vi.fn().mockImplementation((_col: string, val: string) => {
                  if (val === "active") return { data: null, count: 8, error: null };
                  if (val === "canceled") return { data: null, count: 3, error: null };
                  return { data: null, count: 0, error: null };
                }),
              };
            }
            return { data: [], error: null };
          }),
        },
      });

      const result = await getAdminMetrics(mockSupabase);

      expect(result.totalUsers).toBe(42);
      expect(result.totalStudies).toBe(25);
      expect(result.totalPublishedStudies).toBe(10);
      expect(result.activeSubscriptions).toBe(8);
      expect(result.canceledSubscriptions).toBe(3);
    });

    it("should return zeros when all data is empty", async () => {
      const mockSupabase = createMockSupabase({
        profiles: {
          select: vi.fn().mockReturnValue({
            data: null,
            count: 0,
            error: null,
          }),
        },
        studies: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: null,
              count: 0,
              error: null,
            }),
            data: null,
            count: 0,
            error: null,
          }),
        },
        subscriptions: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: null,
              count: 0,
              error: null,
            }),
          }),
        },
      });

      const result = await getAdminMetrics(mockSupabase);

      expect(result.totalUsers).toBe(0);
      expect(result.totalStudies).toBe(0);
      expect(result.totalPublishedStudies).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.canceledSubscriptions).toBe(0);
    });

    it("should handle null counts gracefully", async () => {
      const mockSupabase = createMockSupabase({
        profiles: {
          select: vi.fn().mockReturnValue({
            data: null,
            count: null,
            error: null,
          }),
        },
        studies: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: null,
              count: null,
              error: null,
            }),
            data: null,
            count: null,
            error: null,
          }),
        },
        subscriptions: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: null,
              count: null,
              error: null,
            }),
          }),
        },
      });

      const result = await getAdminMetrics(mockSupabase);

      expect(result.totalUsers).toBe(0);
      expect(result.totalStudies).toBe(0);
      expect(result.totalPublishedStudies).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.canceledSubscriptions).toBe(0);
    });
  });

  describe("getStudiesPerDay", () => {
    it("should group studies by date", async () => {
      const mockSupabase = createMockSupabase({
        studies: {
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
        },
      });

      const result = await getStudiesPerDay(mockSupabase, 30);

      const apr10 = result.find((r) => r.date === "2026-04-10");
      const apr11 = result.find((r) => r.date === "2026-04-11");
      expect(apr10?.count).toBe(2);
      expect(apr11?.count).toBe(1);
    });

    it("should return sorted results", async () => {
      const mockSupabase = createMockSupabase({
        studies: {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [
                { created_at: "2026-04-11T09:00:00.000Z" },
                { created_at: "2026-04-10T08:00:00.000Z" },
              ],
              error: null,
            }),
          }),
        },
      });

      const result = await getStudiesPerDay(mockSupabase, 30);

      for (let i = 0; i < result.length - 1; i++) {
        expect(result[i]!.date <= result[i + 1]!.date).toBe(true);
      }
    });

    it("should handle empty data", async () => {
      const mockSupabase = createMockSupabase({
        studies: {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        },
      });

      const result = await getStudiesPerDay(mockSupabase, 7);

      const nonZero = result.filter((r) => r.count > 0);
      expect(nonZero).toHaveLength(0);
    });

    it("should handle null data gracefully", async () => {
      const mockSupabase = createMockSupabase({
        studies: {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: null,
            }),
          }),
        },
      });

      const result = await getStudiesPerDay(mockSupabase);

      const nonZero = result.filter((r) => r.count > 0);
      expect(nonZero).toHaveLength(0);
    });
  });

  describe("getSubscribersPerDay", () => {
    it("should group new subscribers by date", async () => {
      const mockSupabase = createMockSupabase({
        subscriptions: {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [
                { created_at: "2026-04-08T10:00:00.000Z" },
                { created_at: "2026-04-08T16:00:00.000Z" },
                { created_at: "2026-04-09T12:00:00.000Z" },
                { created_at: "2026-04-10T08:00:00.000Z" },
              ],
              error: null,
            }),
          }),
        },
      });

      const result = await getSubscribersPerDay(mockSupabase, 30);

      const apr8 = result.find((r) => r.date === "2026-04-08");
      const apr9 = result.find((r) => r.date === "2026-04-09");
      const apr10 = result.find((r) => r.date === "2026-04-10");
      expect(apr8?.count).toBe(2);
      expect(apr9?.count).toBe(1);
      expect(apr10?.count).toBe(1);
    });

    it("should handle empty data", async () => {
      const mockSupabase = createMockSupabase({
        subscriptions: {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        },
      });

      const result = await getSubscribersPerDay(mockSupabase, 7);

      const nonZero = result.filter((r) => r.count > 0);
      expect(nonZero).toHaveLength(0);
    });

    it("should handle null data gracefully", async () => {
      const mockSupabase = createMockSupabase({
        subscriptions: {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: null,
            }),
          }),
        },
      });

      const result = await getSubscribersPerDay(mockSupabase);

      const nonZero = result.filter((r) => r.count > 0);
      expect(nonZero).toHaveLength(0);
    });
  });

  describe("getCancellationReasons", () => {
    it("should group and sort cancellation reasons by count descending", async () => {
      const mockSupabase = createMockSupabase({
        subscriptions: {
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
        },
      });

      const result = await getCancellationReasons(mockSupabase);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ reason: "Muito caro", count: 3 });
      expect(result[1]).toEqual({ reason: "Não uso mais", count: 2 });
    });

    it("should return empty array when no cancellations exist", async () => {
      const mockSupabase = createMockSupabase({
        subscriptions: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                data: [],
                error: null,
              }),
            }),
          }),
        },
      });

      const result = await getCancellationReasons(mockSupabase);

      expect(result).toEqual([]);
    });

    it("should handle null data gracefully", async () => {
      const mockSupabase = createMockSupabase({
        subscriptions: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                data: null,
                error: null,
              }),
            }),
          }),
        },
      });

      const result = await getCancellationReasons(mockSupabase);

      expect(result).toEqual([]);
    });
  });
});
