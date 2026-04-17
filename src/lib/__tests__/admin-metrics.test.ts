// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
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
  studiesData?: Array<{ created_at: string }>;
  subscribersData?: Array<{ created_at: string }>;
  cancellationData?: Array<{ cancellation_reason: string }>;
}) {
  return {
    from: vi.fn().mockImplementation((table: string) => ({
      select: vi.fn().mockImplementation((_fields: string, opts?: { count?: string; head?: boolean }) => {
        const chainable = {
          eq: vi.fn().mockImplementation((_col: string, val: string) => {
            if (table === "subscriptions" && opts?.head) {
              if (val === "active") return { data: null, count: config.activeSubsCount ?? 0, error: null };
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
            }
            if (table === "subscriptions" && !opts?.head && val === "canceled") {
              return {
                not: vi.fn().mockReturnValue({
                  data: config.cancellationData ?? [],
                  error: null,
                }),
              };
            }
            return chainable;
          }),
          gte: vi.fn().mockReturnValue({
            data: table === "studies" ? (config.studiesData ?? []) : (config.subscribersData ?? []),
            error: null,
          }),
          data: null,
          count:
            table === "profiles"
              ? (config.profilesCount ?? 0)
              : table === "studies"
                ? opts?.head
                  ? (config.studiesCount ?? 0)
                  : 0
                : 0,
          error: null,
        };

        if (table === "studies" && opts?.head) {
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

        return chainable;
      }),
    })),
  } as unknown as SupabaseClient;
}

describe("admin-metrics", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("getAdminMetrics", () => {
    it("should return correct metric counts", async () => {
      const supabase = createMockSupabase({
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

    it("should return zeros when all data is empty", async () => {
      const supabase = createMockSupabase({});

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
        studiesData: [
          { created_at: "2026-04-10T08:00:00.000Z" },
          { created_at: "2026-04-10T14:30:00.000Z" },
          { created_at: "2026-04-11T09:00:00.000Z" },
        ],
      });

      const result = await getStudiesPerDay(supabase, 30);

      const apr10 = result.find((r) => r.date === "2026-04-10");
      const apr11 = result.find((r) => r.date === "2026-04-11");
      expect(apr10?.count).toBe(2);
      expect(apr11?.count).toBe(1);
    });

    it("should return array with zero counts when no studies exist", async () => {
      const supabase = createMockSupabase({ studiesData: [] });

      const result = await getStudiesPerDay(supabase, 7);

      expect(result.length).toBe(7);
      expect(result.every((r) => r.count === 0)).toBe(true);
    });
  });

  describe("getSubscribersPerDay", () => {
    it("should group new subscribers by date", async () => {
      const supabase = createMockSupabase({
        subscribersData: [
          { created_at: "2026-04-08T10:00:00.000Z" },
          { created_at: "2026-04-08T16:00:00.000Z" },
          { created_at: "2026-04-09T12:00:00.000Z" },
        ],
      });

      const result = await getSubscribersPerDay(supabase, 30);

      const apr8 = result.find((r) => r.date === "2026-04-08");
      const apr9 = result.find((r) => r.date === "2026-04-09");
      expect(apr8?.count).toBe(2);
      expect(apr9?.count).toBe(1);
    });

    it("should return array with zero counts when no subscribers exist", async () => {
      const supabase = createMockSupabase({ subscribersData: [] });

      const result = await getSubscribersPerDay(supabase, 7);

      expect(result.length).toBe(7);
      expect(result.every((r) => r.count === 0)).toBe(true);
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
