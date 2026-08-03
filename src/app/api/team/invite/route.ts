import { NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabase-server';
import { getSessionWorkspaceId } from '@/lib/meta-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/team/invite — pending invites for the active workspace. */
export async function GET(req: Request) {
  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId || !admin) return NextResponse.json({ invites: [] });

  const { data, error } = await admin
    .from('workspace_invites')
    .select('id, email, role, token, created_at')
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    invites: (data || []).map((i) => ({
      ...i,
      link: `${origin}/signup?invite=${i.token}`,
    })),
  });
}

/**
 * POST /api/team/invite — invite someone by email.
 * If they already have an account they're added immediately; otherwise a
 * pending invite is created and a shareable signup link is returned.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!user || !workspaceId || !admin) {
    return NextResponse.json({ error: 'Not signed in, or no workspace.' }, { status: 401 });
  }

  const { email, role = 'member' } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  const normalized = String(email).trim().toLowerCase();

  // Already has an account → join them straight away.
  const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = (userList?.users || []).find((u) => (u.email || '').toLowerCase() === normalized);

  if (existing) {
    const { error } = await admin
      .from('workspace_members')
      .upsert({ workspace_id: workspaceId, user_id: existing.id, role });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
    return NextResponse.json({ ok: true, added: true });
  }

  // No account yet → pending invite + shareable link.
  const token = crypto.randomUUID().replace(/-/g, '');
  const { error } = await admin
    .from('workspace_invites')
    .upsert(
      { workspace_id: workspaceId, email: normalized, role, token, invited_by: user.id },
      { onConflict: 'workspace_id,email' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const origin = new URL(req.url).origin;
  return NextResponse.json({
    ok: true,
    invited: true,
    link: `${origin}/signup?invite=${token}`,
  });
}

/** DELETE /api/team/invite?id=... — revoke a pending invite. */
export async function DELETE(req: Request) {
  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId || !admin) return NextResponse.json({ error: 'No workspace.' }, { status: 400 });

  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required.' }, { status: 400 });

  const { error } = await admin
    .from('workspace_invites')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}
