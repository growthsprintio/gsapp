// SERVER-ONLY Supabase helpers. Never import this from a client component —
// it uses next/headers and the service-role key.
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = !!(URL && ANON);

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
          // Called from a Server Component — safe to ignore; proxy refreshes sessions.
        }
      },
    },
  });
}

/**
 * Service-role client — BYPASSES RLS. Used for reading Meta tokens and writing
 * workspace records. Must never be imported into browser code.
 */
export function createSupabaseAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !key) return null;
  return createClient(URL, key, { auth: { persistSession: false } });
}
