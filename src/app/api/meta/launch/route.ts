import { NextResponse } from 'next/server';
import { getSessionMetaConfig, canLaunchActive } from '@/lib/meta-session';
import { launchToMeta, type LaunchPayload } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const cfg = await getSessionMetaConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: 'Meta is not connected for this workspace. Go to Settings → Integrations and connect Meta, then pick an ad account and Page.' },
      { status: 400 },
    );
  }

  let payload: LaunchPayload;
  try {
    payload = (await req.json()) as LaunchPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  // Minimal validation before we start spending API calls.
  const missing = [
    ['adName', payload.adName],
    ['creativeLink (image URL)', payload.creativeLink],
    ['landingPage', payload.landingPage],
    ['metaAdSetId (target ad set)', payload.metaAdSetId],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
  }

  const status = payload.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED';
  if (status === 'ACTIVE' && !(await canLaunchActive())) return NextResponse.json({ error: 'Only a workspace admin can launch an ad as active. Launch it paused instead.' }, { status: 403 });

  try {
    const result = await launchToMeta(cfg, { ...payload, status });
    return NextResponse.json({ ok: true, status, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error pushing to Meta.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
