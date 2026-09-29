import { NextResponse } from 'next/server';
import { getSessionMetaConfig } from '@/lib/meta-session';
import { duplicateAdSet } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/meta/adsets/duplicate
 * Copies an existing ad set (targeting, budget, placements, schedule) into a
 * new PAUSED one with no ads in it, ready for a fresh creative batch.
 */
export async function POST(req: Request) {
  const cfg = await getSessionMetaConfig();
  if (!cfg) {
    return NextResponse.json({ error: 'Meta is not connected for this workspace.' }, { status: 400 });
  }

  let body: { adSetId?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!body.adSetId) {
    return NextResponse.json({ error: 'Pick an ad set to duplicate.' }, { status: 400 });
  }

  try {
    const { id } = await duplicateAdSet(cfg, body.adSetId, body.name);
    return NextResponse.json({ ok: true, adSetId: id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not duplicate the ad set.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
