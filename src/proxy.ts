import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const LEGACY_COOKIE = 'gs_auth';

/**
 * Auth precedence:
 *   1. Supabase configured  → real per-user sessions
 *   2. SITE_PASSWORD set    → shared password gate (legacy fallback)
 *   3. Neither              → site open
 */
export async function proxy(req: NextRequest) {
  // These become HTTP headers — strip any non-Latin-1 characters (BOM, smart quotes)
  // that would otherwise make fetch throw "non ISO-8859-1 code point".
  const scrub = (v?: string) => v?.replace(/[^\x20-\x7E]/g, '').trim() || undefined;
  const supaUrl = scrub(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const supaKey = scrub(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  const unauthorized = () => {
    if (req.nextUrl.pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('from', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  };

  // ── 1. Supabase session ────────────────────────────────────────────────────
  if (supaUrl && supaKey) {
    let res = NextResponse.next({ request: req });
    const supabase = createServerClient(supaUrl, supaKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    });

    // getUser() revalidates the token with Supabase — don't trust the cookie alone.
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorized();
    return res; // carries refreshed session cookies
  }

  // ── 2. Legacy shared-password gate ─────────────────────────────────────────
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return NextResponse.next();

  const secret = process.env.AUTH_SECRET || 'growthsprint-default-secret';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${pw}:${secret}`));
  const expected = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (req.cookies.get(LEGACY_COOKIE)?.value === expected) return NextResponse.next();

  return unauthorized();
}

// Public: login, signup, auth endpoints, static assets.
export const config = {
  matcher: ['/((?!login|signup|auth/callback|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
