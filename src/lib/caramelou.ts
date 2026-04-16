type Plan = "monthly" | "annual";

const CARAMELOU_BASE_URL =
  process.env.CARAMELOU_BASE_URL ?? "https://caramelou.com.br";

export function getCheckoutUrl(
  plan: Plan,
  userId: string,
  userEmail: string,
): string {
  const productId =
    plan === "monthly"
      ? process.env.CARAMELOU_MONTHLY_PRODUCT_ID
      : process.env.CARAMELOU_ANNUAL_PRODUCT_ID;

  if (!productId) {
    throw new Error(`Missing CARAMELOU_${plan.toUpperCase()}_PRODUCT_ID`);
  }

  const url = new URL(`/product/${productId}/checkout`, CARAMELOU_BASE_URL);
  url.searchParams.set("user_id", userId);
  url.searchParams.set("user_email", userEmail);

  return url.toString();
}
