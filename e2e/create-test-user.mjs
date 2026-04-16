/**
 * Creates a test user in Supabase for E2E tests.
 * Run once before the first E2E run: node e2e/create-test-user.mjs
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${process.env.CRED_SUPABASE_PROJECT_REF}.supabase.co`;
const SERVICE_ROLE_KEY = process.env.CRED_SUPABASE_SERVICE_ROLE_KEY;

const EMAIL = "e2e-test@verbum.test";
const PASSWORD = "e2e-test-password-123";

async function main() {
  if (!SERVICE_ROLE_KEY) {
    console.error("CRED_SUPABASE_SERVICE_ROLE_KEY is required");
    process.exit(1);
  }

  // Try to create the user (will fail if already exists — that's OK)
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
    },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
    }),
  });

  const data = await res.json();

  if (res.ok) {
    console.log(`Test user created: ${EMAIL}`);
  } else if (data?.msg?.includes?.("already") || data?.message?.includes?.("already")) {
    console.log(`Test user already exists: ${EMAIL}`);
  } else {
    console.error("Failed to create test user:", data);
    process.exit(1);
  }
}

main();
