import { NextResponse } from 'next/server';
import { getMetaConfig } from '@/lib/meta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lightweight check so the UI can show "Meta connected" without exposing secrets.
export async function GET() {
  const cfg = getMetaConfig();
  return NextResponse.json({
    configured: !!cfg,
    adAccountId: cfg?.adAccountId ?? null,
  });
}
