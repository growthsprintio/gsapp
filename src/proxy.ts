import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE = 'gs_auth';

/**
 * Expected cookie value = SHA-256(password:secret).
 * Returns null when SITE_PASSWORD isn't set — auth stays OFF until you
 * configure it (so a fresh deploy is never locked out before the env var lands).
 */
async function expectedToken(): Promise<string | null> {
  const pw = process.env.SITE_PASSWORD;
  if (!pw) return null;
  const secret = process.env.AUTH_SECRET || 'growthsprint-default-secret';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${pw}:${secret}`));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function proxy(req: NextRequest) {
  const token = await expectedToken();
  if (!token) return NextResponse.next(); // not configured → site open

  if (req.cookies.get(COOKIE)?.value === token) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

// Protect everything except the login page, the auth endpoints, and static assets.
export const config = {
  matcher: ['/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)'],
};
