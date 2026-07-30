// Browser-safe Supabase helpers. Must NOT import next/headers — this module is
// pulled into client components. Server-only clients live in supabase-server.ts.
import { createBrowserClient } from '@supabase/ssr';

/**
 * The anon key is sent as an HTTP header, so any stray non-Latin-1 character
 * (a BOM or smart quote picked up while copying) makes fetch throw
 * "String contains non ISO-8859-1 code point". Strip anything unexpected.
 */
function clean(v?: string): string | undefined {
  if (!v) return undefined;
  const s = v.replace(/[^\x20-\x7E]/g, '').trim().replace(/^["']|["']$/g, '');
  return s || undefined;
}

const URL = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const ANON = clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** True when Supabase env vars are present — lets the app degrade gracefully. */
export const supabaseConfigured = !!(URL && ANON);

/** Browser client — respects RLS as the signed-in user. */
export function createSupabaseBrowser() {
  return createBrowserClient(URL!, ANON!);
}
