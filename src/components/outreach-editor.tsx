'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Plus, Trash2, Eye, Link2, Check, Send, Mail, Loader2, ImagePlus, ExternalLink, CheckCircle2, Library,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useCurrentUser } from '@/lib/use-current-user';
import { cn, nanoid } from '@/lib/utils';
import { SIZE_OPTIONS, type OutreachBrief, type OutreachKind } from '@/lib/types';
import {
  KIND_LABEL, KIND_HINT, KIND_COPY, OUTREACH_STATUS, publicView, briefMissing, defaultMessage, isEmail,
} from '@/lib/outreach';
import { BriefDocument } from './brief-document';

const INPUT = 'w-full bg-card border border-border rounded-lg px-3 h-9 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow';
const AREA = 'w-full bg-card border border-border rounded-lg px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/70 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-shadow';
const QUIET_BTN = 'flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium text-foreground hover:bg-foreground/5 transition-colors';

/** Republish to the share link so the recipient always sees the latest edits. */
async function share(brief: OutreachBrief) {
  const r = await fetch('/api/briefs/share', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief }),
  }).catch(() => null);
  const d = await r?.json().catch(() => ({}));
  if (!r?.ok) throw new Error(d?.error || 'Sharing isn’t available right now.');
  return d as { token: string; url: string };
}

export function OutreachEditor({ briefId, onClose }: { briefId: string; onClose: () => void }) {
  const brief = useAppStore((s) => (s.outreach || []).find((b) => b.id === briefId));
  const update = useAppStore((s) => s.updateOutreach);
  const remove = useAppStore((s) => s.deleteOutreach);
  const library = useAppStore((s) => s.creativeBank) || [];
  const addCreative = useAppStore((s) => s.addCreativeEntry);
  const copyBank = useAppStore((s) => s.copyBank);
  const me = useCurrentUser();

  const [panel, setPanel] = useState<'none' | 'preview' | 'send'>('none');
  const [linkState, setLinkState] = useState<'idle' | 'working' | 'copied'>('idle');
  const [error, setError] = useState('');
  const dirty = useRef(false);

  const products = useMemo(() => copyBank.filter((e) => e.type === 'product').map((e) => e.content), [copyBank]);
  const angles = useMemo(() => copyBank.filter((e) => e.type === 'angle').map((e) => e.content), [copyBank]);

  // Esc closes the topmost layer first.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (panel !== 'none') setPanel('none'); else close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!brief) return null;
  const set = (u: Partial<OutreachBrief>) => { dirty.current = true; update(brief.id, u); };
  const copy = KIND_COPY[brief.kind];

  function close() {
    if (!brief) return onClose();
    const untouched = !brief.title.trim() && !brief.overview?.trim() && !brief.recipientEmail && brief.status === 'draft';
    if (untouched) remove(brief.id);
    // Keep the shared page current. Fire-and-forget: the store already has the edits.
    else if (brief.shareToken && dirty.current) share(brief).catch(() => {});
    onClose();
  }

  const copyLink = async () => {
    setError('');
    setLinkState('working');
    try {
      const { token, url } = await share(brief);
      set({ shareToken: token });
      await navigator.clipboard.writeText(url);
      setLinkState('copied');
      setTimeout(() => setLinkState('idle'), 2000);
    } catch (e) {
      setError((e as Error).message);
      setLinkState('idle');
    }
  };

  const missing = briefMissing(brief);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/25" onClick={close} />
      <div className="relative w-full max-w-[880px] h-full bg-background shadow-2xl flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-6 h-14 border-b border-border bg-card flex-shrink-0">
          <div className="flex items-center bg-muted rounded-full p-0.5">
            {(['creator', 'design'] as OutreachKind[]).map((k) => (
              <button key={k} onClick={() => set({ kind: k })} title={KIND_HINT[k]}
                className={cn('h-7 px-3 rounded-full text-xs font-medium transition-colors',
                  brief.kind === k ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', OUTREACH_STATUS[brief.status].className)}>
            {OUTREACH_STATUS[brief.status].label}
          </span>
          <button onClick={close} aria-label="Close" className="ml-auto p-2 rounded-full hover:bg-foreground/5 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[720px] mx-auto px-6 py-8 space-y-9">
            {(brief.submissions?.length ?? 0) > 0 && (
              <WorkReceived brief={brief}
                onApprove={() => set({ status: 'approved' })}
                onSaveToLibrary={(url) => addCreative({
                  title: `${brief.title}${brief.recipientName ? ` — ${brief.recipientName}` : ''}`,
                  url, format: brief.kind === 'creator' ? 'ugc' : 'static', tags: [brief.kind],
                })}
                savedUrls={new Set(library.map((c) => c.url))} />
            )}

            <div>
              <input value={brief.title} onChange={(e) => set({ title: e.target.value })} autoFocus={!brief.title}
                placeholder={brief.kind === 'creator' ? 'e.g. Rope Hoodie unboxing' : 'e.g. Fall drop static set'}
                className="w-full bg-transparent text-[26px] font-semibold leading-tight placeholder:text-muted-foreground/50 focus:outline-none" />
              <textarea value={brief.overview || ''} onChange={(e) => set({ overview: e.target.value })} rows={3}
                placeholder={copy.overview}
                className="w-full bg-transparent mt-2 text-[15px] leading-relaxed placeholder:text-muted-foreground/60 resize-none focus:outline-none" />
            </div>

            <Block title="Who it’s for">
              <div className="grid grid-cols-2 gap-3">
                <input value={brief.recipientName || ''} onChange={(e) => set({ recipientName: e.target.value })}
                  placeholder="Name" className={INPUT} />
                <input type="email" value={brief.recipientEmail || ''} onChange={(e) => set({ recipientEmail: e.target.value })}
                  placeholder="Email" className={cn(INPUT, brief.recipientEmail && !isEmail(brief.recipientEmail) && 'border-red-300')} />
                {brief.kind === 'creator' && (
                  <input value={brief.recipientHandle || ''} onChange={(e) => set({ recipientHandle: e.target.value })}
                    placeholder="@handle" className={INPUT} />
                )}
                <input type="date" value={brief.dueDate || ''} onChange={(e) => set({ dueDate: e.target.value })}
                  aria-label="Due date" className={cn(INPUT, !brief.dueDate && 'text-muted-foreground')} />
              </div>
            </Block>

            <Block title="What we need">
              <Deliverables brief={brief} set={set} placeholder={copy.deliverable} />
            </Block>

            <Block title="Product & angle">
              <div className="grid grid-cols-2 gap-3">
                <input list="outreach-products" value={brief.product || ''} onChange={(e) => set({ product: e.target.value })}
                  placeholder="Product" className={INPUT} />
                <input list="outreach-angles" value={brief.angle || ''} onChange={(e) => set({ angle: e.target.value })}
                  placeholder="Angle" className={INPUT} />
                <datalist id="outreach-products">{products.map((p) => <option key={p} value={p} />)}</datalist>
                <datalist id="outreach-angles">{angles.map((a) => <option key={a} value={a} />)}</datalist>
              </div>
            </Block>

            <Block title="Key messages" hint="One per line">
              <textarea value={brief.keyMessages || ''} onChange={(e) => set({ keyMessages: e.target.value })} rows={3}
                placeholder={copy.keyMessages} className={AREA} />
            </Block>

            {brief.kind === 'creator' && (
              <Block title="Hooks to try" hint="One per line">
                <textarea value={brief.hooks || ''} onChange={(e) => set({ hooks: e.target.value })} rows={3}
                  placeholder={copy.hooks} className={AREA} />
              </Block>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Block title="Do">
                <textarea value={brief.dos || ''} onChange={(e) => set({ dos: e.target.value })} rows={4}
                  placeholder={copy.dos} className={AREA} />
              </Block>
              <Block title="Don’t">
                <textarea value={brief.donts || ''} onChange={(e) => set({ donts: e.target.value })} rows={4}
                  placeholder={copy.donts} className={AREA} />
              </Block>
            </div>

            <Block title="References" hint="From your library or any link">
              <References brief={brief} set={set} library={library} />
            </Block>

            {brief.kind === 'creator' && (
              <Block title="Terms">
                <div className="space-y-3">
                  <input value={brief.compensation || ''} onChange={(e) => set({ compensation: e.target.value })}
                    placeholder="Compensation, e.g. $400 + product" className={INPUT} />
                  <textarea value={brief.usageRights || ''} onChange={(e) => set({ usageRights: e.target.value })} rows={2}
                    placeholder="Usage rights, e.g. Paid social on Meta and TikTok for 6 months" className={AREA} />
                </div>
              </Block>
            )}

            <button onClick={() => { remove(brief.id); onClose(); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete brief
            </button>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-2 px-6 h-16 border-t border-border bg-card flex-shrink-0">
          <p className="text-xs text-muted-foreground flex-1 min-w-0 truncate">
            {error ? <span className="text-red-600">{error}</span>
              : missing.length ? <>Still needs {missing.join(', ')}</>
              : brief.sentAt ? <>Sent {new Date(brief.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}{brief.recipientEmail ? ` to ${brief.recipientEmail}` : ''}</>
              : 'Ready to send'}
          </p>
          <button onClick={() => setPanel('preview')} className={QUIET_BTN}><Eye className="w-4 h-4" /> Preview</button>
          <button onClick={copyLink} disabled={linkState === 'working'} className={QUIET_BTN}>
            {linkState === 'working' ? <Loader2 className="w-4 h-4 animate-spin" />
              : linkState === 'copied' ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4" />}
            {linkState === 'copied' ? 'Link copied' : 'Copy link'}
          </button>
          <button onClick={() => setPanel('send')} disabled={missing.length > 0}
            title={missing.length ? `Add ${missing.join(', ')} first` : undefined}
            className="flex items-center gap-1.5 h-9 pl-3.5 pr-4 rounded-full bg-primary text-white text-sm font-medium shadow-sm hover:bg-primary/90 disabled:opacity-40 transition-colors">
            <Send className="w-4 h-4" /> {brief.sentAt ? 'Send again' : 'Send'}
          </button>
        </div>

        {panel === 'preview' && (
          <Overlay onClose={() => setPanel('none')} wide>
            <div className="max-h-[85vh] overflow-y-auto p-6 bg-background rounded-2xl">
              <p className="text-xs text-muted-foreground text-center mb-4">This is what {brief.recipientName?.split(' ')[0] || 'they'}&rsquo;ll see</p>
              <BriefDocument brief={publicView(brief)}>
                <div className="px-8 py-6 bg-muted/50 border-t border-border">
                  <p className="text-sm font-semibold">Send your work</p>
                  <p className="text-sm text-muted-foreground mt-1">They paste a link to their files here, and it shows up on this brief.</p>
                </div>
              </BriefDocument>
            </div>
          </Overlay>
        )}

        {panel === 'send' && (
          <SendPanel brief={brief} sender={me?.name}
            onClose={() => setPanel('none')}
            onSent={(token) => set({ shareToken: token, sentAt: new Date().toISOString(), status: brief.status === 'draft' ? 'sent' : brief.status })} />
        )}
      </div>
    </div>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Deliverables({ brief, set, placeholder }: {
  brief: OutreachBrief; set: (u: Partial<OutreachBrief>) => void; placeholder: string;
}) {
  const items = brief.deliverables;
  const patch = (id: string, u: Partial<OutreachBrief['deliverables'][number]>) =>
    set({ deliverables: items.map((d) => (d.id === id ? { ...d, ...u } : d)) });

  return (
    <div className="space-y-2">
      {items.map((d, i) => (
        <div key={d.id} className="flex items-center gap-2 group">
          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
          <input value={d.label} onChange={(e) => patch(d.id, { label: e.target.value })}
            placeholder={placeholder} className={cn(INPUT, 'flex-1')} />
          <select value={d.size || ''} onChange={(e) => patch(d.id, { size: e.target.value })} aria-label="Size"
            className={cn(INPUT, 'w-28')}>
            <option value="">Any size</option>
            {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {brief.kind === 'creator' && (
            <input value={d.length || ''} onChange={(e) => patch(d.id, { length: e.target.value })}
              placeholder="Length" aria-label="Length" className={cn(INPUT, 'w-24')} />
          )}
          <button onClick={() => set({ deliverables: items.filter((x) => x.id !== d.id) })}
            disabled={items.length === 1} aria-label="Remove deliverable"
            className="p-2 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 disabled:hidden transition">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <button onClick={() => set({ deliverables: [...items, { id: nanoid(), label: '', size: items.at(-1)?.size }] })}
        className="flex items-center gap-1.5 text-sm text-primary font-medium hover:underline ml-8">
        <Plus className="w-3.5 h-3.5" /> Add another
      </button>
    </div>
  );
}

function References({ brief, set, library }: {
  brief: OutreachBrief; set: (u: Partial<OutreachBrief>) => void;
  library: { id: string; title: string; url: string }[];
}) {
  const [link, setLink] = useState('');
  const [picking, setPicking] = useState(false);
  const refs = brief.references;
  const add = (url: string) => {
    const v = url.trim();
    if (!/^https?:\/\/[^\s.]+\.[^\s]+/.test(v) || refs.includes(v)) return false;
    set({ references: [...refs, v] });
    return true;
  };
  const valid = /^https?:\/\/[^\s.]+\.[^\s]+/.test(link.trim());

  return (
    <div className="space-y-3">
      {refs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {refs.map((url) => {
            const fromLib = library.find((c) => c.url === url);
            let label = fromLib?.title || url;
            if (!fromLib) { try { label = new URL(url).hostname.replace(/^www\./, ''); } catch { /* raw */ } }
            return (
              <span key={url} className="flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-full border border-border bg-card text-sm max-w-[260px]">
                <a href={url} target="_blank" rel="noreferrer" className="truncate hover:text-primary">{label}</a>
                <button onClick={() => set({ references: refs.filter((r) => r !== url) })} aria-label="Remove reference"
                  className="p-1 rounded-full text-muted-foreground hover:bg-foreground/5"><X className="w-3 h-3" /></button>
              </span>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <input value={link} onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && add(link)) setLink(''); }}
          onPaste={(e) => {
            const v = e.clipboardData.getData('text');
            if (add(v)) { e.preventDefault(); setLink(''); }
          }}
          placeholder="Paste a link" className={cn(INPUT, 'flex-1')} />
        <button onClick={() => { if (add(link)) setLink(''); }} disabled={!valid}
          className="h-9 px-3.5 rounded-full border border-border text-sm font-medium hover:bg-foreground/5 disabled:opacity-40 transition-colors">
          Add
        </button>
        {library.length > 0 && (
          <button onClick={() => setPicking((p) => !p)}
            className={cn('flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-sm font-medium transition-colors',
              picking ? 'border-primary/40 bg-primary/8 text-primary' : 'border-border hover:bg-foreground/5')}>
            <Library className="w-4 h-4" /> From library
          </button>
        )}
      </div>
      {picking && (
        <div className="grid grid-cols-4 gap-2 p-2 border border-border rounded-xl bg-card max-h-64 overflow-y-auto">
          {library.map((c) => {
            const on = refs.includes(c.url);
            return (
              <button key={c.id} onClick={() => set({ references: on ? refs.filter((r) => r !== c.url) : [...refs, c.url] })}
                className={cn('relative text-left rounded-lg overflow-hidden border transition-colors',
                  on ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40')}>
                <Thumb url={c.url} />
                <p className="text-xs truncate px-2 py-1.5">{c.title}</p>
                {on && <CheckCircle2 className="absolute top-1.5 right-1.5 w-4 h-4 text-primary bg-white rounded-full" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Thumb({ url }: { url: string }) {
  const [err, setErr] = useState(false);
  if (err) return <div className="aspect-square bg-muted flex items-center justify-center"><ImagePlus className="w-4 h-4 text-muted-foreground" /></div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" onError={() => setErr(true)} className="w-full aspect-square object-cover bg-muted" />;
}

function WorkReceived({ brief, onApprove, onSaveToLibrary, savedUrls }: {
  brief: OutreachBrief; onApprove: () => void; onSaveToLibrary: (url: string) => void; savedUrls: Set<string>;
}) {
  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Work received</h3>
        {brief.status !== 'approved' ? (
          <button onClick={onApprove}
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors">
            <Check className="w-3.5 h-3.5" /> Approve
          </button>
        ) : (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>
        )}
      </div>
      <ul className="space-y-2">
        {[...(brief.submissions || [])].reverse().map((s) => (
          <li key={s.at + s.url} className="flex items-start gap-3 bg-card border border-border rounded-lg px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <a href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline truncate">
                <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{s.url}</span>
              </a>
              {s.note && <p className="text-sm text-muted-foreground mt-1">{s.note}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(s.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
            {savedUrls.has(s.url) ? (
              <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">In library</span>
            ) : (
              <button onClick={() => onSaveToLibrary(s.url)}
                className="text-xs font-medium text-foreground border border-border rounded-full px-2.5 h-7 hover:bg-foreground/5 flex-shrink-0">
                Save to library
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Overlay({ onClose, wide, children }: { onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className={cn('relative w-full', wide ? 'max-w-[760px]' : 'max-w-[520px]')}>
        <button onClick={onClose} aria-label="Close"
          className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-card border border-border shadow-sm text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
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
            <button onClick={onClose} className="mt-5 h-9 px-5 rounded-full border border-border text-sm font-medium hover:bg-foreground/5">Done</button>
          </div>
        ) : (
          <>
            <div className="px-6 pt-5 pb-4 border-b border-border">
              <p className="text-base font-semibold">Send brief</p>
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
              <button onClick={onClose} className={QUIET_BTN}>Cancel</button>
              <button onClick={send} disabled={!isEmail(to) || state === 'sending'}
                className="flex items-center gap-1.5 h-9 pl-3.5 pr-4 rounded-full bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
                {state === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
              </button>
            </div>
          </>
        )}
      </div>
    </Overlay>
  );
}
