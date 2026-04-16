export type CheckoutPlan = "monthly" | "annual";

interface GetCheckoutUrlParams {
  plan: CheckoutPlan;
  userId: string;
  email: string;
}

const PRODUCT_ID_ENV: Record<CheckoutPlan, string> = {
  monthly: "CARAMELOU_PRODUCT_ID_MONTHLY",
  annual: "CARAMELOU_PRODUCT_ID_ANNUAL",
};

export function getCheckoutUrl({ plan, userId, email }: GetCheckoutUrlParams): string {
  const productIdEnvVar = PRODUCT_ID_ENV[plan];
  const productId = process.env[productIdEnvVar];

  if (!productId) {
    throw new Error(`Missing environment variable: ${productIdEnvVar}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error("Missing environment variable: NEXT_PUBLIC_APP_URL");
  }

  const returnUrl = `${appUrl}/dashboard?checkout=success`;

  const params = new URLSearchParams({
    product_id: productId,
    customer_email: email,
    client_reference_id: userId,
    return_url: returnUrl,
  });

  return `${appUrl}/api/checkout?${params.toString()}`;
}
