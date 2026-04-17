// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAdminMetrics,
  getStudiesPerDay,
  getSubscribersPerDay,
  getCancellationReasons,
} from "../admin-metrics";

describe("admin-metrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAdminMetrics", () => {
    it("should return correct counts for all metrics", async () => {
      const supabase = createFullMetricsMock({
        profilesCount: 100,
        studiesCount: 50,
        publishedStudiesCount: 30,
        activeSubsCount: 20,
        canceledSubsCount: 5,
      });

      const result = await getAdminMetrics(supabase);

      expect(result.totalUsers).toBe(100);
      expect(result.totalStudies).toBe(50);
      expect(result.totalPublishedStudies).toBe(30);
      expect(result.activeSubscriptions).toBe(20);
      expect(result.canceledSubscriptions).toBe(5);
    });

    it("should return zeros when all counts are null", async () => {
      const supabase = createFullMetricsMock({
        profilesCount: null,
        studiesCount: null,
        publishedStudiesCount: null,
        activeSubsCount: null,
        canceledSubsCount: null,
      });

      const result = await getAdminMetrics(supabase);

      expect(result.totalUsers).toBe(0);
      expect(result.totalStudies).toBe(0);
      expect(result.totalPublishedStudies).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.canceledSubscriptions).toBe(0);
    });

    it("should return zeros when all data is empty", async () => {
      const supabase = createFullMetricsMock({
        profilesCount: 0,
        studiesCount: 0,
        publishedStudiesCount: 0,
        activeSubsCount: 0,
        canceledSubsCount: 0,
      });

      const result = await getAdminMetrics(supabase);

      expect(result.totalUsers).toBe(0);
      expect(result.totalStudies).toBe(0);
      expect(result.totalPublishedStudies).toBe(0);
      expect(result.activeSubscriptions).toBe(0);
      expect(result.canceledSubscriptions).toBe(0);
    });
  });

  describe("getStudiesPerDay", () => {
    it("should group studies by date", async () => {
      const supabase = createTimeSeriesMock("studies", [
        { created_at: "2026-04-10T08:00:00.000Z" },
        { created_at: "2026-04-10T14:30:00.000Z" },
        { created_at: "2026-04-11T09:00:00.000Z" },
      ]);

      const result = await getStudiesPerDay(supabase, 30);

      const apr10 = result.find((p) => p.date === "2026-04-10");
      const apr11 = result.find((p) => p.date === "2026-04-11");
      expect(apr10?.count).toBe(2);
      expect(apr11?.count).toBe(1);
    });

    it("should return entries with zero counts for days with no studies", async () => {
      const supabase = createTimeSeriesMock("studies", []);

      const result = await getStudiesPerDay(supabase, 7);

      expect(result.length).toBe(7);
      expect(result.every((p) => p.count === 0)).toBe(true);
    });

    it("should throw on supabase error", async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: { message: "connection failed" },
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(getStudiesPerDay(supabase)).rejects.toEqual({
        message: "connection failed",
      });
    });
  });

  describe("getSubscribersPerDay", () => {
    it("should group new subscribers by date", async () => {
      const supabase = createTimeSeriesMock("subscriptions", [
        { created_at: "2026-04-08T10:00:00.000Z" },
        { created_at: "2026-04-08T16:00:00.000Z" },
        { created_at: "2026-04-09T12:00:00.000Z" },
        { created_at: "2026-04-10T08:00:00.000Z" },
      ]);

      const result = await getSubscribersPerDay(supabase, 30);

      const apr8 = result.find((p) => p.date === "2026-04-08");
      const apr9 = result.find((p) => p.date === "2026-04-09");
      const apr10 = result.find((p) => p.date === "2026-04-10");
      expect(apr8?.count).toBe(2);
      expect(apr9?.count).toBe(1);
      expect(apr10?.count).toBe(1);
    });

    it("should return entries with zero counts for days with no subscribers", async () => {
      const supabase = createTimeSeriesMock("subscriptions", []);

      const result = await getSubscribersPerDay(supabase, 7);

      expect(result.length).toBe(7);
      expect(result.every((p) => p.count === 0)).toBe(true);
    });

    it("should throw on supabase error", async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: { message: "timeout" },
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(getSubscribersPerDay(supabase)).rejects.toEqual({
        message: "timeout",
      });
    });
  });

  describe("getCancellationReasons", () => {
    it("should group and sort cancellation reasons by count descending", async () => {
      const supabase = {
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
      } as unknown as SupabaseClient;

      const result = await getCancellationReasons(supabase);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ reason: "Muito caro", count: 3 });
      expect(result[1]).toEqual({ reason: "Não uso mais", count: 2 });
    });

    it("should return empty array when no cancellations exist", async () => {
      const supabase = {
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
      } as unknown as SupabaseClient;

      const result = await getCancellationReasons(supabase);

      expect(result).toEqual([]);
    });

    it("should throw on supabase error", async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                data: null,
                error: { message: "query failed" },
              }),
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      await expect(getCancellationReasons(supabase)).rejects.toEqual({
        message: "query failed",
      });
    });
  });
});

function createFullMetricsMock(config: {
  profilesCount: number | null;
  studiesCount: number | null;
  publishedStudiesCount: number | null;
  activeSubsCount: number | null;
  canceledSubsCount: number | null;
}) {
  let studiesCallIndex = 0;
  let subsCallIndex = 0;

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnValue({
            data: null,
            count: config.profilesCount,
            error: null,
          }),
        };
      }
      if (table === "studies") {
        return {
          select: vi.fn().mockImplementation(() => {
            studiesCallIndex++;
            if (studiesCallIndex === 1) {
              return { data: null, count: config.studiesCount, error: null };
            }
            return {
              eq: vi.fn().mockReturnValue({
                data: null,
                count: config.publishedStudiesCount,
                error: null,
              }),
            };
          }),
        };
      }
      if (table === "subscriptions") {
        return {
          select: vi.fn().mockImplementation(() => {
            subsCallIndex++;
            if (subsCallIndex === 1) {
              return {
                eq: vi.fn().mockReturnValue({
                  data: null,
                  count: config.activeSubsCount,
                  error: null,
                }),
              };
            }
            return {
              eq: vi.fn().mockReturnValue({
                data: null,
                count: config.canceledSubsCount,
                error: null,
              }),
            };
          }),
        };
      }
      return { select: vi.fn().mockReturnValue({ data: null, count: 0, error: null }) };
    }),
  } as unknown as SupabaseClient;
}

function createTimeSeriesMock(
  table: string,
  data: Array<{ created_at: string }>,
) {
  return {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          data,
          error: null,
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}
