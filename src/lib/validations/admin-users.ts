import { z } from "zod";

export const grantSubscriptionSchema = z.object({
  userId: z.string().min(1, "ID do usuário é obrigatório"),
  planInterval: z.enum(["monthly", "annual"], {
    message: "Selecione um plano válido",
  }),
  periodMonths: z
    .number({ message: "Informe o período em meses" })
    .int("O período deve ser um número inteiro")
    .min(1, "O período deve ser de pelo menos 1 mês")
    .max(36, "O período máximo é 36 meses"),
});

export type GrantSubscriptionData = z.infer<typeof grantSubscriptionSchema>;

export const revokeSubscriptionSchema = z.object({
  userId: z.string().min(1, "ID do usuário é obrigatório"),
  reason: z
    .string()
    .min(1, "O motivo é obrigatório")
    .min(5, "O motivo deve ter pelo menos 5 caracteres")
    .max(500, "O motivo deve ter no máximo 500 caracteres"),
});

export type RevokeSubscriptionData = z.infer<typeof revokeSubscriptionSchema>;

export const extendSubscriptionSchema = z.object({
  userId: z.string().min(1, "ID do usuário é obrigatório"),
  days: z
    .number({ message: "Informe a quantidade de dias" })
    .int("A quantidade deve ser um número inteiro")
    .min(1, "A quantidade deve ser de pelo menos 1 dia")
    .max(365, "O máximo é 365 dias"),
});

export type ExtendSubscriptionData = z.infer<typeof extendSubscriptionSchema>;

export const deactivateAccountSchema = z.object({
  userId: z.string().min(1, "ID do usuário é obrigatório"),
});

export type DeactivateAccountData = z.infer<typeof deactivateAccountSchema>;
