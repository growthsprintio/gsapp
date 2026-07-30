import { NextResponse } from 'next/server';
import { getSessionMetaConfig } from '@/lib/meta-session';
import { verifyConnection } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/meta/verify — end-to-end check of token, ad account, page, and ad sets.
export async function GET() {
  const cfg = await getSessionMetaConfig();
  if (!cfg) {
    return NextResponse.json({
      configured: false,
      checks: [],
      hint: 'Connect Meta in Settings → Integrations, then choose an ad account and Page.',
    });
  }

  try {
    const checks = await verifyConnection(cfg);
    return NextResponse.json({
      configured: true,
      adAccountId: cfg.adAccountId,
      apiVersion: cfg.version,
      checks,
      ok: checks.every((c) => c.ok),
    });
  } catch (err) {
    return NextResponse.json(
      { configured: true, checks: [], error: err instanceof Error ? err.message : 'Verification failed.' },
      { status: 502 },
    );
  }
}
