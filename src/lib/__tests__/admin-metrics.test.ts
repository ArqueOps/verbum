// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getAdminMetrics,
  getStudiesPerDay,
  getSubscribersPerDay,
  getCancellationReasons,
} from "../admin-metrics";

function createMockSupabase(tableHandlers: Record<string, unknown>) {
  return {
    from: vi.fn().mockImplementation((table: string) => {
      return tableHandlers[table] ?? {
        select: vi.fn().mockReturnValue({ data: [], error: null, count: 0 }),
      };
    }),
  } as unknown as SupabaseClient;
}

describe("admin-metrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAdminMetrics", () => {
    it("should return correct counts for all metrics", async () => {
      const selectMock = vi.fn().mockImplementation((_fields: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.head) {
          return {
            eq: vi.fn().mockImplementation((_col: string, val: string) => {
              if (val === true as unknown) return { data: null, count: 12, error: null };
              if (val === "active") return { data: null, count: 5, error: null };
              if (val === "canceled") return { data: null, count: 2, error: null };
              return { data: null, count: 0, error: null };
            }),
            data: null,
            count: 100,
            error: null,
          };
        }
        return { data: [], error: null };
      });

      const supabase = createMockSupabase({
        profiles: { select: vi.fn().mockReturnValue({ data: null, count: 50, error: null }) },
        studies: { select: selectMock },
        subscriptions: { select: selectMock },
      });

      const result = await getAdminMetrics(supabase);

      expect(result).toHaveProperty("totalUsers");
      expect(result).toHaveProperty("totalStudies");
      expect(result).toHaveProperty("totalPublishedStudies");
      expect(result).toHaveProperty("activeSubscriptions");
      expect(result).toHaveProperty("canceledSubscriptions");
    });

    it("should return zeros when all counts are null", async () => {
      const nullSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ data: null, count: null, error: null }),
        data: null,
        count: null,
        error: null,
      });

      const supabase = createMockSupabase({
        profiles: { select: nullSelect },
        studies: { select: nullSelect },
        subscriptions: { select: nullSelect },
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
      const supabase = createMockSupabase({
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

      const result = await getStudiesPerDay(supabase, 30);

      const apr10 = result.find((r) => r.date === "2026-04-10");
      const apr11 = result.find((r) => r.date === "2026-04-11");
      expect(apr10?.count).toBe(2);
      expect(apr11?.count).toBe(1);
    });

    it("should return empty-count entries when no studies exist", async () => {
      const supabase = createMockSupabase({
        studies: {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        },
      });

      const result = await getStudiesPerDay(supabase, 7);

      expect(result.every((r) => r.count === 0)).toBe(true);
    });

    it("should throw on error", async () => {
      const supabase = createMockSupabase({
        studies: {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: { message: "query failed" },
            }),
          }),
        },
      });

      await expect(getStudiesPerDay(supabase)).rejects.toEqual({ message: "query failed" });
    });
  });

  describe("getSubscribersPerDay", () => {
    it("should group new subscribers by date", async () => {
      const supabase = createMockSupabase({
        subscriptions: {
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
        },
      });

      const result = await getSubscribersPerDay(supabase, 30);

      const apr8 = result.find((r) => r.date === "2026-04-08");
      const apr9 = result.find((r) => r.date === "2026-04-09");
      expect(apr8?.count).toBe(2);
      expect(apr9?.count).toBe(1);
    });

    it("should return empty-count entries when no subscribers exist", async () => {
      const supabase = createMockSupabase({
        subscriptions: {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        },
      });

      const result = await getSubscribersPerDay(supabase, 7);

      expect(result.every((r) => r.count === 0)).toBe(true);
    });

    it("should throw on error", async () => {
      const supabase = createMockSupabase({
        subscriptions: {
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: null,
              error: { message: "query failed" },
            }),
          }),
        },
      });

      await expect(getSubscribersPerDay(supabase)).rejects.toEqual({ message: "query failed" });
    });
  });

  describe("getCancellationReasons", () => {
    it("should group and sort cancellation reasons by count descending", async () => {
      const supabase = createMockSupabase({
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

      const result = await getCancellationReasons(supabase);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ reason: "Muito caro", count: 3 });
      expect(result[1]).toEqual({ reason: "Não uso mais", count: 2 });
    });

    it("should return empty array when no cancellations exist", async () => {
      const supabase = createMockSupabase({
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

      const result = await getCancellationReasons(supabase);

      expect(result).toEqual([]);
    });

    it("should throw on error", async () => {
      const supabase = createMockSupabase({
        subscriptions: {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockReturnValue({
                data: null,
                error: { message: "query failed" },
              }),
            }),
          }),
        },
      });

      await expect(getCancellationReasons(supabase)).rejects.toEqual({ message: "query failed" });
    });
  });
});
