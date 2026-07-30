import { NextResponse } from 'next/server';
import { createSupabaseAdmin, supabaseConfigured } from '@/lib/supabase-server';
import { getSessionWorkspaceId } from '@/lib/meta-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Role = 'admin' | 'member' | 'viewer';

/** GET /api/team — real members of the signed-in user's workspace. */
export async function GET() {
  if (!supabaseConfigured) return NextResponse.json({ configured: false, members: [] });

  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId || !admin) return NextResponse.json({ configured: true, members: [] });

  const { data: rows, error } = await admin
    .from('workspace_members')
    .select('user_id, role, created_at')
    .eq('workspace_id', workspaceId);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  // Resolve emails from auth.users (service role only).
  const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((userList?.users || []).map((u) => [u.id, u.email || '']));

  const members = (rows || []).map((r) => ({
    userId: r.user_id,
    email: emailById.get(r.user_id) || 'unknown',
    role: r.role as Role,
    joinedAt: r.created_at,
  }));

  return NextResponse.json({ configured: true, workspaceId, members });
}

/** POST /api/team — add an existing account to this workspace. Body: { email, role } */
export async function POST(req: Request) {
  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId || !admin) {
    return NextResponse.json({ error: 'No workspace or Supabase is not configured.' }, { status: 400 });
  }

  const { email, role = 'member' } = await req.json().catch(() => ({}));
  if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

  const { data: userList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const match = (userList?.users || []).find(
    (u) => (u.email || '').toLowerCase() === String(email).toLowerCase(),
  );

  if (!match) {
    return NextResponse.json(
      { error: `No GrowthSprint account for ${email}. Ask them to sign up first, then add them here.` },
      { status: 404 },
    );
  }

  const { error } = await admin
    .from('workspace_members')
    .upsert({ workspace_id: workspaceId, user_id: match.id, role });
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}

/** PATCH /api/team — change a member's role. Body: { userId, role } */
export async function PATCH(req: Request) {
  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId || !admin) return NextResponse.json({ error: 'No workspace.' }, { status: 400 });

  const { userId, role } = await req.json().catch(() => ({}));
  if (!userId || !role) return NextResponse.json({ error: 'userId and role are required.' }, { status: 400 });

  const { error } = await admin
    .from('workspace_members')
    .update({ role })
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}

/** DELETE /api/team?userId=... — remove someone from this workspace. */
export async function DELETE(req: Request) {
  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId || !admin) return NextResponse.json({ error: 'No workspace.' }, { status: 400 });

  const userId = new URL(req.url).searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId is required.' }, { status: 400 });

  // Don't allow removing the last admin — that would orphan the workspace.
  const { data: admins } = await admin
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('role', 'admin');
  if ((admins || []).length <= 1 && (admins || []).some((a) => a.user_id === userId)) {
    return NextResponse.json({ error: 'Cannot remove the only admin of this workspace.' }, { status: 400 });
  }

  const { error } = await admin
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  return NextResponse.json({ ok: true });
}
