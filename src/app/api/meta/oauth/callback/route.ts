import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const V = process.env.META_API_VERSION || 'v23.0';

/**
 * Popup mode: hand the result back to the window that opened us and close.
 * Served from our own origin, so the opener can verify event.origin.
 */
function popupResult(origin: string, ok: boolean, error?: string) {
  // Escaping `<` keeps a hostile error string from closing the script tag.
  const payload = JSON.stringify({ source: 'growthsprint-meta-oauth', ok, error: error || null })
    .replace(/</g, '\\u003c');

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>${ok ? 'Connected' : 'Connection failed'}</title></head>
<body style="margin:0;height:100vh;display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif;background:#faf7f3;color:#1c1917">
<p>${ok ? 'Connected. You can close this window.' : 'Connection failed. You can close this window.'}</p>
<script>
try { if (window.opener) window.opener.postMessage(${payload}, ${JSON.stringify(origin)}); } catch (e) {}
window.close();
</script>
</body></html>`;

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/** GET /api/meta/oauth/callback — exchanges the code for a long-lived token and stores it. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const settings = `${url.origin}/settings?tab=integrations`;
  const stateRaw = url.searchParams.get('state');

  // Decode state before anything else: even a Meta-side error needs to know
  // whether to answer a popup or a full page.
  let workspace = '';
  let nonce = '';
  let popup = false;
  try {
    const parsed = JSON.parse(Buffer.from(stateRaw || '', 'base64url').toString());
    workspace = parsed.workspace || '';
    nonce = parsed.nonce || '';
    popup = !!parsed.popup;
  } catch {
    // Left empty — the nonce check below rejects it.
  }

  const done = (ok: boolean, msg?: string) => {
    const res = popup
      ? popupResult(url.origin, ok, msg)
      : NextResponse.redirect(ok
        ? `${settings}&meta_connected=1`
        : `${settings}&meta_error=${encodeURIComponent(msg || 'Meta connection failed.')}`);
    res.cookies.set('meta_oauth_state', '', { path: '/', maxAge: 0 });
    return res;
  };
  const fail = (msg: string) => done(false, msg);

  const error = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (error) return fail(error);

  const code = url.searchParams.get('code');
  if (!code || !stateRaw) return fail('Missing code or state from Meta.');

  // Validate CSRF nonce
  const cookieNonce = req.headers.get('cookie')?.match(/meta_oauth_state=([^;]+)/)?.[1];
  if (!nonce || !cookieNonce || cookieNonce !== nonce) return fail('Invalid OAuth state.');

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

    return done(true);
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Meta connection failed.');
  }
}
