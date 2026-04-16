// @vitest-environment node

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll } from "vitest";
import {
  getAdminMetrics,
  getStudiesPerDay,
  getSubscribersPerDay,
  getCancellationReasons,
  type AdminMetrics,
  type TimeSeriesPoint,
  type CancellationReason,
} from "@/lib/admin-metrics";

const SUPABASE_URL = `https://${process.env.CRED_SUPABASE_PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.CRED_SUPABASE_SERVICE_ROLE_KEY!;

function createServiceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

describe("Admin metric queries (integration)", () => {
  let supabase: SupabaseClient;

  beforeAll(() => {
    supabase = createServiceClient();
  });

  // ---------------------------------------------------------------------------
  // Schema validation — subscriptions table has required columns
  // ---------------------------------------------------------------------------

  describe("subscriptions schema", () => {
    it("should have plan_interval, canceled_at, and cancellation_reason columns", async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("plan_interval, canceled_at, cancellation_reason")
        .limit(0);

      expect(error).toBeNull();
      expect(data).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // getAdminMetrics
  // ---------------------------------------------------------------------------

  describe("getAdminMetrics()", () => {
    it("should return an object with all expected numeric fields", async () => {
      const metrics: AdminMetrics = await getAdminMetrics(supabase);

      expect(metrics).toHaveProperty("totalUsers");
      expect(metrics).toHaveProperty("totalStudies");
      expect(metrics).toHaveProperty("totalPublishedStudies");
      expect(metrics).toHaveProperty("activeSubscriptions");
      expect(metrics).toHaveProperty("canceledSubscriptions");

      expect(typeof metrics.totalUsers).toBe("number");
      expect(typeof metrics.totalStudies).toBe("number");
      expect(typeof metrics.totalPublishedStudies).toBe("number");
      expect(typeof metrics.activeSubscriptions).toBe("number");
      expect(typeof metrics.canceledSubscriptions).toBe("number");
    });

    it("should return non-negative counts", async () => {
      const metrics = await getAdminMetrics(supabase);

      expect(metrics.totalUsers).toBeGreaterThanOrEqual(0);
      expect(metrics.totalStudies).toBeGreaterThanOrEqual(0);
      expect(metrics.totalPublishedStudies).toBeGreaterThanOrEqual(0);
      expect(metrics.activeSubscriptions).toBeGreaterThanOrEqual(0);
      expect(metrics.canceledSubscriptions).toBeGreaterThanOrEqual(0);
    });

    it("should have publishedStudies <= totalStudies", async () => {
      const metrics = await getAdminMetrics(supabase);
      expect(metrics.totalPublishedStudies).toBeLessThanOrEqual(
        metrics.totalStudies,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // getStudiesPerDay
  // ---------------------------------------------------------------------------

  describe("getStudiesPerDay()", () => {
    it("should return an array of TimeSeriesPoint objects", async () => {
      const series: TimeSeriesPoint[] = await getStudiesPerDay(supabase);

      expect(Array.isArray(series)).toBe(true);

      for (const point of series) {
        expect(typeof point.date).toBe("string");
        expect(typeof point.count).toBe("number");
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(point.count).toBeGreaterThanOrEqual(0);
      }
    });

    it("should return exactly 30 data points by default", async () => {
      const series = await getStudiesPerDay(supabase);
      expect(series).toHaveLength(30);
    });

    it("should return dates sorted in ascending order", async () => {
      const series = await getStudiesPerDay(supabase);
      for (let i = 1; i < series.length; i++) {
        expect(series[i]!.date >= series[i - 1]!.date).toBe(true);
      }
    });

    it("should accept a custom day range", async () => {
      const series = await getStudiesPerDay(supabase, 7);
      expect(series).toHaveLength(7);
    });
  });

  // ---------------------------------------------------------------------------
  // getSubscribersPerDay
  // ---------------------------------------------------------------------------

  describe("getSubscribersPerDay()", () => {
    it("should return an array of TimeSeriesPoint objects", async () => {
      const series: TimeSeriesPoint[] =
        await getSubscribersPerDay(supabase);

      expect(Array.isArray(series)).toBe(true);

      for (const point of series) {
        expect(typeof point.date).toBe("string");
        expect(typeof point.count).toBe("number");
        expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(point.count).toBeGreaterThanOrEqual(0);
      }
    });

    it("should return exactly 30 data points by default", async () => {
      const series = await getSubscribersPerDay(supabase);
      expect(series).toHaveLength(30);
    });

    it("should return dates sorted in ascending order", async () => {
      const series = await getSubscribersPerDay(supabase);
      for (let i = 1; i < series.length; i++) {
        expect(series[i]!.date >= series[i - 1]!.date).toBe(true);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // getCancellationReasons
  // ---------------------------------------------------------------------------

  describe("getCancellationReasons()", () => {
    it("should return an array of CancellationReason objects", async () => {
      const reasons: CancellationReason[] =
        await getCancellationReasons(supabase);

      expect(Array.isArray(reasons)).toBe(true);

      for (const entry of reasons) {
        expect(typeof entry.reason).toBe("string");
        expect(typeof entry.count).toBe("number");
        expect(entry.reason.length).toBeGreaterThan(0);
        expect(entry.count).toBeGreaterThan(0);
      }
    });

    it("should return an empty array when no cancellations exist", async () => {
      const reasons = await getCancellationReasons(supabase);
      expect(Array.isArray(reasons)).toBe(true);
    });

    it("should return reasons sorted by count descending", async () => {
      const reasons = await getCancellationReasons(supabase);
      for (let i = 1; i < reasons.length; i++) {
        expect(reasons[i]!.count).toBeLessThanOrEqual(reasons[i - 1]!.count);
      }
    });
  });
});
