import type { Metadata } from "next";
import { Suspense } from "react";
import { RecentStudiesSection } from "@/components/blog/RecentStudiesSection";

export const metadata: Metadata = {
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-4">
      <div className="py-16 text-center sm:py-24">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          Verbum
        </h1>
        <p className="mt-4 text-lg text-foreground/70">
          Profundidade que ilumina
        </p>
      </div>

      <Suspense fallback={null}>
        <RecentStudiesSection />
      </Suspense>
    </main>
  );
}
