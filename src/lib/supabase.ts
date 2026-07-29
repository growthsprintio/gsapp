import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase env vars are present — lets the app degrade gracefully. */
export const supabaseConfigured = !!(URL && ANON);

/** Browser client — respects RLS as the signed-in user. */
export function createSupabaseBrowser() {
  return createBrowserClient(URL!, ANON!);
}

/** Server client bound to the request's cookies (App Router). */
export async function createSupabaseServer() {
  const store = await cookies();
  return createServerClient(URL!, ANON!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component — safe to ignore, middleware refreshes sessions.
        }
      },
    },
  });
}

/**
 * Service-role client — BYPASSES RLS. Server-only, never import in a client
 * component. Used for reading Meta tokens, which must never reach the browser.
 */
export function createSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !key) return null;
  return createClient(URL, key, { auth: { persistSession: false } });
}
