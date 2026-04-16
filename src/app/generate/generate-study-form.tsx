"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { PassagePicker, type PassageSelection } from "@/components/study/PassagePicker";
import { CreditsBadge } from "@/components/credits-badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { useCredits } from "@/hooks/use-credits";
import { cn } from "@/lib/utils";

type GenerationStatus = "idle" | "generating" | "success" | "error";

export function GenerateStudyForm() {
  const router = useRouter();
  const { creditsRemaining, isLoading: creditsLoading, isUnlimited, decrementCredits } =
    useCredits();
  const [selection, setSelection] = useState<PassageSelection | null>(null);
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [studyId, setStudyId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasCredits = isUnlimited || (creditsRemaining !== null && creditsRemaining > 0);
  const canGenerate = selection !== null && hasCredits && status !== "generating";

  const handlePassageSelect = useCallback((s: PassageSelection) => {
    setSelection(s);
    setErrorMessage(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selection || !canGenerate) return;

    setStatus("generating");
    setErrorMessage(null);
    setStudyId(null);

    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/generate-study", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book_id: selection.book,
          chapter: selection.chapter,
          verse_start: selection.verseStart || 1,
          verse_end: selection.verseEnd,
          version_id: selection.version,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        const message =
          data?.error ?? "Erro ao iniciar geração do estudo.";
        setErrorMessage(message);
        setStatus("error");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setErrorMessage("Erro de conexão com o servidor.");
        setStatus("error");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            const data = line.slice(6);

            if (currentEvent === "done" && data) {
              setStudyId(data);
              decrementCredits();
              setStatus("success");
              return;
            }
            if (currentEvent === "error") {
              setErrorMessage(data || "Erro ao gerar estudo.");
              setStatus("error");
              return;
            }

            currentEvent = "";
          } else if (line === "") {
            currentEvent = "";
          }
        }
      }

      setErrorMessage("Geração do estudo terminou inesperadamente.");
      setStatus("error");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setErrorMessage("Erro de rede. Tente novamente.");
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }, [selection, canGenerate, decrementCredits]);

  const handleViewStudy = useCallback(() => {
    if (studyId) {
      router.push(`/estudos/${studyId}`);
    }
  }, [studyId, router]);

  const isDisabledByCredits = !creditsLoading && !hasCredits;

  return (
    <div className="flex flex-col gap-6">
      {/* Credits badge */}
      <div className="flex items-center justify-between">
        <CreditsBadge
          creditsRemaining={creditsRemaining}
          isUnlimited={isUnlimited}
          isLoading={creditsLoading}
        />
      </div>

      <PassagePicker
        onPassageSelect={handlePassageSelect}
        className="w-full"
      />

      {/* Generate button */}
      <div className="flex flex-col items-center gap-3">
        {isDisabledByCredits ? (
          <Tooltip>
            <TooltipTrigger
              className="w-full sm:w-auto"
              render={<span />}
            >
              <Button
                disabled
                size="lg"
                className={cn(
                  "w-full sm:w-auto gap-2 opacity-50 cursor-not-allowed",
                )}
                aria-describedby="no-credits-tooltip"
              >
                <Sparkles className="h-4 w-4" />
                Gerar Estudo
              </Button>
            </TooltipTrigger>
            <TooltipContent id="no-credits-tooltip">
              <p>Sem créditos disponíveis</p>
              <a
                href="/precos"
                className="mt-1 block text-xs font-medium text-primary underline underline-offset-2 hover:text-primary/80"
              >
                Comprar créditos
              </a>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            size="lg"
            className="w-full sm:w-auto gap-2"
            disabled={!canGenerate || creditsLoading}
            onClick={handleGenerate}
          >
            {status === "generating" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando estudo…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Gerar Estudo
              </>
            )}
          </Button>
        )}
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-center text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Success state */}
      {status === "success" && studyId && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-50/50 px-4 py-5 dark:bg-emerald-900/10">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Estudo gerado com sucesso!
          </p>
          <CreditsBadge
            creditsRemaining={creditsRemaining}
            isUnlimited={isUnlimited}
            isLoading={false}
          />
          <Button
            variant="outline"
            size="default"
            onClick={handleViewStudy}
          >
            Ver estudo
          </Button>
        </div>
      )}
    </div>
  );
}
