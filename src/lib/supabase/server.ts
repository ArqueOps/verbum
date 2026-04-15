import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

interface CookieStore {
  getAll: () => { name: string; value: string }[];
  setAll?: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
}

export function createClient(cookieStore: CookieStore) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createServerClient(url, anonKey, {
    cookies: {
      getAll: cookieStore.getAll,
      ...(cookieStore.setAll ? { setAll: cookieStore.setAll } : {}),
    },
  });
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // The `setAll` method is called from a Server Component.
        // This can be ignored if middleware refreshes user sessions.
      }
    },
  });
}
