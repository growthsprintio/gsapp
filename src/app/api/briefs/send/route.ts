import { NextResponse } from 'next/server';
import { getSessionWorkspaceId } from '@/lib/meta-session';
import { createSupabaseServer } from '@/lib/supabase-server';
import { readBrief, publishBrief, briefUrl } from '@/lib/outreach-server';
import { emailHtml, isEmail } from '@/lib/outreach';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/briefs/send — { brief, to, subject, message }
 * Publishes the brief, then emails the link through Resend. When no email
 * provider is configured it still publishes and answers { sent: false } so
 * the app can hand off to the sender's own mail client instead.
 */
export async function POST(req: Request) {
  const workspaceId = await getSessionWorkspaceId();
  if (!workspaceId) return NextResponse.json({ error: 'Sign in to send briefs.' }, { status: 401 });

  const body = await req.json().catch(() => null) as { to?: string; subject?: string; message?: string } | null;
  const brief = readBrief(body);
  if (!brief) return NextResponse.json({ error: 'That brief could not be read.' }, { status: 400 });

  const to = body?.to?.trim() || '';
  if (!isEmail(to)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  const subject = (body?.subject || `Brief: ${brief.title}`).slice(0, 200).replace(/[\r\n]+/g, ' ');
  const message = (body?.message || '').slice(0, 5000);

  const published = await publishBrief(workspaceId, brief);
  if ('error' in published) return NextResponse.json(published, { status: 502 });
  const url = briefUrl(req, published.token);

  const key = process.env.RESEND_API_KEY;
  if (!key) return NextResponse.json({ sent: false, token: published.token, url });

  // Replies go to whoever sent it, not to a no-reply box.
  let replyTo: string | undefined;
  try {
    const { data: { user } } = await (await createSupabaseServer()).auth.getUser();
    replyTo = user?.email ?? undefined;
  } catch { /* reply-to is optional */ }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'GrowthSprint <onboarding@resend.dev>',
      to: [to],
      subject,
      html: emailHtml(message, url, brief.title),
      text: `${message}\n\n${url}`,
      ...(replyTo && { reply_to: replyTo }),
    }),
  });

  if (!res.ok) {
    const d = await res.json().catch(() => ({})) as { message?: string };
    return NextResponse.json(
      { error: `Email failed: ${d.message || res.statusText}`, token: published.token, url },
      { status: 502 },
    );
  }
  return NextResponse.json({ sent: true, token: published.token, url });
}
