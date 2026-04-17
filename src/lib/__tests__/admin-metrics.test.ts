// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getAdminMetrics,
  getStudiesPerDay,
  getSubscribersPerDay,
  getCancellationReasons,
} from "../admin-metrics";

function mockSupabase(fromHandler: (table: string) => unknown) {
  return { from: vi.fn(fromHandler) } as unknown as SupabaseClient;
}

function countResponse(count: number) {
  return { data: null, count, error: null };
}

describe("admin-metrics", () => {
  describe("getAdminMetrics", () => {
    it("should return correct counts for all metrics", async () => {
      const supabase = mockSupabase((table) => {
        const selectFn = vi.fn().mockImplementation((_f: string, _opts?: unknown) => {
          if (table === "profiles") return countResponse(100);
          if (table === "studies") return {
            ...countResponse(50),
            eq: vi.fn().mockReturnValue(countResponse(20)),
          };
          if (table === "subscriptions") return {
            eq: vi.fn().mockImplementation((_col: string, val: string) => {
              if (val === "active") return countResponse(10);
              if (val === "canceled") return countResponse(3);
              return countResponse(0);
            }),
          };
          return countResponse(0);
        });
        return { select: selectFn };
      });

      const result = await getAdminMetrics(supabase);

      expect(result.totalUsers).toBe(100);
      expect(result.totalStudies).toBe(50);
      expect(result.totalPublishedStudies).toBe(20);
      expect(result.activeSubscriptions).toBe(10);
      expect(result.canceledSubscriptions).toBe(3);
    });

    it("should return zeros when counts are null", async () => {
      const supabase = mockSupabase(() => ({
        select: vi.fn().mockImplementation(() => ({
          ...countResponse(0),
          count: null,
          eq: vi.fn().mockReturnValue({ data: null, count: null, error: null }),
        })),
      }));

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
      const supabase = mockSupabase(() => ({
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
      }));

      const result = await getStudiesPerDay(supabase, 30);

      const apr10 = result.find((r) => r.date === "2026-04-10");
      const apr11 = result.find((r) => r.date === "2026-04-11");
      expect(apr10?.count).toBe(2);
      expect(apr11?.count).toBe(1);
    });

    it("should return sorted entries with zero-filled days when no studies exist", async () => {
      const supabase = mockSupabase(() => ({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
      }));

      const result = await getStudiesPerDay(supabase, 7);

      expect(result).toHaveLength(7);
      for (const point of result) {
        expect(point.count).toBe(0);
      }
    });

    it("should throw on supabase error", async () => {
      const supabase = mockSupabase(() => ({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            data: null,
            error: { message: "test error" },
          }),
        }),
      }));

      await expect(getStudiesPerDay(supabase)).rejects.toEqual({ message: "test error" });
    });
  });

  describe("getSubscribersPerDay", () => {
    it("should group new subscribers by date", async () => {
      const supabase = mockSupabase(() => ({
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
      }));

      const result = await getSubscribersPerDay(supabase, 30);

      const apr8 = result.find((r) => r.date === "2026-04-08");
      const apr9 = result.find((r) => r.date === "2026-04-09");
      expect(apr8?.count).toBe(2);
      expect(apr9?.count).toBe(1);
    });

    it("should return zero-filled days when no subscribers exist", async () => {
      const supabase = mockSupabase(() => ({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
      }));

      const result = await getSubscribersPerDay(supabase, 7);

      expect(result).toHaveLength(7);
      for (const point of result) {
        expect(point.count).toBe(0);
      }
    });
  });

  describe("getCancellationReasons", () => {
    it("should group and sort cancellation reasons by count descending", async () => {
      const supabase = mockSupabase(() => ({
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
      }));

      const result = await getCancellationReasons(supabase);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ reason: "Muito caro", count: 3 });
      expect(result[1]).toEqual({ reason: "Não uso mais", count: 2 });
    });

    it("should return empty array when no cancellations exist", async () => {
      const supabase = mockSupabase(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        }),
      }));

      const result = await getCancellationReasons(supabase);

      expect(result).toEqual([]);
    });

    it("should throw on supabase error", async () => {
      const supabase = mockSupabase(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            not: vi.fn().mockReturnValue({
              data: null,
              error: { message: "db error" },
            }),
          }),
        }),
      }));

      await expect(getCancellationReasons(supabase)).rejects.toEqual({ message: "db error" });
    });
  });
});
