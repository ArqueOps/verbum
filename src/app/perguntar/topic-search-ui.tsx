"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Loader2, Search, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type Status = "idle" | "streaming" | "done" | "error";

interface TopicReference {
  title: string;
  book: string;
  abbrev: string;
  chapter: number;
  verse_start: number;
  verse_end?: number;
  summary: string;
  detail: string;
}

interface TopicResult {
  id?: string;
  synthesis: string;
  references: TopicReference[];
}

const SUGGESTED_TOPICS = [
  "amor",
  "ansiedade",
  "casamento",
  "dinheiro",
  "perdão",
  "oração",
  "sofrimento",
  "esperança",
  "fé",
  "justiça",
  "pecado",
  "graça",
];

export function TopicSearchUI() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<TopicResult | null>(null);
  const [openDetail, setOpenDetail] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    async (searchValue?: string) => {
      const q = (searchValue ?? query).trim();
      if (!q || status === "streaming") return;
      setQuery(q);

      setStatus("streaming");
      setResult(null);
      setOpenDetail(null);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/topic-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            toast.error("Entre na sua conta para perguntar.");
            router.push("/login?redirect=/perguntar");
            setStatus("idle");
            return;
          }
          if (response.status === 403) {
            const data = await response.json().catch(() => null);
            toast.error(data?.error ?? "Limite diário atingido.");
            setStatus("idle");
            return;
          }
          toast.error("Falha ao processar a busca. Tente novamente.");
          setStatus("error");
          return;
        }

        if (!response.body) {
          setStatus("error");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events in buffer
          let eventStart = 0;
          while (true) {
            const eventEnd = buffer.indexOf("\n\n", eventStart);
            if (eventEnd === -1) break;
            const eventText = buffer.slice(eventStart, eventEnd);
            eventStart = eventEnd + 2;

            const eventMatch = eventText.match(/^event:\s*(\w+)/m);
            const dataMatch = eventText.match(/^data:\s*(.*)$/ms);
            const eventName = eventMatch?.[1];
            const data = dataMatch?.[1] ?? "";

            if (eventName === "error") {
              toast.error(data || "Erro ao processar.");
              setStatus("error");
              return;
            }
            if (eventName === "done") {
              try {
                const parsed: TopicResult = JSON.parse(data);
                setResult(parsed);
                setStatus("done");
              } catch {
                setStatus("error");
              }
              return;
            }
          }
          buffer = buffer.slice(eventStart);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Erro de conexão.");
          setStatus("error");
        }
      }
    },
    [query, status, router],
  );

  const searched = status === "done" || status === "streaming" || status === "error";

  return (
    <div className={cn("space-y-6 transition-all", searched ? "" : "py-8")}>
      <div
        className={cn(
          "mx-auto transition-all",
          searched ? "max-w-3xl" : "max-w-2xl text-center",
        )}
      >
        {!searched && (
          <>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-primary md:text-5xl">
              O que a Bíblia diz?
            </h1>
            <p className="mt-3 text-base text-muted-foreground">
              Pergunte sobre qualquer tema. A resposta vem exclusivamente do
              próprio texto bíblico, com referências exatas e exegese nas línguas
              originais.
            </p>
          </>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className={cn("relative", searched ? "mt-0" : "mt-8")}
        >
          <Search
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground"
            strokeWidth={1.5}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite um tema (ex: ansiedade, casamento, perdão...)"
            className="w-full rounded-full border border-border bg-background py-4 pl-12 pr-28 text-base text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            disabled={status === "streaming"}
            autoFocus={!searched}
          />
          <button
            type="submit"
            disabled={status === "streaming" || query.trim().length < 3}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#C8963E] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B5862F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "streaming" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Perguntar"
            )}
          </button>
        </form>

        {!searched && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="self-center text-xs text-muted-foreground">
              Sugestões:
            </span>
            {SUGGESTED_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleSubmit(topic)}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground"
              >
                {topic}
              </button>
            ))}
          </div>
        )}
      </div>

      {status === "streaming" && !result && (
        <div className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">
            Buscando no texto bíblico — pode levar alguns segundos...
          </p>
        </div>
      )}

      {result && (
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Synthesis */}
          <section className="rounded-lg border border-border bg-card p-6">
            <h2 className="font-display text-xl font-semibold text-primary">
              Síntese
            </h2>
            <div className="prose prose-sm mt-3 max-w-none text-foreground dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {result.synthesis}
              </ReactMarkdown>
            </div>
          </section>

          {/* References */}
          <section className="space-y-2">
            <h2 className="font-display text-xl font-semibold text-primary">
              Passagens ({result.references.length})
            </h2>
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {result.references.map((ref, i) => {
                const verseRef = ref.verse_end
                  ? `${ref.abbrev} ${ref.chapter}:${ref.verse_start}-${ref.verse_end}`
                  : `${ref.abbrev} ${ref.chapter}:${ref.verse_start}`;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setOpenDetail(openDetail === i ? null : i)}
                      className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                          <h3 className="text-sm font-semibold text-foreground">
                            {ref.title}
                          </h3>
                        </div>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          {ref.summary}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-primary/80">
                        {verseRef}
                      </span>
                    </button>
                    {openDetail === i && (
                      <div className="bg-accent/20 px-5 py-4">
                        <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {ref.detail}
                          </ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
