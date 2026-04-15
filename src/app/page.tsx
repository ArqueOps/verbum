import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col items-center gap-12 px-8 py-32 text-center">
        <section aria-label="hero">
          <h1 className="text-5xl font-bold leading-tight tracking-tight text-zinc-900 dark:text-zinc-50">
            Verbum
          </h1>
          <p className="mt-4 text-xl text-zinc-600 dark:text-zinc-400">
            Profundidade que ilumina
          </p>
        </section>

        <Link
          href="/estudo"
          role="button"
          className="rounded-full bg-zinc-900 px-8 py-3 text-lg font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Comece seu estudo
        </Link>
      </main>
    </div>
  );
}
