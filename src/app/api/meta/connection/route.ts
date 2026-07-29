import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';
import { listAssets } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/meta/connection?workspace=<id>
 * Returns the workspace's connection state plus the ad accounts / Pages the
 * connected token can use, so the UI can offer a picker. The token itself is
 * never returned to the browser.
 */
export async function GET(req: Request) {
  const workspace = new URL(req.url).searchParams.get('workspace');
  if (!workspace) return NextResponse.json({ error: 'workspace is required' }, { status: 400 });

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ connected: false, reason: 'supabase_not_configured' });

  const { data, error } = await admin
    .from('meta_connections')
    .select('access_token, ad_account_id, page_id, instagram_id, meta_user_name, token_expires')
    .eq('workspace_id', workspace)
    .maybeSingle();

  if (error) return NextResponse.json({ connected: false, error: error.message }, { status: 502 });
  if (!data?.access_token) return NextResponse.json({ connected: false });

  const base = {
    connected: true,
    metaUserName: data.meta_user_name,
    adAccountId: data.ad_account_id,
    pageId: data.page_id,
    instagramId: data.instagram_id,
    tokenExpires: data.token_expires,
    ready: !!(data.ad_account_id && data.page_id),
  };

  try {
    const assets = await listAssets(data.access_token);
    return NextResponse.json({ ...base, assets });
  } catch (e) {
    return NextResponse.json({
      ...base,
      assets: { adAccounts: [], pages: [] },
      assetsError: e instanceof Error ? e.message : 'Could not load assets.',
    });
  }
}

/**
 * POST /api/meta/connection — save which ad account / Page this workspace uses.
 * Body: { workspace, adAccountId, pageId, instagramId? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.workspace) return NextResponse.json({ error: 'workspace is required' }, { status: 400 });

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 400 });

  const { error } = await admin
    .from('meta_connections')
    .update({
      ad_account_id: body.adAccountId || null,
      page_id: body.pageId || null,
      instagram_id: body.instagramId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', body.workspace);

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}

/** DELETE /api/meta/connection?workspace=<id> — disconnect Meta for a workspace. */
export async function DELETE(req: Request) {
  const workspace = new URL(req.url).searchParams.get('workspace');
  if (!workspace) return NextResponse.json({ error: 'workspace is required' }, { status: 400 });

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 400 });

  const { error } = await admin.from('meta_connections').delete().eq('workspace_id', workspace);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
