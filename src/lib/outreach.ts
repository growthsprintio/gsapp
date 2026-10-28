import type { OutreachBrief, OutreachKind, OutreachStatus } from './types';

/**
 * Briefs for people outside the team. Pure helpers only — imported by the
 * app, the API routes and the public /b/{token} page alike.
 */

export const KIND_LABEL: Record<OutreachKind, string> = {
  creator: 'Creator brief',
  design: 'Design brief',
};

export const KIND_HINT: Record<OutreachKind, string> = {
  creator: 'Influencers and UGC creators filming content',
  design: 'Designers and editors making the asset',
};

export const OUTREACH_STATUS: Record<OutreachStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-stone-100 text-stone-600' },
  sent: { label: 'Sent', className: 'bg-sky-50 text-sky-700' },
  viewed: { label: 'Viewed', className: 'bg-violet-50 text-violet-700' },
  submitted: { label: 'Work received', className: 'bg-amber-50 text-amber-700' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' },
};

/** Section copy differs by audience — a creator films, a designer builds. */
export const KIND_COPY: Record<OutreachKind, {
  overview: string;
  keyMessages: string;
  hooks?: string;
  dos: string;
  donts: string;
  deliverable: string;
}> = {
  creator: {
    overview: 'What we’re making and why — the story in two or three sentences.',
    keyMessages: 'The points the video has to land, one per line.',
    hooks: 'Opening lines to try in the first 3 seconds, one per line.',
    dos: 'Film in natural light, show the product in hand…',
    donts: 'No competitor brands, no medical claims…',
    deliverable: 'e.g. 30s talking-head video',
  },
  design: {
    overview: 'What the asset needs to do and who it’s for.',
    keyMessages: 'Copy or claims that must appear, one per line.',
    dos: 'Use brand orange sparingly, product on the left third…',
    donts: 'No stock photography, no gradients…',
    deliverable: 'e.g. Static ad',
  },
};

export function emptyOutreach(kind: OutreachKind): Omit<OutreachBrief, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    kind,
    title: '',
    status: 'draft',
    deliverables: [{ id: Math.random().toString(36).slice(2, 9), label: '', size: kind === 'creator' ? '9:16' : '4:5' }],
    references: [],
  };
}

/**
 * What the recipient is allowed to see. Built field by field rather than by
 * deleting from a copy, so anything added to OutreachBrief later stays
 * private until someone decides it belongs here.
 */
export function publicView(b: OutreachBrief) {
  return {
    kind: b.kind,
    title: b.title,
    recipientName: b.recipientName,
    product: b.product,
    angle: b.angle,
    overview: b.overview,
    keyMessages: b.keyMessages,
    hooks: b.kind === 'creator' ? b.hooks : undefined,
    dos: b.dos,
    donts: b.donts,
    deliverables: (b.deliverables || []).filter((d) => d.label?.trim()),
    references: (b.references || []).filter(Boolean),
    dueDate: b.dueDate,
    compensation: b.kind === 'creator' ? b.compensation : undefined,
    usageRights: b.kind === 'creator' ? b.usageRights : undefined,
  };
}
export type PublicBrief = ReturnType<typeof publicView>;

/** Lines of a textarea, blank ones dropped. */
export const lines = (v?: string) => (v || '').split('\n').map((l) => l.trim()).filter(Boolean);

export function briefMissing(b: OutreachBrief): string[] {
  const out: string[] = [];
  if (!b.title.trim()) out.push('a title');
  if (!b.overview?.trim()) out.push('an overview');
  if (!b.deliverables.some((d) => d.label.trim())) out.push('a deliverable');
  return out;
}

export function defaultMessage(b: OutreachBrief, sender?: string) {
  const first = b.recipientName?.trim().split(/\s+/)[0];
  const due = b.dueDate ? ` The due date is ${formatDue(b.dueDate)}.` : '';
  return `${first ? `Hi ${first},` : 'Hi,'}\n\nHere's the brief for ${b.title || 'our next piece'}. Everything you need is at the link, and you can send your work back through the same page when it's ready.${due}\n\nThanks!${sender ? `\n${sender}` : ''}`;
}

export function formatDue(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return isNaN(+d) ? iso : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plain, client-safe email: their message, one button, the link spelled out. */
export function emailHtml(message: string, link: string, title: string) {
  const body = esc(message).replace(/\n/g, '<br>');
  return `<!doctype html><html><body style="margin:0;background:#f5f1eb;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#2b2724">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;border:1px solid #e9e3da">
<tr><td style="padding:32px">
<p style="margin:0 0 20px;font-size:15px;line-height:1.6">${body}</p>
<a href="${esc(link)}" style="display:inline-block;background:#ff5200;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:999px">Open brief: ${esc(title)}</a>
<p style="margin:20px 0 0;font-size:12px;color:#8a817a">Or paste this link: ${esc(link)}</p>
</td></tr></table>
<p style="font-size:11px;color:#a49b93;margin:16px 0 0">Sent with GrowthSprint</p>
</td></tr></table></body></html>`;
}

export function isEmail(v?: string) {
  return !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}
