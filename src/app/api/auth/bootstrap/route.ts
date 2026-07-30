import { NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin, supabaseConfigured } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/bootstrap
 * Ensures the signed-in user belongs to at least one workspace, creating a
 * first one if not. Idempotent — safe to call on every login.
 */
export async function POST(req: Request) {
  if (!supabaseConfigured) return NextResponse.json({ ok: true, skipped: 'supabase_not_configured' });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });

  // Already a member of something? Nothing to do.
  const { data: existing } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ ok: true, workspaceId: existing[0].workspace_id, created: false });
  }

  const body = await req.json().catch(() => ({}));
  const name: string =
    body?.workspaceName?.trim() ||
    (user.email ? `${user.email.split('@')[0]}'s workspace` : 'My workspace');

  const { data: ws, error: wsError } = await admin
    .from('workspaces')
    .insert({ name, type: 'brand' })
    .select('id')
    .single();
  if (wsError) return NextResponse.json({ error: wsError.message }, { status: 502 });

  const { error: memberError } = await admin
    .from('workspace_members')
    .insert({ workspace_id: ws.id, user_id: user.id, role: 'admin' });
  if (memberError) return NextResponse.json({ error: memberError.message }, { status: 502 });

  return NextResponse.json({ ok: true, workspaceId: ws.id, created: true });
}

/** GET /api/auth/bootstrap — current user + their workspaces (for the app shell). */
export async function GET() {
  if (!supabaseConfigured) return NextResponse.json({ configured: false, user: null, workspaces: [] });

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ configured: true, user: null, workspaces: [] });

  const admin = createSupabaseAdmin();
  if (!admin) return NextResponse.json({ configured: true, user: { id: user.id, email: user.email }, workspaces: [] });

  const { data: memberships } = await admin
    .from('workspace_members')
    .select('role, workspaces(id, name, type)')
    .eq('user_id', user.id);

  return NextResponse.json({
    configured: true,
    user: { id: user.id, email: user.email },
    workspaces: (memberships || []).map((m: any) => ({ ...m.workspaces, role: m.role })),
  });
}
