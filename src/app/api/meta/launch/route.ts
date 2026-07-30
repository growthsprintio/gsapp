import { NextResponse } from 'next/server';
import { getSessionMetaConfig } from '@/lib/meta-session';
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

  try {
    const result = await launchToMeta(cfg, payload);
    // Everything is created PAUSED — a human activates it in Ads Manager.
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error pushing to Meta.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
