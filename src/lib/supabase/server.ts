import { createServerClient as _createServerClient } from "@supabase/ssr";
import type { GetAllCookies, SetAllCookies } from "@supabase/ssr";
import { getSupabaseConfig } from "./env";

interface CookieHandlers {
  getAll: GetAllCookies;
  setAll?: SetAllCookies;
}

export function createServerClient(cookies: CookieHandlers) {
  const { url, anonKey } = getSupabaseConfig();

  return _createServerClient(url, anonKey, {
    cookies: {
      getAll: cookies.getAll,
      setAll: cookies.setAll,
    },
  });
}
