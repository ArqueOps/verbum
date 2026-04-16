const CARAMELOU_BASE_URL = 'https://caramelou.com.br';

type Plan = 'monthly' | 'annual';

const ENV_KEYS: Record<Plan, string> = {
  monthly: 'CARAMELOU_PRODUCT_ID_MONTHLY',
  annual: 'CARAMELOU_PRODUCT_ID_ANNUAL',
};

function getProductId(plan: Plan): string {
  const envKey = ENV_KEYS[plan];
  const productId = process.env[envKey];

  if (!productId) {
    throw new Error(
      `Missing environment variable ${envKey}. Configure the Caramelou product ID for the "${plan}" plan.`
    );
  }

  return productId;
}

export function getCheckoutUrl(
  plan: Plan,
  userId: string,
  email: string
): string {
  const productId = getProductId(plan);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    throw new Error(
      'Missing environment variable NEXT_PUBLIC_APP_URL. Required to build the checkout return URL.'
    );
  }

  const returnUrl = `${appUrl}/profile?checkout=success`;

  const params = new URLSearchParams({
    user_id: userId,
    email,
    return_url: returnUrl,
  });

  return `${CARAMELOU_BASE_URL}/product/${productId}/checkout?${params.toString()}`;
}
