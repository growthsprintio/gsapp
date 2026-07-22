import { NextResponse } from 'next/server';
import { getMetaConfig, listAdSets } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/meta/adsets — existing campaigns + ad sets for the launch selector.
export async function GET() {
  const cfg = getMetaConfig();
  if (!cfg) return NextResponse.json({ configured: false, adsets: [] });

  try {
    const adsets = await listAdSets(cfg);
    return NextResponse.json({ configured: true, adsets });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load ad sets.';
    return NextResponse.json({ configured: true, adsets: [], error: message }, { status: 502 });
  }
}
