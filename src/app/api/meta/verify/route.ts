import { NextResponse } from 'next/server';
import { getMetaConfig, verifyConnection } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/meta/verify — end-to-end check of token, ad account, page, and ad sets.
export async function GET() {
  const cfg = getMetaConfig();
  if (!cfg) {
    return NextResponse.json({
      configured: false,
      checks: [],
      hint: 'Set META_ACCESS_TOKEN, META_AD_ACCOUNT_ID and META_PAGE_ID, then redeploy.',
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
