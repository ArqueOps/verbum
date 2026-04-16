import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://verbum.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cookieStore = await (await import("next/headers")).cookies();
  const supabase = createClient(cookieStore);

  const { data: studies } = await supabase
    .from("studies")
    .select("slug, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const studyPages: MetadataRoute.Sitemap = (studies ?? []).map((study) => ({
    url: `${BASE_URL}/estudos/${study.slug}`,
    lastModified: new Date(study.updated_at),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...studyPages];
}
