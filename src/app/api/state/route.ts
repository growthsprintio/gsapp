import { NextResponse } from 'next/server';
import { createSupabaseAdmin, supabaseConfigured } from '@/lib/supabase-server';
import { getSessionWorkspaceId } from '@/lib/meta-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Workspace content (roadmaps, creatives, banks) as one JSON document.
 * The workspace is always derived from the session, never from the request
 * body, so a caller can't read or overwrite another workspace's content.
 */

export async function GET() {
  if (!supabaseConfigured) return NextResponse.json({ configured: false, state: null });

  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId || !admin) return NextResponse.json({ configured: true, state: null });

  const { data, error } = await admin
    .from('workspace_state')
    .select('state, updated_at')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({
    configured: true,
    workspaceId,
    state: data?.state ?? null,
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(req: Request) {
  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId || !admin) {
    return NextResponse.json({ error: 'No workspace for this session.' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid state payload.' }, { status: 400 });
  }

  const { error } = await admin.from('workspace_state').upsert({
    workspace_id: workspaceId,
    state: body,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
