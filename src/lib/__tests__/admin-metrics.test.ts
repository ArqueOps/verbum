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
      const supabase = {
        from: vi.fn().mockImplementation((table: string) => ({
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          select: vi.fn().mockImplementation((selection: string, opts: { count: string; head: boolean }) => {
            if (table === "profiles") {
              return { data: null, count: 10, error: null };
            }
            if (table === "studies") {
              return {
                data: null,
                count: 5,
                error: null,
                eq: vi.fn().mockReturnValue({ data: null, count: 3, error: null }),
              };
            }
            if (table === "subscriptions") {
              return {
                eq: vi.fn().mockImplementation((_col: string, val: string) => {
                  if (val === "active") return { data: null, count: 8, error: null };
                  if (val === "canceled") return { data: null, count: 2, error: null };
                  return { data: null, count: 0, error: null };
                }),
              };
            }
            return { data: null, count: 0, error: null };
          }),
        })),
      } as unknown as SupabaseClient;

      const result = await getAdminMetrics(supabase);

      expect(result.totalUsers).toBe(10);
      expect(result.totalStudies).toBe(5);
      expect(result.activeSubscriptions).toBe(8);
      expect(result.canceledSubscriptions).toBe(2);
    });

    it("should return zeros when all data is empty", async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            data: null,
            count: 0,
            error: null,
            eq: vi.fn().mockReturnValue({ data: null, count: 0, error: null }),
          }),
        }),
      } as unknown as SupabaseClient;

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
      const supabase = {
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
      } as unknown as SupabaseClient;

      const result = await getStudiesPerDay(supabase, 30);

      const apr10 = result.find((r) => r.date === "2026-04-10");
      const apr11 = result.find((r) => r.date === "2026-04-11");
      expect(apr10?.count).toBe(2);
      expect(apr11?.count).toBe(1);
    });

    it("should return points with zero counts when no studies exist", async () => {
      const supabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        }),
      } as unknown as SupabaseClient;

      const result = await getStudiesPerDay(supabase, 7);

      expect(result.length).toBe(7);
      expect(result.every((r) => r.count === 0)).toBe(true);
    });
  });

  describe("getSubscribersPerDay", () => {
    it("should group new subscribers by date", async () => {
      const supabase = {
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
      } as unknown as SupabaseClient;

      const result = await getSubscribersPerDay(supabase, 30);

      const apr8 = result.find((r) => r.date === "2026-04-08");
      const apr9 = result.find((r) => r.date === "2026-04-09");
      expect(apr8?.count).toBe(2);
      expect(apr9?.count).toBe(1);
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
  });
});
