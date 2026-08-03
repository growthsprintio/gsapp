import { NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin, supabaseConfigured } from '@/lib/supabase-server';
import { getSessionWorkspaceId } from '@/lib/meta-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/workspaces — the signed-in user's workspaces, with Meta connection state. */
export async function GET() {
  if (!supabaseConfigured) return NextResponse.json({ configured: false, workspaces: [] });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createSupabaseAdmin();
  if (!user || !admin) return NextResponse.json({ configured: true, workspaces: [] });

  const { data: memberships, error } = await admin
    .from('workspace_members')
    .select('role, workspaces(id, name, type, industry, website, created_at)')
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const ids = (memberships || []).map((m: any) => m.workspaces?.id).filter(Boolean);

  // Which of these have Meta hooked up?
  const { data: conns } = ids.length
    ? await admin.from('meta_connections').select('workspace_id, ad_account_id, page_id').in('workspace_id', ids)
    : { data: [] as any[] };
  const connByWs = new Map((conns || []).map((c: any) => [c.workspace_id, c]));

  // Member counts per workspace
  const { data: allMembers } = ids.length
    ? await admin.from('workspace_members').select('workspace_id').in('workspace_id', ids)
    : { data: [] as any[] };
  const counts = new Map<string, number>();
  (allMembers || []).forEach((m: any) => counts.set(m.workspace_id, (counts.get(m.workspace_id) || 0) + 1));

  const workspaces = (memberships || [])
    .map((m: any) => m.workspaces)
    .filter(Boolean)
    .map((w: any) => {
      const c = connByWs.get(w.id);
      return {
        ...w,
        role: (memberships || []).find((m: any) => m.workspaces?.id === w.id)?.role ?? 'member',
        memberCount: counts.get(w.id) ?? 1,
        metaConnected: !!c,
        metaReady: !!(c?.ad_account_id && c?.page_id),
      };
    });

  const activeWorkspaceId = await getSessionWorkspaceId();
  return NextResponse.json({ configured: true, userId: user.id, activeWorkspaceId, workspaces });
}

/** POST /api/workspaces — create a workspace and join it as admin. */
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createSupabaseAdmin();
  if (!user || !admin) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const name = (body.name || '').trim();
  if (!name) return NextResponse.json({ error: 'Workspace name is required.' }, { status: 400 });

  const { data: ws, error } = await admin
    .from('workspaces')
    .insert({
      name,
      type: body.type || 'brand',
      industry: body.industry || null,
      website: body.website || null,
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const { error: memberError } = await admin
    .from('workspace_members')
    .insert({ workspace_id: ws.id, user_id: user.id, role: 'admin' });
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 502 });

  return NextResponse.json({ ok: true, id: ws.id });
}

/** DELETE /api/workspaces?id=... — admins only; cascades members + meta connection. */
export async function DELETE(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createSupabaseAdmin();
  if (!user || !admin) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const { data: membership } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (membership?.role !== 'admin') {
    return NextResponse.json({ error: 'Only an admin can delete this workspace.' }, { status: 403 });
  }

  const { count } = await admin
    .from('workspace_members')
    .select('workspace_id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if ((count ?? 0) <= 1) {
    return NextResponse.json({ error: 'You need at least one workspace.' }, { status: 400 });
  }

  const { error } = await admin.from('workspaces').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}
