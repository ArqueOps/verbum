import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./env";

export function createBrowserClient() {
  const { url, anonKey } = getSupabaseConfig();
  return _createBrowserClient(url, anonKey);
}
