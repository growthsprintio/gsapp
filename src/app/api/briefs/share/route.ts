import { NextResponse } from 'next/server';
import { getSessionWorkspaceId } from '@/lib/meta-session';
import { readBrief, publishBrief, briefUrl } from '@/lib/outreach-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/briefs/share — { brief } → { token, url }. Publishes the latest edits too. */
export async function POST(req: Request) {
  const workspaceId = await getSessionWorkspaceId();
  if (!workspaceId) return NextResponse.json({ error: 'Sign in to share briefs.' }, { status: 401 });

  const brief = readBrief(await req.json().catch(() => null));
  if (!brief) return NextResponse.json({ error: 'That brief could not be read.' }, { status: 400 });

  const result = await publishBrief(workspaceId, brief);
  if ('error' in result) return NextResponse.json(result, { status: 502 });
  return NextResponse.json({ token: result.token, url: briefUrl(req, result.token) });
}
