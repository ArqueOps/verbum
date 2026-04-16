import type { MetadataRoute } from "next";
import { createServerClient } from "@supabase/ssr";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://verbum.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return staticPages;

  const supabase = createServerClient(url, anonKey, {
    cookies: { getAll: () => [], setAll: () => {} },
  });

  const { data: studies } = await supabase
    .from("studies")
    .select("slug, published_at, updated_at")
    .eq("is_published", true);

  const studyPages: MetadataRoute.Sitemap = (studies ?? []).map((study) => ({
    url: `${SITE_URL}/estudos/${study.slug}`,
    lastModified: new Date(study.updated_at ?? study.published_at),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...studyPages];
}
