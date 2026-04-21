import type { Metadata } from "next";
import { BlogContent } from "@/components/blog/BlogContent";

export const metadata: Metadata = {
  title: "Blog | Verbum",
  description:
    "Explore estudos bíblicos aprofundados gerados com inteligência artificial.",
  alternates: {
    canonical: "/blog",
  },
};

export default function BlogPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
          Blog
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estudos bíblicos aprofundados gerados com inteligência artificial.
        </p>
      </div>

      <BlogContent />
    </div>
  );
}
