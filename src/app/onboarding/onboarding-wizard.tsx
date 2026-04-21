"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createBrowserClient } from "@/lib/supabase/browser";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";

type Locale = "pt-BR" | "en" | "es";

interface Data {
  displayName: string;
  phone: string;
  countryCode: string;
  locale: Locale;
  social_instagram: string;
  social_facebook: string;
  social_linkedin: string;
  social_youtube: string;
  social_threads: string;
  social_tiktok: string;
  social_substack: string;
  plan: "free" | "monthly" | "annual";
}

const INITIAL: Data = {
  displayName: "",
  phone: "",
  countryCode: "+55",
  locale: "pt-BR",
  social_instagram: "",
  social_facebook: "",
  social_linkedin: "",
  social_youtube: "",
  social_threads: "",
  social_tiktok: "",
  social_substack: "",
  plan: "free",
};

const STEPS = ["Dados", "Idioma", "Redes sociais", "Plano"] as const;

export function OnboardingWizard({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Data>(INITIAL);
  const [pending, startTransition] = useTransition();

  const update = <K extends keyof Data>(k: K, v: Data[K]) =>
    setData((d) => ({ ...d, [k]: v }));

  const canNext = () => {
    if (step === 0) return data.displayName.trim().length >= 2;
    if (step === 1) return !!data.locale;
    return true;
  };

  async function finish() {
    const supabase = createBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const payload: Record<string, unknown> = {
      display_name: data.displayName.trim(),
      phone: data.phone.trim() || null,
      country_code: data.countryCode || null,
      locale: data.locale,
    };
    const socialKeys = [
      "social_instagram",
      "social_facebook",
      "social_linkedin",
      "social_youtube",
      "social_threads",
      "social_tiktok",
      "social_substack",
    ] as const;
    for (const k of socialKeys) {
      const v = (data[k] as string).trim().replace(/^@/, "");
      payload[k] = v === "" ? null : v;
    }

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", user.id);

    if (error) {
      toast.error("Erro ao salvar perfil: " + error.message);
      return;
    }

    if (data.plan === "free") {
      router.push("/generate");
      return;
    }
    const res = await fetch("/api/checkout/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: data.plan }),
    });
    const j = await res.json();
    if (res.ok && j.checkoutUrl) {
      window.location.href = j.checkoutUrl;
    } else {
      toast.error(j.error ?? "Erro no checkout. Tente novamente na página de planos.");
      router.push("/pricing");
    }
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <header className="text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-primary">
          Bem-vindo ao Verbum
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {userEmail}
        </p>
      </header>

      {/* Progress */}
      <ol className="flex justify-between text-xs">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className={`flex flex-1 items-center gap-1 ${
              i < STEPS.length - 1 ? "after:mx-2 after:h-px after:flex-1 after:bg-border" : ""
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                i < step
                  ? "bg-primary text-white"
                  : i === step
                    ? "bg-[#C8963E] text-white"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={i === step ? "font-medium text-foreground" : "text-muted-foreground"}>
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-border bg-card p-6 transition-all duration-300">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">Como você quer ser chamado?</label>
              <input
                type="text"
                value={data.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">País</label>
                <input
                  type="text"
                  value={data.countryCode}
                  onChange={(e) => update("countryCode", e.target.value)}
                  placeholder="+55"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-foreground">Telefone (opcional)</label>
                <input
                  type="tel"
                  value={data.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Idioma da interface</p>
            {(["pt-BR", "en", "es"] as Locale[]).map((loc) => (
              <label
                key={loc}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${
                  data.locale === loc ? "border-[#C8963E] bg-[#C8963E]/5" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="locale"
                  value={loc}
                  checked={data.locale === loc}
                  onChange={() => update("locale", loc)}
                  className="h-4 w-4 accent-[#C8963E]"
                />
                <span className="text-sm">
                  {loc === "pt-BR" ? "Português (Brasil)" : loc === "en" ? "English" : "Español"}
                </span>
              </label>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Apenas o nome de usuário (sem @ ou URL). Todos os campos são opcionais.
            </p>
            {([
              ["social_instagram", "Instagram"],
              ["social_facebook", "Facebook"],
              ["social_linkedin", "LinkedIn"],
              ["social_youtube", "YouTube"],
              ["social_threads", "Threads"],
              ["social_tiktok", "TikTok"],
              ["social_substack", "Substack"],
            ] as const).map(([key, label]) => (
              <div key={key} className="grid grid-cols-[120px_1fr] items-center gap-3">
                <label className="text-sm font-medium text-foreground">{label}</label>
                <input
                  type="text"
                  value={data[key]}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder="seuusername"
                  maxLength={64}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Escolha seu plano</p>
            {([
              { k: "free", name: "Gratuito", desc: "1 estudo por dia, histórico dos últimos 3.", price: "R$ 0" },
              { k: "monthly", name: "Mensal", desc: "Estudos ilimitados. Cancele quando quiser.", price: "R$ 19,90/mês" },
              { k: "annual", name: "Anual", desc: "2 meses grátis. Economia de R$ 39,80.", price: "R$ 199,00/ano" },
            ] as const).map((p) => (
              <label
                key={p.k}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 ${
                  data.plan === p.k ? "border-[#C8963E] bg-[#C8963E]/5" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={p.k}
                  checked={data.plan === p.k}
                  onChange={() => update("plan", p.k)}
                  className="mt-1 h-4 w-4 accent-[#C8963E]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="text-sm text-[#C8963E]">{p.price}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{p.desc}</p>
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext()}
            className="inline-flex items-center gap-1 rounded-lg bg-[#C8963E] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B5862F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Avançar <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startTransition(() => { void finish(); })}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded-lg bg-[#C8963E] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#B5862F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Finalizando…" : "Concluir"}
          </button>
        )}
      </div>
    </div>
  );
}
