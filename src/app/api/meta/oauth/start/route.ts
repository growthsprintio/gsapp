import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Scopes needed to read ad accounts/pages and create ads on the user's behalf.
const SCOPES = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_show_list',
  'pages_read_engagement',
].join(',');

/**
 * GET /api/meta/oauth/start?workspace=<id>
 * Sends the user to Facebook's OAuth dialog. `state` carries the workspace id
 * so the callback knows which workspace to attach the connection to.
 */
export async function GET(req: Request) {
  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: 'META_APP_ID is not configured.' }, { status: 400 });
  }

  const url = new URL(req.url);
  const workspace = url.searchParams.get('workspace') || '';
  const redirectUri = `${url.origin}/api/meta/oauth/callback`;

  // Random nonce + workspace id, so the callback can validate and route.
  const nonce = crypto.randomUUID();
  const state = Buffer.from(JSON.stringify({ workspace, nonce })).toString('base64url');

  const dialog = new URL(`https://www.facebook.com/${process.env.META_API_VERSION || 'v23.0'}/dialog/oauth`);
  dialog.searchParams.set('client_id', appId);
  dialog.searchParams.set('redirect_uri', redirectUri);
  dialog.searchParams.set('scope', SCOPES);
  dialog.searchParams.set('response_type', 'code');
  dialog.searchParams.set('state', state);

  const res = NextResponse.redirect(dialog.toString());
  res.cookies.set('meta_oauth_state', nonce, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', path: '/', maxAge: 600,
  });
  return res;
}
