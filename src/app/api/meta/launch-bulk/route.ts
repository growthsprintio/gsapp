import { NextResponse } from 'next/server';
import { getSessionMetaConfig } from '@/lib/meta-session';
import { launchToMeta, type LaunchPayload } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * POST /api/meta/launch-bulk
 * Launches several creatives into the same ad set in one request.
 * Each item is reported independently so one bad asset doesn't sink the batch.
 */
export async function POST(req: Request) {
  const cfg = await getSessionMetaConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: 'Meta is not connected for this workspace. Connect it in Settings → Integrations.' },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => null);
  const items: (LaunchPayload & { id: string })[] = body?.items ?? [];
  const adSetId: string | undefined = body?.metaAdSetId;

  if (!adSetId) return NextResponse.json({ error: 'Select a campaign and ad set.' }, { status: 400 });
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'No creatives selected.' }, { status: 400 });
  }
  if (items.length > 25) {
    return NextResponse.json({ error: 'Launch at most 25 creatives at a time.' }, { status: 400 });
  }

  // Sequential on purpose — Meta rate-limits ad creation, and a partial failure
  // is easier to reason about than a burst of parallel errors.
  const results: { id: string; ok: boolean; adId?: string; error?: string }[] = [];
  for (const item of items) {
    try {
      const res = await launchToMeta(cfg, { ...item, metaAdSetId: adSetId });
      results.push({ id: item.id, ok: true, adId: res.adId });
    } catch (e) {
      results.push({ id: item.id, ok: false, error: e instanceof Error ? e.message : 'Failed.' });
    }
  }

  return NextResponse.json({
    ok: results.some((r) => r.ok),
    launched: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
