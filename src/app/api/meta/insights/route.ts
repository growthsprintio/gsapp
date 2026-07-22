import { NextResponse } from 'next/server';
import { getMetaConfig, getAdInsights } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/meta/insights?adId=... — last-30d performance for one ad.
export async function GET(req: Request) {
  const adId = new URL(req.url).searchParams.get('adId');
  if (!adId) {
    return NextResponse.json({ error: 'adId is required' }, { status: 400 });
  }

  const cfg = getMetaConfig();
  if (!cfg) {
    return NextResponse.json({ configured: false, insights: null });
  }

  try {
    const insights = await getAdInsights(cfg, adId);
    return NextResponse.json({ configured: true, insights });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch insights.';
    return NextResponse.json({ configured: true, insights: null, error: message }, { status: 502 });
  }
}
