import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_SUBMISSIONS = 50;

/**
 * POST /api/public/briefs/{token} — { url, note }
 * The recipient sends their work back. No login: the unguessable token is the
 * credential, and all it allows is appending a link to that one brief.
 */
export async function POST(req: Request, ctx: RouteContext<'/api/public/briefs/[token]'>) {
  const { token } = await ctx.params;
  const admin = createSupabaseAdmin();
  if (!admin || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) {
    return NextResponse.json({ error: 'Brief not found.' }, { status: 404 });
  }

  const body = await req.json().catch(() => null) as { url?: string; note?: string } | null;
  let url: URL;
  try {
    url = new URL((body?.url || '').trim());
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.')) throw new Error();
  } catch {
    return NextResponse.json({ error: 'Paste a full link, starting with https://' }, { status: 400 });
  }
  const note = (body?.note || '').trim().slice(0, 1000) || undefined;

  const { data } = await admin.from('shared_briefs').select('submissions').eq('token', token).maybeSingle();
  if (!data) return NextResponse.json({ error: 'Brief not found.' }, { status: 404 });

  const submissions = Array.isArray(data.submissions) ? data.submissions : [];
  if (submissions.length >= MAX_SUBMISSIONS) {
    return NextResponse.json({ error: 'This brief has reached its limit. Contact the team directly.' }, { status: 429 });
  }

  const { error } = await admin.from('shared_briefs').update({
    submissions: [...submissions, { url: url.toString().slice(0, 2000), note, at: new Date().toISOString() }],
    updated_at: new Date().toISOString(),
  }).eq('token', token);
  if (error) return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 502 });

  return NextResponse.json({ ok: true });
}
