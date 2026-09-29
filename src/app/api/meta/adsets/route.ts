import { NextResponse } from 'next/server';
import { getSessionMetaConfig } from '@/lib/meta-session';
import { listAdSets, countCampaigns } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/meta/adsets — existing campaigns + ad sets for the launch selector.
export async function GET() {
  const cfg = await getSessionMetaConfig();
  if (!cfg) return NextResponse.json({ configured: false, adsets: [] });

  try {
    const adsets = await listAdSets(cfg);

    // An empty dropdown is ambiguous — say whether the account is bare or just
    // has campaigns with no ad sets under them.
    if (adsets.length === 0) {
      let campaignCount: number | null = null;
      try { campaignCount = await countCampaigns(cfg); } catch { /* diagnostic only */ }
      return NextResponse.json({
        configured: true,
        adsets,
        campaignCount,
        adAccountId: cfg.adAccountId,
      });
    }

    return NextResponse.json({ configured: true, adsets });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load ad sets.';
    return NextResponse.json({ configured: true, adsets: [], error: message }, { status: 502 });
  }
}
