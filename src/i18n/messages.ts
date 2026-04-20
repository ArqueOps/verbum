/**
 * i18n scaffold — pt-BR/en/es.
 *
 * Este é um scaffold leve: tradução por chave com fallback para pt-BR.
 * Propósito: permitir que a UI migre strings estáticas progressivamente
 * sem bloquear o deploy atual. Componentes existentes continuam em pt-BR
 * até serem adaptados um a um.
 *
 * Uso:
 *   import { t } from "@/i18n/messages";
 *   t("header.home")        // => "Início" (default locale pt-BR)
 *   t("header.home", "en")  // => "Home"
 */

export type Locale = "pt-BR" | "en" | "es";

export const SUPPORTED_LOCALES: Locale[] = ["pt-BR", "en", "es"];
export const DEFAULT_LOCALE: Locale = "pt-BR";

type MessageDict = Record<string, string>;

const MESSAGES: Record<Locale, MessageDict> = {
  "pt-BR": {
    "header.home": "Início",
    "header.ask": "O que a Bíblia diz?",
    "header.generate": "Gerar estudo",
    "header.blog": "Blog",
    "header.my_studies": "Meus estudos",
    "footer.tagline": "Profundidade que ilumina.",
    "common.loading": "Carregando…",
    "common.cancel": "Cancelar",
    "common.save": "Salvar",
    "common.back": "Voltar",
    "common.next": "Avançar",
    "common.finish": "Concluir",
    "daily_limit.free_hint": "Limite diário do plano gratuito.",
    "daily_limit.reached": "Limite diário atingido. Volte amanhã ou assine um plano.",
    "pricing.free": "Gratuito",
    "pricing.monthly": "Mensal",
    "pricing.annual": "Anual",
  },
  en: {
    "header.home": "Home",
    "header.ask": "What does the Bible say?",
    "header.generate": "Generate study",
    "header.blog": "Blog",
    "header.my_studies": "My studies",
    "footer.tagline": "Depth that illuminates.",
    "common.loading": "Loading…",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.back": "Back",
    "common.next": "Next",
    "common.finish": "Finish",
    "daily_limit.free_hint": "Daily limit of the free plan.",
    "daily_limit.reached": "Daily limit reached. Come back tomorrow or subscribe.",
    "pricing.free": "Free",
    "pricing.monthly": "Monthly",
    "pricing.annual": "Annual",
  },
  es: {
    "header.home": "Inicio",
    "header.ask": "¿Qué dice la Biblia?",
    "header.generate": "Generar estudio",
    "header.blog": "Blog",
    "header.my_studies": "Mis estudios",
    "footer.tagline": "Profundidad que ilumina.",
    "common.loading": "Cargando…",
    "common.cancel": "Cancelar",
    "common.save": "Guardar",
    "common.back": "Volver",
    "common.next": "Siguiente",
    "common.finish": "Finalizar",
    "daily_limit.free_hint": "Límite diario del plan gratuito.",
    "daily_limit.reached": "Límite diario alcanzado. Vuelve mañana o suscríbete.",
    "pricing.free": "Gratis",
    "pricing.monthly": "Mensual",
    "pricing.annual": "Anual",
  },
};

export function t(key: string, locale: Locale = DEFAULT_LOCALE): string {
  return MESSAGES[locale]?.[key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
}

export function getMessages(locale: Locale): MessageDict {
  return { ...MESSAGES[DEFAULT_LOCALE], ...MESSAGES[locale] };
}
