import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const V = process.env.META_API_VERSION || 'v23.0';

/** GET /api/meta/oauth/callback — exchanges the code for a long-lived token and stores it. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const settings = `${url.origin}/settings?tab=integrations`;
  const fail = (msg: string) => NextResponse.redirect(`${settings}&meta_error=${encodeURIComponent(msg)}`);

  const error = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (error) return fail(error);

  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  if (!code || !stateRaw) return fail('Missing code or state from Meta.');

  // Validate CSRF nonce
  let workspace = '';
  try {
    const parsed = JSON.parse(Buffer.from(stateRaw, 'base64url').toString());
    workspace = parsed.workspace || '';
    const cookieNonce = req.headers.get('cookie')?.match(/meta_oauth_state=([^;]+)/)?.[1];
    if (!cookieNonce || cookieNonce !== parsed.nonce) return fail('Invalid OAuth state.');
  } catch {
    return fail('Invalid OAuth state.');
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) return fail('META_APP_ID / META_APP_SECRET not configured.');

  try {
    // 1. code → short-lived token
    const redirectUri = `${url.origin}/api/meta/oauth/callback`;
    const shortRes = await fetch(
      `https://graph.facebook.com/${V}/oauth/access_token?` +
        new URLSearchParams({ client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code }),
    );
    const short = await shortRes.json();
    if (short.error) throw new Error(short.error.message);

    // 2. short-lived → long-lived (~60 days)
    const longRes = await fetch(
      `https://graph.facebook.com/${V}/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: short.access_token,
        }),
    );
    const long = await longRes.json();
    if (long.error) throw new Error(long.error.message);

    const token: string = long.access_token;
    const expiresIn: number | undefined = long.expires_in;

    // 3. Who connected it (for display)
    const meRes = await fetch(`https://graph.facebook.com/${V}/me?fields=name&access_token=${token}`);
    const me = await meRes.json();

    // 4. Persist against the workspace (service role — token never touches the browser)
    const admin = createSupabaseAdmin();
    if (!admin) return fail('Supabase is not configured on the server.');
    if (!workspace) return fail('No workspace supplied for this connection.');

    const { error: dbError } = await admin.from('meta_connections').upsert({
      workspace_id: workspace,
      access_token: token,
      token_expires: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
      meta_user_name: me?.name ?? null,
      updated_at: new Date().toISOString(),
    });
    if (dbError) throw new Error(dbError.message);

    const res = NextResponse.redirect(`${settings}&meta_connected=1`);
    res.cookies.set('meta_oauth_state', '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Meta connection failed.');
  }
}
