import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-[clamp(80px,15vw,160px)] font-bold leading-none tracking-[-0.02em] text-[#1E3A5F] dark:text-[#C5D3E2]">
        404
      </h1>
      <h2 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em] text-neutral-800 dark:text-neutral-200 sm:text-3xl">
        Página não encontrada
      </h2>
      <p className="mt-3 max-w-md text-base leading-relaxed text-neutral-500 dark:text-neutral-400">
        O caminho que você procura não existe. Volte ao início.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center rounded-lg bg-[#1E3A5F] px-6 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#1A3254] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E3A5F] focus-visible:ring-offset-2 dark:bg-[#C8963E] dark:hover:bg-[#B5862F] dark:focus-visible:ring-[#C8963E]"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
