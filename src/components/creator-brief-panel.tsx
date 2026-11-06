'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Plus, Trash2, Eye, Link2, Check, Send, Mail, Loader2, ExternalLink, CheckCircle2, ChevronDown,
} from 'lucide-react';
import { cn, nanoid } from '@/lib/utils';
import { SIZE_OPTIONS, type CreatorBrief, type OutreachBrief, type OutreachSubmission } from '@/lib/types';
import { KIND_COPY, OUTREACH_STATUS, publicView, defaultMessage, isEmail } from '@/lib/outreach';
import { isDirectAsset } from '@/lib/creator-brief';
import { BriefDocument } from './brief-document';

const INPUT = 'w-full bg-card border border-border rounded-md px-2.5 h-9 text-sm hover:border-foreground/20 focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground/60';
const AREA = 'w-full bg-card border border-border rounded-md px-2.5 py-2 text-sm leading-relaxed hover:border-foreground/20 focus:border-primary focus:outline-none resize-none transition-colors placeholder:text-muted-foreground/60';
const COPY = KIND_COPY.creator;

/** Republish to the share link so the creator always sees the latest edits. */
export async function shareBrief(brief: OutreachBrief) {
  const r = await fetch('/api/briefs/share', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief }),
  }).catch(() => null);
  const d = await r?.json().catch(() => ({}));
  if (!r?.ok) throw new Error(d?.error || 'Sharing isn’t available right now.');
  return d as { token: string; url: string };
}

/**
 * The creator half of a brief, shown inside the brief popup. Everything shared
 * with an in-house brief stays in the popup's own fields.
 */
export function CreatorBriefPanel({ brief, cb, onChange, onBeforeShare, sender, missing, onJump }: {
  /** The whole brief as the creator will see it. */
  brief: OutreachBrief;
  cb: CreatorBrief;
  onChange: (u: Partial<CreatorBrief>) => void;
  /** Saves the creative first, so a shared brief always has a roadmap row behind it. */
  onBeforeShare: (u: Partial<CreatorBrief>) => void;
  sender?: string;
  /** What must be filled in before this can go out, first to last. */
  missing: string[];
  /** Takes you to a missing field. */
  onJump: (label: string) => void;
}) {
  const [panel, setPanel] = useState<'none' | 'preview' | 'send'>('none');
  const [linkState, setLinkState] = useState<'idle' | 'working' | 'copied'>('idle');
  const [error, setError] = useState('');
  // Once it's sent the form is reference, not the task, so it starts folded.
  const [expanded, setExpanded] = useState(!cb.sentAt);
  // Sending stays clickable: pressing it with gaps takes you to the first one,
  // which says more than a greyed-out button does.
  const [attempted, setAttempted] = useState(false);
  const stopAtGaps = () => {
    if (missing.length === 0) return false;
    setAttempted(true);
    onJump(missing[0]);
    return true;
  };
  const noCreator = attempted && !cb.recipientName?.trim() && !cb.recipientEmail?.trim();
  const noDeliverable = attempted && !cb.deliverables.some((d) => d.label.trim());
  // Never fold away something that still has to be filled in.
  const open = expanded || missing.length > 0;

  const copyLink = async () => {
    if (stopAtGaps()) return;
    setError('');
    setLinkState('working');
    try {
      const { token, url } = await shareBrief(brief);
      onBeforeShare({ shareToken: token });
      await navigator.clipboard.writeText(url);
      setLinkState('copied');
      setTimeout(() => setLinkState('idle'), 2000);
    } catch (e) {
      setError((e as Error).message);
      setLinkState('idle');
    }
  };

  const status = OUTREACH_STATUS[cb.status];
  const pieces = cb.deliverables.filter((d) => d.label.trim()).length;

  return (
    // Enter in these fields shouldn't submit, and close, the surrounding brief.
    <section className="rounded-xl border border-border bg-muted/20 p-4 space-y-5"
      onKeyDown={(e) => { if (e.key === 'Enter' && (e.target as HTMLElement).tagName === 'INPUT') e.preventDefault(); }}>
      <button type="button" onClick={() => setExpanded((v) => !v)} aria-expanded={open}
        className="w-full flex items-center gap-2 text-left">
        <h3 className="text-sm font-semibold">Creator brief</h3>
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', status.className)}>{status.label}</span>
        {!open && (
          <span className="text-xs text-muted-foreground truncate min-w-0">
            {[cb.recipientName || cb.recipientEmail, `${pieces} deliverable${pieces === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
          </span>
        )}
        <ChevronDown className={cn('w-4 h-4 text-muted-foreground ml-auto flex-shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && <>
      <Block title="The creator" required>
        <div className="grid grid-cols-3 gap-2">
          <input id="cb-creator" value={cb.recipientName || ''} onChange={(e) => onChange({ recipientName: e.target.value })}
            placeholder="Name" className={cn(INPUT, noCreator && 'border-red-300')} />
          <input type="email" value={cb.recipientEmail || ''} onChange={(e) => onChange({ recipientEmail: e.target.value })}
            placeholder="Email" className={cn(INPUT, (noCreator || (cb.recipientEmail && !isEmail(cb.recipientEmail))) && 'border-red-300')} />
          <input value={cb.recipientHandle || ''} onChange={(e) => onChange({ recipientHandle: e.target.value })}
            placeholder="@handle" className={INPUT} />
        </div>
        {noCreator && <p className="text-xs text-red-600 mt-1.5">Add the creator&rsquo;s name or email.</p>}
      </Block>

      <Block title="What we need" hint="As many pieces as you like" required>
        <Deliverables cb={cb} onChange={onChange} invalid={noDeliverable} />
        {noDeliverable && <p className="text-xs text-red-600 mt-1.5 ml-8">Add at least one thing for them to make.</p>}
      </Block>

      <Block title="Key messages" hint="One per line">
        <textarea value={cb.keyMessages || ''} onChange={(e) => onChange({ keyMessages: e.target.value })} rows={2}
          placeholder={COPY.keyMessages} className={AREA} />
      </Block>

      <Block title="Hooks to try" hint="One per line">
        <textarea value={cb.hooks || ''} onChange={(e) => onChange({ hooks: e.target.value })} rows={2}
          placeholder={COPY.hooks} className={AREA} />
      </Block>

      <div className="grid grid-cols-2 gap-3">
        <Block title="Do">
          <textarea value={cb.dos || ''} onChange={(e) => onChange({ dos: e.target.value })} rows={3}
            placeholder={COPY.dos} className={AREA} />
        </Block>
        <Block title="Don’t">
          <textarea value={cb.donts || ''} onChange={(e) => onChange({ donts: e.target.value })} rows={3}
            placeholder={COPY.donts} className={AREA} />
        </Block>
      </div>

      <Block title="Terms">
        <div className="space-y-2">
          <input value={cb.compensation || ''} onChange={(e) => onChange({ compensation: e.target.value })}
            placeholder="Compensation, e.g. $400 + product" className={INPUT} />
          <textarea value={cb.usageRights || ''} onChange={(e) => onChange({ usageRights: e.target.value })} rows={2}
            placeholder="Usage rights, e.g. Paid social on Meta and TikTok for 6 months" className={AREA} />
        </div>
      </Block>
      </>}

      <div className="flex items-center gap-2 pt-1 border-t border-border">
        <p className="text-xs text-muted-foreground flex-1 min-w-0 truncate pt-3">
          {error ? <span className="text-red-600">{error}</span>
            : missing.length ? (
              <>Still needs{' '}
                {missing.map((m, i) => (
                  <span key={m}>
                    {i > 0 && ', '}
                    <button type="button" onClick={() => { setAttempted(true); onJump(m); }}
                      className="font-medium text-primary hover:underline">{m}</button>
                  </span>
                ))}
              </>
            )
            : cb.sentAt ? <>Sent {new Date(cb.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{cb.recipientEmail ? ` to ${cb.recipientEmail}` : ''}</>
            : 'Ready to send'}
        </p>
        <div className="flex items-center gap-2 pt-3">
          <button type="button" onClick={() => setPanel('preview')} className="btn btn-secondary btn-sm"><Eye className="w-3.5 h-3.5" /> Preview</button>
          <button type="button" onClick={copyLink} disabled={linkState === 'working'} className="btn btn-secondary btn-sm">
            {linkState === 'working' ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : linkState === 'copied' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Link2 className="w-3.5 h-3.5" />}
            {linkState === 'copied' ? 'Link copied' : 'Copy link'}
          </button>
          <button type="button" onClick={() => { if (!stopAtGaps()) setPanel('send'); }} className="btn btn-primary btn-sm">
            <Send className="w-3.5 h-3.5" /> {cb.sentAt ? 'Send again' : 'Send to creator'}
          </button>
        </div>
      </div>

      {panel === 'preview' && (
        <Overlay onClose={() => setPanel('none')} wide>
          <div className="max-h-[85vh] overflow-y-auto p-6 bg-background rounded-2xl">
            <p className="text-xs text-muted-foreground text-center mb-4">
              This is what {cb.recipientName?.split(' ')[0] || 'the creator'} will see
            </p>
            <BriefDocument brief={publicView(brief)}>
              <div className="px-8 py-6 bg-muted/50 border-t border-border">
                <p className="text-sm font-semibold">Send your work</p>
                <p className="text-sm text-muted-foreground mt-1">They paste links to their files here, and they show up on this brief.</p>
              </div>
            </BriefDocument>
          </div>
        </Overlay>
      )}

      {panel === 'send' && (
        <SendPanel brief={brief} sender={sender} onClose={() => setPanel('none')}
          onSent={(token) => onBeforeShare({
            shareToken: token,
            sentAt: new Date().toISOString(),
            status: cb.status === 'draft' ? 'sent' : cb.status,
          })} />
      )}
    </section>
  );
}

/**
 * What the creator sent back. One brief can bring in any number of pieces:
 * one becomes this ad, and any other can start an ad of its own.
 */
export function ReturnedWork({ submissions, usedUrls, currentCreative, onUse, onNewAd }: {
  submissions: OutreachSubmission[];
  usedUrls: string[];
  currentCreative?: string;
  onUse: (url: string) => void;
  onNewAd: (url: string) => void;
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 mb-3">
      <p className="text-xs font-semibold mb-2">Work from the creator</p>
      <ul className="space-y-2">
        {[...submissions].reverse().map((s) => {
          const used = usedUrls.includes(s.url) || currentCreative === s.url;
          return (
            <li key={s.at + s.url} className="bg-card border border-border rounded-md px-3 py-2">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{s.url}</span>
                  </a>
                  {s.note && <p className="text-xs text-muted-foreground mt-1">{s.note}</p>}
                </div>
                {used ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-700 flex-shrink-0 mt-0.5"><Check className="w-3.5 h-3.5" /> Used</span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button type="button" onClick={() => onUse(s.url)} className="btn btn-primary btn-sm">Approve for this ad</button>
                    <button type="button" onClick={() => onNewAd(s.url)} className="btn btn-secondary btn-sm">New ad from this</button>
                  </div>
                )}
              </div>
              {!isDirectAsset(s.url) && !used && (
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  This is a share link, not the file. Meta needs the file itself, so download it and upload it below before launching.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Block({ title, hint, required, children }: { title: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <h4 className="text-xs font-semibold">{title}{required && <span className="text-primary" title="Required" aria-label="Required"> *</span>}</h4>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Deliverables({ cb, onChange, invalid }: { cb: CreatorBrief; onChange: (u: Partial<CreatorBrief>) => void; invalid?: boolean }) {
  const items = cb.deliverables;
  const patch = (id: string, u: Partial<CreatorBrief['deliverables'][number]>) =>
    onChange({ deliverables: items.map((d) => (d.id === id ? { ...d, ...u } : d)) });

  return (
    <div className="space-y-2">
      {items.map((d, i) => (
        <div key={d.id} className="flex items-center gap-2 group">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
          <input id={i === 0 ? 'cb-deliverable' : undefined} value={d.label} onChange={(e) => patch(d.id, { label: e.target.value })}
            placeholder={COPY.deliverable} className={cn(INPUT, 'flex-1 min-w-0', invalid && 'border-red-300')} />
          <select value={d.size || ''} onChange={(e) => patch(d.id, { size: e.target.value })} aria-label="Size"
            className={cn(INPUT, 'w-28 flex-shrink-0')}>
            <option value="">Any size</option>
            {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={d.length || ''} onChange={(e) => patch(d.id, { length: e.target.value })}
            placeholder="Length" aria-label="Length" className={cn(INPUT, 'w-20 flex-shrink-0')} />
          <button type="button" onClick={() => onChange({ deliverables: items.filter((x) => x.id !== d.id) })}
            disabled={items.length === 1} aria-label="Remove deliverable"
            className="p-1.5 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 disabled:invisible transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange({ deliverables: [...items, { id: nanoid(), label: '', size: items.at(-1)?.size }] })}
        className="flex items-center gap-1 text-xs text-primary font-medium hover:underline ml-8">
        <Plus className="w-3.5 h-3.5" /> Add another
      </button>
    </div>
  );
}

/** Portalled out of the brief's form so Enter here can't submit it. */
function Overlay({ onClose, wide, children }: { onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={cn('relative w-full', wide ? 'max-w-[760px]' : 'max-w-[520px]')}>
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function SendPanel({ brief, sender, onClose, onSent }: {
  brief: OutreachBrief; sender?: string; onClose: () => void; onSent: (token: string) => void;
}) {
  const [to, setTo] = useState(brief.recipientEmail || '');
  const [subject, setSubject] = useState(`Brief: ${brief.title}`);
  const [message, setMessage] = useState(() => defaultMessage(brief, sender));
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'handoff'>('idle');
  const [error, setError] = useState('');

  const send = async () => {
    setError('');
    setState('sending');
    const r = await fetch('/api/briefs/send', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, to, subject, message }),
    }).catch(() => null);
    const d = await r?.json().catch(() => ({}));
    if (!r?.ok) {
      setError(d?.error || 'Could not send. Check your connection and try again.');
      setState('idle');
      return;
    }
    onSent(d.token);
    if (d.sent) { setState('sent'); return; }
    // No email provider yet: hand the finished email to their own mail app.
    const body = `${message}\n\nOpen the brief: ${d.url}`;
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setState('handoff');
  };

  return (
    <Overlay onClose={onClose}>
      <div className="bg-card rounded-2xl shadow-xl border border-border">
        {state === 'sent' || state === 'handoff' ? (
          <div className="p-8 text-center">
            <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              {state === 'sent' ? <CheckCircle2 className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            </div>
            <p className="text-base font-semibold mt-3">{state === 'sent' ? 'Brief sent' : 'Opened in your email app'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {state === 'sent'
                ? `${to} has the link. You’ll see here when they open it and when work comes back.`
                : 'The email and link are filled in, so just press send there. You’ll see here when they open it.'}
            </p>
            <button type="button" onClick={onClose} className="btn btn-secondary mt-5">Done</button>
          </div>
        ) : (
          <>
            <div className="px-6 pt-5 pb-4 border-b border-border">
              <p className="text-base font-semibold">Send to creator</p>
              <p className="text-xs text-muted-foreground mt-0.5">They get a link to the brief. No account needed.</p>
            </div>
            <div className="px-6 py-4 space-y-3">
              <label className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-16">To</span>
                <input type="email" value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@email.com" autoFocus={!to}
                  className={cn(INPUT, to && !isEmail(to) && 'border-red-300')} />
              </label>
              <label className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground w-16">Subject</span>
                <input value={subject} onChange={(e) => setSubject(e.target.value)} className={INPUT} />
              </label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={8} className={AREA} />
              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 px-6 pb-5">
              <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
              <button type="button" onClick={send} disabled={!isEmail(to) || state === 'sending'} className="btn btn-primary">
                {state === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
              </button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}
