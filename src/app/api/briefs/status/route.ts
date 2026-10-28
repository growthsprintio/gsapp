import { NextResponse } from 'next/server';
import { getSessionWorkspaceId } from '@/lib/meta-session';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/briefs/status — who has opened what, and the work sent back. */
export async function GET() {
  const workspaceId = await getSessionWorkspaceId();
  const admin = createSupabaseAdmin();
  if (!workspaceId || !admin) return NextResponse.json({ briefs: [] });

  const { data, error } = await admin.from('shared_briefs')
    .select('token, brief_id, viewed_at, submissions')
    .eq('workspace_id', workspaceId);
  if (error) return NextResponse.json({ briefs: [] });

  return NextResponse.json({
    briefs: (data || []).map((r) => ({
      token: r.token, briefId: r.brief_id, viewedAt: r.viewed_at, submissions: r.submissions || [],
    })),
  });
}
