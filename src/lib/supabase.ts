// Browser-safe Supabase helpers. Must NOT import next/headers — this module is
// pulled into client components. Server-only clients live in supabase-server.ts.
import { createBrowserClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase env vars are present — lets the app degrade gracefully. */
export const supabaseConfigured = !!(URL && ANON);

/** Browser client — respects RLS as the signed-in user. */
export function createSupabaseBrowser() {
  return createBrowserClient(URL!, ANON!);
}
