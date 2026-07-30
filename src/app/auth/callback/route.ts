import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Handles Supabase auth redirects:
 *  - PKCE / OAuth      → ?code=...
 *  - Email confirmation → ?token_hash=...&type=signup|email|recovery
 *
 * On success the session cookie is set and we send the user into the app.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const next = url.searchParams.get('next') || '/dashboard';

  // Supabase can report failures directly on the redirect.
  const errDesc = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (errDesc) {
    return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent(errDesc)}`);
  }

  const supabase = await createSupabaseServer();

  try {
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw new Error(error.message);
    } else if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type: type as 'signup' | 'email' | 'recovery' | 'invite' | 'email_change',
        token_hash: tokenHash,
      });
      if (error) throw new Error(error.message);
    } else {
      return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent('Missing confirmation token.')}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Could not confirm your account.';
    return NextResponse.redirect(`${url.origin}/login?error=${encodeURIComponent(msg)}`);
  }

  // Make sure the confirmed user has a workspace before landing in the app.
  try {
    await fetch(`${url.origin}/api/auth/bootstrap`, {
      method: 'POST',
      headers: { cookie: req.headers.get('cookie') || '' },
    });
  } catch {
    // Non-fatal — bootstrap also runs on login.
  }

  return NextResponse.redirect(`${url.origin}${next.startsWith('/') ? next : '/dashboard'}`);
}
