'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { applyNamingConvention, getBriefVariables } from '@/lib/utils';
import {
  FORMAT_OPTIONS, SIZE_OPTIONS, type RoadmapItem, type AdFormat,
  META_CTAS,
} from '@/lib/types';
import { X, Wand2, ExternalLink, ChevronDown, Search, Check, AlertCircle, Image as ImageIcon, ArrowRight, Copy as CopyIcon, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef } from 'react';
import { rankForBrief } from '@/lib/copy-bank';
import type { CopyBankEntry } from '@/lib/types';
import { CreativeInput } from '@/components/asset-drop';

const DEFAULT_ANGLES = ['Pain Point', 'Social Proof', 'Hook', 'Curiosity', 'Urgency', 'Lifestyle', 'Before/After', 'Tutorial', 'Comparison', 'Testimonial', 'UGC Raw', 'Founder Story'];

/** Borderless input that only shows its outline on hover and focus. */
const GHOST = 'w-full bg-transparent border border-transparent rounded-md px-2 py-1.5 text-sm hover:border-border focus:border-primary focus:outline-none transition-colors placeholder:text-muted-foreground/50';

/** A label / value row in the Properties panel. */
function Prop({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[68px_minmax(0,1fr)] items-start gap-1">
      {/* Wraps rather than truncating: these include workspace-named
          variables, and "Landing…" says nothing. */}
      <span className="text-xs text-muted-foreground pt-2 px-2 leading-tight break-words">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Standard bordered input for longer copy, where a visible box helps. */
const FIELD = 'w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50';

/**
 * Character count against Meta's recommended length. Going over isn't an
 * error — Meta truncates behind "See more" — so it turns amber, not red.
 */
function Count({ n, max }: { n: number; max: number }) {
  if (n === 0) return null;
  return (
    <span className={cn('text-[10px] tabular-nums', n > max ? 'text-amber-600 font-medium' : 'text-muted-foreground')}
      title={n > max ? `Meta shows about ${max} characters before cutting off` : `Meta recommends up to ${max}`}>
      {n}/{max}
    </span>
  );
}

/** A Facebook-feed-shaped preview of the ad, built from the brief. */
function AdPreview({ form, asset }: {
  form: { primaryText: string; headline: string; adDescription: string; landingPage: string; metaCTA: string };
  asset?: string;
}) {
  const cta = META_CTAS.find((c) => c.value === form.metaCTA)?.label;
  let domain = '';
  try { domain = form.landingPage ? new URL(form.landingPage).hostname.replace(/^www\./, '') : ''; } catch { domain = form.landingPage; }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm text-left">
      <div className="flex items-center gap-2 px-3 pt-3">
        <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold leading-tight">Your Page</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Sponsored</p>
        </div>
      </div>
      <p className={cn('px-3 pt-2 pb-2.5 text-xs leading-relaxed line-clamp-3 whitespace-pre-line', !form.primaryText && 'text-muted-foreground/60 italic')}>
        {form.primaryText || 'Primary text appears here'}
      </p>
      <div className="aspect-square bg-secondary flex items-center justify-center">
        {asset ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset} alt="" className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
        ) : (
          <ImageIcon className="w-6 h-6 text-muted-foreground/50" />
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40">
        <div className="min-w-0 flex-1">
          {domain && <p className="text-[9px] uppercase tracking-wide text-muted-foreground truncate">{domain}</p>}
          <p className={cn('text-xs font-semibold truncate', !form.headline && 'text-muted-foreground/60 font-normal italic')}>
            {form.headline || 'Headline'}
          </p>
          {form.adDescription && <p className="text-[10px] text-muted-foreground truncate">{form.adDescription}</p>}
        </div>
        <span className={cn('text-[10px] font-semibold rounded px-2.5 py-1.5 flex-shrink-0',
          cta ? 'bg-secondary border border-border' : 'border border-dashed border-border text-muted-foreground')}>
          {cta ?? 'Button'}
        </span>
      </div>
    </div>
  );
}

/**
 * A real web link, normalised to https — or null.
 *
 * Prefixing https:// onto anything and letting URL parse it accepted junk:
 * "1" becomes https://1, which WHATWG URL reads as the IPv4 shorthand
 * 0.0.0.1. So require a dotted hostname that isn't just digits, which also
 * rules out bare IPs — nobody's inspiration lives at one.
 */
function toWebLink(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    const host = u.hostname;
    if (!host.includes('.')) return null;           // "localhost", "hello"
    if (/^[\d.]+$/.test(host)) return null;         // "1" → 0.0.0.1, raw IPs
    if (!/\.[a-z]{2,}$/i.test(host)) return null;   // needs a real TLD
    return u.toString();
  } catch {
    return null;
  }
}

/** "instagram.com/p/Cx9…" — enough to tell links apart at a glance. */
function shortLink(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    // Keep the query: youtube.com/watch?v=… and ad-library ?id=… links are
    // only distinguishable by it.
    return u.hostname.replace(/^www\./, '') + (path && path !== '/' ? path : '') + u.search;
  } catch {
    return url;
  }
}

/**
 * Any number of links, stored newline-joined in one field so existing
 * single-link briefs keep working.
 *
 * Links render as chips that wrap sideways, and the stack caps its height
 * and scrolls, so adding more never pushes the rest of the brief down the
 * page. Paste adds immediately; Enter or leaving the field adds typed input.
 */
function LinkChips({ value, onChange, placeholder }: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  // Skip anything stored that isn't a real link — including the 0.0.0.N
  // entries the old parser let through. They drop out of storage on the next
  // change, so affected briefs clean themselves up.
  const links = value.split(/\n+/).map((s) => s.trim()).filter((s) => !!toWebLink(s));

  const add = (raw: string) => {
    // Several pasted at once — one per line or space-separated — all land.
    const parts = raw.split(/[\s\n]+/).map((s) => s.trim()).filter(Boolean);
    const valid = parts.map(toWebLink).filter((u): u is string => !!u);
    const rejected = parts.length - valid.length;

    const next = [...links];
    for (const url of valid) if (!next.includes(url)) next.push(url);
    if (next.length !== links.length) onChange(next.join('\n'));

    if (rejected > 0) {
      // Keep what was typed so it can be corrected, rather than losing it.
      setError(valid.length
        ? `Added ${valid.length}; skipped ${rejected} that ${rejected === 1 ? "isn't a" : "aren't"} web link${rejected === 1 ? '' : 's'}.`
        : "That doesn't look like a web link — try something like instagram.com/p/…");
      if (valid.length === 0) setDraft(raw.trim());
      else setDraft('');
    } else {
      setError('');
      setDraft('');
    }
  };

  const remove = (url: string) => onChange(links.filter((l) => l !== url).join('\n'));

  return (
    <div className="min-w-0">
      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5 max-h-[84px] overflow-y-auto [scrollbar-width:thin] px-1 pt-1.5 pb-1">
          {links.map((url) => (
            <span key={url} title={url}
              className="group/chip inline-flex items-center gap-1 max-w-[220px] bg-secondary border border-border rounded-md pl-2 pr-0.5 py-0.5 text-[11px]">
              <a href={url} target="_blank" rel="noreferrer" className="truncate hover:text-primary transition-colors">
                {shortLink(url)}
              </a>
              <button type="button" onClick={() => remove(url)} aria-label={`Remove ${shortLink(url)}`}
                className="p-0.5 rounded text-muted-foreground hover:text-foreground flex-shrink-0">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        value={draft}
        onChange={(e) => { setDraft(e.target.value); if (error) setError(''); }}
        onPaste={(e) => {
          const text = e.clipboardData.getData('text');
          if (text.trim()) { e.preventDefault(); add(text); }
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(draft); } }}
        onBlur={() => { if (draft.trim()) add(draft); }}
        placeholder={links.length ? 'Add another link' : placeholder}
        aria-invalid={!!error}
        className={cn(GHOST, error && 'border-amber-500/60')}
      />
      {error && <p className="text-[11px] text-amber-700 mt-1 px-2">{error}</p>}
    </div>
  );
}

function TagMultiSelect({ selected, onChange, options, placeholder, onCreate, ghost = false }: {
  selected: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder: string;
  onCreate?: (value: string) => void; // fired when a brand-new value is created (e.g. persist to a bank)
  /** Borderless until hover/focus, for compact property rows. */
  ghost?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allOptions = [...new Set([...options, ...selected])];
  const filtered = allOptions.filter(
    (a) => !selected.includes(a) && a.toLowerCase().includes(query.toLowerCase())
  );
  const canCreate = query.trim() && !allOptions.some((a) => a.toLowerCase() === query.trim().toLowerCase());

  const addAngle = (angle: string) => {
    onChange([...selected, angle]);
    setQuery('');
    inputRef.current?.focus();
  };

  const createNew = (value: string) => {
    onCreate?.(value);
    addAngle(value);
  };

  const removeAngle = (angle: string) => {
    onChange(selected.filter((a) => a !== angle));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !query && selected.length > 0) {
      removeAngle(selected[selected.length - 1]);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (canCreate && query.trim()) {
        createNew(query.trim());
      } else if (filtered.length > 0) {
        addAngle(filtered[0]);
      }
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
        className={cn(
          'w-full border flex flex-wrap items-center gap-1 cursor-text transition-colors',
          ghost ? 'min-h-[34px] rounded-md px-1.5 py-1 bg-transparent' : 'min-h-[38px] rounded-lg px-2 py-1.5 bg-background',
          isOpen ? 'border-primary ring-1 ring-primary/30' : ghost ? 'border-transparent hover:border-border' : 'border-border'
        )}
      >
        {selected.map((angle) => (
          <span key={angle}
            className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-md">
            {angle}
            <button type="button" onClick={(e) => { e.stopPropagation(); removeAngle(angle); }}
              className="hover:text-primary/70 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={selected.length === 0 ? placeholder : 'Add more...'}
          className={cn('flex-1 text-sm bg-transparent outline-none py-0.5', ghost ? 'min-w-[56px] placeholder:text-muted-foreground/50' : 'min-w-[100px] placeholder:text-muted-foreground')}
        />
        {!ghost && <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0', isOpen && 'rotate-180')} />}
      </div>

      {isOpen && (filtered.length > 0 || canCreate) && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto py-1">
          {filtered.map((angle) => (
            <button key={angle} type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addAngle(angle)}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2">
              <span className="w-3 h-3 rounded border border-border flex-shrink-0" />
              {angle}
            </button>
          ))}
          {canCreate && (
            <button type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => createNew(query.trim())}
              className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 text-primary">
              <span className="text-xs font-medium">Create</span>
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-md">{query.trim()}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Pick copy from the bank while writing a brief.
 *
 * Ranked against the brief: lines written for this brief's product and angle
 * come first, then winners — so the right copy is at the top without anyone
 * filtering. Searchable once the bank gets long.
 */
function CopyBankPicker({ entries, onPick, brief }: {
  entries: CopyBankEntry[];
  onPick: (value: string) => void;
  brief?: { product?: string; angle?: string };
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  if (entries.length === 0) return null;

  const ranked = rankForBrief(entries, brief ?? {})
    .filter((e) => !q.trim() || e.content.toLowerCase().includes(q.trim().toLowerCase()));
  const isMatch = (e: CopyBankEntry) => {
    const has = (list: string | undefined, v?: string) =>
      !!v && (list ?? '').toLowerCase().split(',').map((s) => s.trim()).includes(v.toLowerCase());
    return has(brief?.product, e.product) || has(brief?.angle, e.angle);
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] text-primary hover:underline">
        From bank <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-80 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
            {entries.length > 5 && (
              <div className="p-2 border-b border-border">
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
                  className="w-full text-xs bg-transparent border border-border rounded-md px-2 py-1.5 focus:outline-none focus:border-primary" />
              </div>
            )}
            <div className="max-h-64 overflow-y-auto py-1">
              {ranked.length === 0 && <p className="text-xs text-muted-foreground px-3 py-3">No matches.</p>}
              {ranked.map((e) => (
                <button key={e.id} type="button"
                  onClick={() => { onPick(e.url || e.content); setOpen(false); setQ(''); }}
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors">
                  <p className="text-xs line-clamp-2">{e.content}</p>
                  {e.url && <p className="text-[10px] text-primary truncate">{e.url}</p>}
                  {(e.winner || e.angle || e.product) && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {e.winner && <Star className="w-3 h-3 fill-primary text-primary" />}
                      {[e.angle, e.product].filter(Boolean).map((t) => (
                        <span key={t} className="text-[9px] text-muted-foreground border border-border rounded px-1.5">{t}</span>
                      ))}
                      {isMatch(e) && <span className="text-[9px] text-primary font-medium">For this brief</span>}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  roadmapId: string;
  editItem?: RoadmapItem | null;
}

const EMPTY = {
  adName: '', adFormat: 'static' as AdFormat, adSize: '1:1', angle: '', concept: '',
  description: '', primaryText: '', headline: '', adDescription: '',
  inspirationLink: '', creativeLink: '', frameioLink: '', landingPage: '',
  referenceCreative: '', finalDeliverable: '',
  product: '', productCategory: '', assignee: '', dueDate: '', adLength: '',
  // Meta launch config — ads launch into EXISTING campaigns/ad sets
  metaCampaignId: '', metaAdSetId: '', metaCTA: '',
};

export function BriefDrawer({ open, onClose, roadmapId, editItem }: Props) {
  const addItem = useAppStore((s) => s.addItem);
  const updateItem = useAppStore((s) => s.updateItem);
  const namingConvention = useAppStore((s) => s.namingConvention);
  const currentAccount = useAppStore((s) => s.currentAccount)();
  const updateItemStatus = useAppStore((s) => s.updateItemStatus);
  const copyBank = useAppStore((s) => s.copyBank);
  const addCopyEntry = useAppStore((s) => s.addCopyEntry);
  const bankAngles = copyBank.filter((c) => c.type === 'angle').map((c) => c.content);
  const bankProducts = copyBank.filter((c) => c.type === 'product').map((c) => c.content);
  // Saved copy the Ad Copy tab can pull from.
  const bankPrimary = copyBank.filter((c) => c.type === 'primary_text' || c.type === 'hook');
  const bankHeadlines = copyBank.filter((c) => c.type === 'headline');
  const bankDescriptions = copyBank.filter((c) => c.type === 'description');
  const bankLandingPages = copyBank.filter((c) => c.type === 'landing_page');
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [tab, setTab] = useState<'brief' | 'copy' | 'launch'>('brief');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const customVars = getBriefVariables(namingConvention);
  const [metaConfigured, setMetaConfigured] = useState<boolean | null>(null);
  const [metaAccount, setMetaAccount] = useState<string | null>(null);
  const [adSets, setAdSets] = useState<{ id: string; name: string; status: string; campaignId: string; campaignName: string }[]>([]);
  const [adSetsLoading, setAdSetsLoading] = useState(false);
  const [adSetsError, setAdSetsError] = useState('');
  const [adSetsNonce, setAdSetsNonce] = useState(0);
  const adSetsFetched = useRef(false);
  const scrollRef = useRef<HTMLFormElement>(null);
  const [dupOpen, setDupOpen] = useState(false);
  const [dupName, setDupName] = useState('');
  const [dupState, setDupState] = useState<'idle' | 'working'>('idle');
  // Suggestions for the Owner field — typing a name still works if the team
  // call fails or Supabase isn't configured.
  const [teamOwners, setTeamOwners] = useState<string[]>([]);
  useEffect(() => {
    if (!open) return;
    fetch('/api/team')
      .then((r) => r.json())
      .then((d) => {
        const names = (d?.members ?? [])
          .map((m: { name?: string; email?: string }) => m.name || m.email || '')
          .filter(Boolean);
        setTeamOwners(names);
      })
      .catch(() => {});
  }, [open]);

  const [campaignCount, setCampaignCount] = useState<number | null>(null);
  const [adAccountId, setAdAccountId] = useState<string | null>(null);
  const [launchState, setLaunchState] = useState<'idle' | 'launching' | 'done' | 'error'>('idle');
  const [launchError, setLaunchError] = useState('');
  // Once the user types their own ad name we stop auto-generating it.
  const [nameEdited, setNameEdited] = useState(false);
  const [nameIndex, setNameIndex] = useState(1);

  useEffect(() => {
    if (open && tab === 'launch' && metaConfigured === null) {
      fetch('/api/meta/status')
        .then((r) => r.json())
        .then((d) => { setMetaConfigured(!!d.configured); setMetaAccount(d.adAccountId || null); })
        .catch(() => setMetaConfigured(false));
    }
  }, [open, tab, metaConfigured]);

  // Load existing campaigns/ad sets for the launch selector.
  // Guarded by a ref, not by adSets.length: an account with no ad sets (or a
  // failing request) leaves the list empty, and keying off that re-fired the
  // fetch forever.
  useEffect(() => {
    if (!open) { adSetsFetched.current = false; return; }
    if (tab !== 'launch' || !metaConfigured || adSetsFetched.current) return;

    adSetsFetched.current = true; // set before awaiting so this can't re-enter
    setAdSetsLoading(true);
    setAdSetsError('');
    fetch('/api/meta/adsets')
      .then((r) => r.json())
      .then((d) => {
        setAdSets(d.adsets || []);
        setCampaignCount(typeof d.campaignCount === 'number' ? d.campaignCount : null);
        setAdAccountId(d.adAccountId || null);
        if (d.error) setAdSetsError(d.error);
      })
      .catch(() => setAdSetsError('Could not reach Meta. Check the connection and try again.'))
      .finally(() => setAdSetsLoading(false));
  }, [open, tab, metaConfigured, adSetsNonce]);

  const reloadAdSets = () => {
    adSetsFetched.current = false;
    setAdSets([]);
    setAdSetsError('');
    setAdSetsNonce((n) => n + 1);
  };

  // Duplicate the selected ad set so a creative batch gets its own paused
  // ad set, without anyone rebuilding targeting by hand.
  const duplicateAdSet = async () => {
    if (!form.metaAdSetId) return;
    setDupState('working');
    setAdSetsError('');
    try {
      const res = await fetch('/api/meta/adsets/duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adSetId: form.metaAdSetId, name: dupName.trim() || undefined }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Could not duplicate the ad set.');

      // Reload the list, then select the copy we just made.
      const listed = await fetch('/api/meta/adsets').then((r) => r.json());
      setAdSets(listed.adsets || []);
      set('metaAdSetId', d.adSetId);
      setDupOpen(false);
      setDupName('');
      setDupState('idle');
    } catch (err) {
      setAdSetsError(err instanceof Error ? err.message : 'Could not duplicate the ad set.');
      setDupState('idle');
    }
  };

  useEffect(() => {
    if (editItem) {
      setForm({
        adName: editItem.adName || '',
        adFormat: editItem.adFormat || 'static',
        adSize: editItem.adSize || '1:1',
        angle: editItem.angle || '',
        concept: editItem.concept || '',
        description: editItem.description || '',
        primaryText: editItem.primaryText || '',
        headline: editItem.headline || '',
        adDescription: editItem.adDescription || '',
        // Reference asset was folded into Inspiration & assets: both were
        // links handed to the designer. Carry any saved one across so it
        // isn't lost, and clear the old field so it isn't counted twice.
        inspirationLink: [editItem.inspirationLink, editItem.referenceCreative]
          .filter((v) => v && v.trim()).join('\n'),
        creativeLink: editItem.creativeLink || '',
        frameioLink: editItem.frameioLink || '',
        referenceCreative: '',
        finalDeliverable: editItem.finalDeliverable || '',
        landingPage: editItem.landingPage || '',
        product: editItem.product || '',
        productCategory: editItem.productCategory || '',
        assignee: editItem.assignee || '',
        dueDate: editItem.dueDate || '',
        adLength: editItem.adLength || '',
        metaCampaignId: editItem.metaCampaignId || '',
        metaAdSetId: editItem.metaAdSetId || '',
        metaCTA: editItem.metaCTA || '',
      });
    } else {
      setForm({ ...EMPTY });
    }
    // Hydrate from the item — without this, values carried over from whichever
    // brief was opened before.
    setCustomValues(editItem?.variables ?? {});
    setTab('brief');
    // Only an explicitly hand-written name stops the rebuild. Treating any
    // existing name as custom meant editing a saved brief never updated it.
    setNameEdited(!!editItem?.adNameCustom);
    // Reuse the saved index so reopening a brief doesn't renumber the ad.
    setNameIndex(editItem?.nameIndex ?? Math.floor(Math.random() * 99) + 1);
  }, [editItem, open]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const setCustom = (key: string, val: string) => setCustomValues((cv) => ({ ...cv, [key]: val }));

  const buildName = (source: typeof form) => applyNamingConvention(namingConvention, source, {
    brand: currentAccount?.name?.slice(0, 3) || 'BRD',
    index: nameIndex,
    customValues,
  });

  const generateName = () => {
    setNameEdited(false);
    set('adName', buildName(form));
  };

  // Build the ad name progressively as the brief is filled in, unless the user
  // has typed their own name — then we leave it alone.
  // Keep this above the `!open` return: every hook must run on every render.
  useEffect(() => {
    if (!open || nameEdited) return;
    const next = buildName(form);
    if (next && next !== form.adName) setForm((f) => ({ ...f, adName: next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // landingPage is in here because {lp} now reads it — without it, changing
    // the landing page in Ad Setup left the name stale.
  }, [open, nameEdited, form.adFormat, form.adSize, form.angle, form.concept, form.product, form.productCategory, form.landingPage, customValues]);

  // Each step opens at the top. The steps share one scroll container, so
  // moving on kept the previous step's scroll position and dropped you
  // halfway down the next one. Above the early return: hooks must run on
  // every render.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  if (!open) return null;

  // Creative assets: one URL for a normal ad, 2–10 lines for a carousel.
  const assetUrls = (form.creativeLink || '')
    .split(/[\n,]+/).map((s) => s.trim()).filter((s) => /^https?:\/\//i.test(s));
  const assetCount = assetUrls.length;
  const previewAsset = assetUrls[0];
  const creativeReady = form.adFormat === 'carousel'
    ? assetCount >= 2 && assetCount <= 10
    : assetCount >= 1;

  // Ad sizes are multi-select, stored comma-joined
  const selectedSizes = form.adSize ? form.adSize.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const toggleSize = (size: string) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    set('adSize', next.join(', '));
  };

  // Launch readiness — the ad set owns budget/targeting/schedule; we only need the creative + destination
  const readiness = [
    { label: 'Approved status', ok: editItem?.status === 'ready_to_launch' },
    { label: 'Meta connected', ok: !!metaConfigured },
    { label: 'Campaign & ad set selected', ok: !!form.metaAdSetId },
    { label: 'Primary text + headline', ok: !!form.primaryText && !!form.headline },
    { label: 'Landing page + CTA', ok: !!form.landingPage && !!form.metaCTA },
    { label: form.adFormat === 'carousel' ? 'Carousel cards (2-10)' : 'Creative asset', ok: creativeReady },
  ];
  const launchReady = readiness.every((r) => r.ok);

  // The guided flow. Each step lists what it still needs, in the order
  // someone would fill it in, so the header and footer can say exactly
  // what's left instead of leaving people to scan a long form.
  const STEPS = [
    { id: 'brief' as const, label: 'Brief', hint: 'What we’re making', doneHint: 'Briefed' },
    { id: 'copy' as const, label: 'Ad Setup', hint: 'Copy and destination', doneHint: 'Copy ready' },
    { id: 'launch' as const, label: 'Launch', hint: 'Pick where it runs', doneHint: 'Ready to push' },
  ];
  const missingFor = {
    brief: [
      !form.concept && 'concept',
      !form.adFormat && 'format',
      !creativeReady && (form.adFormat === 'carousel' ? '2–10 cards' : 'creative'),
    ].filter(Boolean) as string[],
    copy: [
      !form.primaryText && 'primary text',
      !form.headline && 'headline',
      !form.landingPage && 'landing page',
      !form.metaCTA && 'CTA',
    ].filter(Boolean) as string[],
    launch: [
      !form.metaAdSetId && 'campaign & ad set',
      editItem?.status !== 'ready_to_launch' && editItem?.status !== 'launched' && 'approval',
    ].filter(Boolean) as string[],
  };
  const stepState = {
    brief: { missing: missingFor.brief, done: missingFor.brief.length === 0 },
    copy: { missing: missingFor.copy, done: missingFor.copy.length === 0 },
    launch: { missing: missingFor.launch, done: missingFor.launch.length === 0 },
  };
  const stepIndex = STEPS.findIndex((s) => s.id === tab);

  const handlePush = async () => {
    if (!editItem) return;
    setLaunchState('launching');
    setLaunchError('');
    // Persist the latest form first so config isn't lost.
    updateItem(roadmapId, editItem.id, form as Partial<RoadmapItem>);
    try {
      const res = await fetch('/api/meta/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adName: form.adName,
          primaryText: form.primaryText,
          headline: form.headline,
          adDescription: form.adDescription,
          landingPage: form.landingPage,
          creativeLink: form.creativeLink,
          adFormat: form.adFormat,
          metaCTA: form.metaCTA,
          metaAdSetId: form.metaAdSetId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Push failed.');
      updateItem(roadmapId, editItem.id, { metaAdId: data.adId });
      updateItemStatus(roadmapId, editItem.id, 'launched');
      setLaunchState('done');
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Push failed.');
      setLaunchState('error');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // customValues was component state only — variable values were lost on
    // close, so reopening a brief regenerated a different ad name.
    const payload = {
      ...form,
      variables: customValues,
      adNameCustom: nameEdited,
      nameIndex,
    } as Partial<RoadmapItem>;
    if (editItem) {
      updateItem(roadmapId, editItem.id, payload);
    } else {
      addItem(roadmapId, { ...payload, status: 'idea' } as Parameters<typeof addItem>[1]);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-semibold">{editItem ? 'Edit Brief' : 'New Creative Brief'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Steps — ordered, with what each one still needs, so the brief reads
            as a route to a launchable ad rather than three piles of fields. */}
        <div className="flex border-b border-border">
          {STEPS.map((s, i) => {
            const active = tab === s.id;
            const done = stepState[s.id].done;
            return (
              <button key={s.id} type="button" onClick={() => setTab(s.id)}
                className={cn(
                  'flex-1 px-3 py-2.5 border-b-2 -mb-px transition-colors text-left',
                  active ? 'border-primary' : 'border-transparent hover:bg-muted/40',
                )}>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0',
                    done ? 'bg-primary text-white' : active ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
                  )}>
                    {done ? <Check className="w-2.5 h-2.5" /> : i + 1}
                  </span>
                  <span className={cn('text-xs font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>
                    {s.label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate pl-5.5">
                  {done ? s.doneHint : stepState[s.id].missing[0] ?? s.hint}
                </p>
              </button>
            );
          })}
        </div>

        <form ref={scrollRef} onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className={tab === 'launch' ? 'px-6 py-5 space-y-4 max-w-3xl mx-auto w-full' : ''}>
            {tab === 'brief' && (
              // Document on the left — what a designer reads. Properties on the
              // right — what a planner sets. Splitting them is what makes the
              // brief scannable: the idea isn't buried among sixteen equal boxes.
              <div className="grid md:grid-cols-[minmax(0,1fr)_304px] md:divide-x divide-border min-h-full">
                {/* ── Document ── */}
                <div className="px-7 py-6 space-y-6 min-w-0">
                  {/* Ad name — first, as metadata rather than a headline */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex-shrink-0">Ad name</span>
                    <input value={form.adName}
                      onChange={(e) => { setNameEdited(true); set('adName', e.target.value); }}
                      placeholder="Builds as you fill in the brief"
                      title={nameEdited ? 'Custom name — rebuild to follow your naming convention' : 'Building from your naming convention'}
                      className="flex-1 min-w-0 font-mono text-xs bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none py-1 truncate transition-colors"
                    />
                    {nameEdited && (
                      <button type="button" onClick={generateName}
                        title="Rebuild from naming convention" aria-label="Rebuild ad name"
                        className="p-1 rounded text-muted-foreground hover:text-primary transition-colors flex-shrink-0">
                        <Wand2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button type="button"
                      onClick={() => { if (form.adName) navigator.clipboard.writeText(form.adName); }}
                      title="Copy ad name" aria-label="Copy ad name"
                      className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                      <CopyIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Concept is the brief's headline */}
                  <div>
                    <input value={form.concept} onChange={(e) => set('concept', e.target.value)}
                      placeholder="What&rsquo;s the idea?"
                      autoFocus={!editItem}
                      className="w-full text-2xl font-semibold tracking-tight bg-transparent focus:outline-none placeholder:text-muted-foreground/40"
                    />
                    <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                      placeholder="Describe what the designer should make — the hook, the look and feel, anything to avoid."
                      rows={4}
                      className="w-full mt-3 text-sm leading-relaxed bg-transparent resize-none focus:outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>

                  {/* The asset */}
                  <section>
                    <h3 className="text-xs font-semibold mb-2">
                      Creative
                      {form.adFormat === 'carousel' && (
                        <span className="font-normal text-muted-foreground">
                          {' '}· {assetCount === 0 ? '2–10 cards' : `${assetCount} card${assetCount !== 1 ? 's' : ''}${assetCount < 2 ? ', needs 2+' : ''}`}
                        </span>
                      )}
                    </h3>
                    <CreativeInput
                      value={form.creativeLink}
                      onChange={(v) => set('creativeLink', v)}
                      multiple={form.adFormat === 'carousel'}
                    />
                  </section>

                  {/* References — always open; they're part of the brief */}
                  <section className="border-t border-border pt-4">
                    <h3 className="text-xs font-semibold mb-3">References</h3>
                    <div className="space-y-2">
                      {/* Inspiration takes any number of links, shown as chips
                          that wrap sideways — ten links is two short rows, not
                          ten full-width inputs. */}
                      <div className="grid grid-cols-[120px_minmax(0,1fr)] items-start gap-2">
                        <span className="text-xs text-muted-foreground pt-2 leading-tight">Inspiration &amp; assets</span>
                        <LinkChips value={form.inspirationLink} onChange={(v) => set('inspirationLink', v)}
                          placeholder="Ads to riff on, product shots, logos…" />
                      </div>
                      {([
                        ['frameioLink', 'Review link', 'Frame.io, Figma or any review link'],
                        ['finalDeliverable', 'Final deliverable', 'Finished asset link'],
                      ] as const).map(([key, label, ph]) => (
                        <div key={key} className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-2">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <input value={form[key]} onChange={(e) => set(key, e.target.value)}
                            placeholder={ph} className={GHOST} />
                          {form[key] ? (
                            <a href={form[key]} target="_blank" rel="noreferrer" title="Open" aria-label={`Open ${label}`}
                              className="p-1 rounded text-muted-foreground hover:text-primary transition-colors">
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : <span className="w-[22px]" />}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                {/* ── Properties ── */}
                <aside className="px-4 py-6 bg-muted/20 space-y-0.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Properties</p>

                  <Prop label="Format">
                    <select value={form.adFormat} onChange={(e) => set('adFormat', e.target.value)}
                      className={cn(GHOST, 'capitalize')}>
                      {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Prop>

                  <Prop label="Size">
                    <div className="flex flex-wrap gap-1 px-1 py-1">
                      {SIZE_OPTIONS.map((s) => (
                        <button type="button" key={s} onClick={() => toggleSize(s)}
                          className={cn('text-[11px] px-1.5 py-0.5 rounded border transition-colors',
                            selectedSizes.includes(s)
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'border-border text-muted-foreground hover:border-primary/40')}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </Prop>

                  {(form.adFormat === 'video' || form.adFormat === 'ugc') && (
                    <Prop label="Length">
                      <select value={form.adLength} onChange={(e) => set('adLength', e.target.value)} className={GHOST}>
                        <option value="">—</option>
                        {['0:06', '0:15', '0:30', '0:45', '1:00', '1:30', '2:00+'].map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </Prop>
                  )}

                  <Prop label="Angle">
                    <TagMultiSelect ghost
                      selected={form.angle ? form.angle.split(', ').filter(Boolean) : []}
                      onChange={(angles) => set('angle', angles.join(', '))}
                      options={[...new Set([...DEFAULT_ANGLES, ...bankAngles])]}
                      placeholder="Add angle"
                      onCreate={(v) => addCopyEntry({ type: 'angle', content: v, tags: [] })}
                    />
                  </Prop>

                  <Prop label="Product">
                    <TagMultiSelect ghost
                      selected={form.product ? form.product.split(', ').filter(Boolean) : []}
                      onChange={(products) => set('product', products.join(', '))}
                      options={bankProducts}
                      placeholder="Add product"
                      onCreate={(v) => addCopyEntry({ type: 'product', content: v, tags: [] })}
                    />
                  </Prop>

                  <Prop label="Category">
                    <input value={form.productCategory} onChange={(e) => set('productCategory', e.target.value)}
                      placeholder="—" className={GHOST} />
                  </Prop>

                  {/* Naming variables the formula uses, if any */}
                  {customVars.map((v) => {
                    const options = (v.values ?? []).filter((o) => o.match.trim());
                    return (
                      <Prop key={v.key} label={v.label}>
                        {options.length > 0 ? (
                          <select value={customValues[v.key] || ''} onChange={(e) => setCustom(v.key, e.target.value)} className={GHOST}>
                            <option value="">—</option>
                            {options.map((opt) => <option key={opt.match} value={opt.match}>{opt.match}</option>)}
                          </select>
                        ) : (
                          <input value={customValues[v.key] || ''} onChange={(e) => setCustom(v.key, e.target.value)}
                            placeholder="—" className={GHOST} />
                        )}
                      </Prop>
                    );
                  })}

                  <div className="border-t border-border !my-3" />

                  <Prop label="Owner">
                    <input value={form.assignee} onChange={(e) => set('assignee', e.target.value)}
                      list="brief-owners" placeholder="Unassigned" className={GHOST} />
                    <datalist id="brief-owners">
                      {teamOwners.map((o) => <option key={o} value={o} />)}
                    </datalist>
                  </Prop>

                  <Prop label="Due">
                    <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)}
                      // Native date inputs ignore placeholder styling; mute the
                      // empty state to match the other properties.
                      className={cn(GHOST, !form.dueDate && 'text-muted-foreground/50')} />
                  </Prop>
                </aside>
              </div>
            )}

            {tab === 'copy' && (
              // Writing on the left, the ad itself on the right, updating as
              // you type — so copy is judged in the format it'll actually run.
              <div className="grid md:grid-cols-[minmax(0,1fr)_340px] md:divide-x divide-border min-h-full">
                <div className="px-7 py-6 space-y-5 min-w-0">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold">Primary text</label>
                      <div className="flex items-center gap-2">
                        <Count n={form.primaryText.length} max={125} />
                        <CopyBankPicker brief={{ product: form.product, angle: form.angle }} entries={bankPrimary} onPick={(v) => set('primaryText', v)} />
                      </div>
                    </div>
                    <textarea value={form.primaryText} onChange={(e) => set('primaryText', e.target.value)}
                      placeholder="The main body copy — what someone reads before they decide to stop scrolling."
                      rows={5} className={cn(FIELD, 'resize-none leading-relaxed')} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold">Headline</label>
                      <div className="flex items-center gap-2">
                        <Count n={form.headline.length} max={40} />
                        <CopyBankPicker brief={{ product: form.product, angle: form.angle }} entries={bankHeadlines} onPick={(v) => set('headline', v)} />
                      </div>
                    </div>
                    <input value={form.headline} onChange={(e) => set('headline', e.target.value)}
                      placeholder="Short and punchy" className={FIELD} />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold">
                        Description <span className="font-normal text-muted-foreground">optional</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <Count n={form.adDescription.length} max={30} />
                        <CopyBankPicker brief={{ product: form.product, angle: form.angle }} entries={bankDescriptions} onPick={(v) => set('adDescription', v)} />
                      </div>
                    </div>
                    <input value={form.adDescription} onChange={(e) => set('adDescription', e.target.value)}
                      placeholder="Shown under the headline" className={FIELD} />
                  </div>

                  <div className="border-t border-border pt-5 grid grid-cols-[minmax(0,1fr)_200px] gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold">Landing page</label>
                        <CopyBankPicker entries={bankLandingPages} onPick={(v) => set('landingPage', v)} />
                      </div>
                      <input value={form.landingPage} onChange={(e) => set('landingPage', e.target.value)}
                        placeholder="https://brand.com/product" className={FIELD} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1.5">Button</label>
                      <select value={form.metaCTA} onChange={(e) => set('metaCTA', e.target.value)} className={FIELD}>
                        <option value="">Choose…</option>
                        {META_CTAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <aside className="px-5 py-6 bg-muted/20">
                  <div className="md:sticky md:top-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Preview</p>
                    <AdPreview form={form} asset={previewAsset} />
                    <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                      Approximate Facebook feed layout. Meta adjusts it per placement.
                    </p>
                  </div>
                </aside>
              </div>
            )}

            {tab === 'launch' && (
              <>
                <div className="bg-secondary/60 border border-border rounded-lg p-4">
                  <p className="text-xs font-medium mb-1">Meta Launch Setup</p>
                  <p className="text-xs text-muted-foreground">
                    Pick the existing campaign and ad set to launch this creative into. Budget, targeting, schedule and placements are owned by the ad set — we only create the ad (paused).
                  </p>
                  {metaConfigured && metaAccount && (
                    <p className="text-[11px] text-primary font-mono mt-2">Pushing to {metaAccount}</p>
                  )}
                </div>

                {/* ── Destination: existing campaign + ad set ── */}
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Launch Into</p>
                {!metaConfigured ? (
                  <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2.5">
                    Connect Meta in Settings → Integrations to load your campaigns and ad sets.
                  </p>
                ) : adSetsLoading ? (
                  <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2.5">Loading campaigns…</p>
                ) : adSetsError ? (
                  <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                    <div className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs text-red-600 font-medium">Couldn&apos;t load campaigns</p>
                        <p className="text-[11px] text-red-600/80 mt-0.5 break-words">{adSetsError}</p>
                      </div>
                    </div>
                    <button type="button" onClick={reloadAdSets}
                      className="text-[11px] text-red-700 underline mt-2 hover:no-underline">
                      Try again
                    </button>
                  </div>
                ) : adSets.length === 0 ? (
                  <div className="bg-muted/50 border border-border rounded-lg px-3 py-2.5">
                    <p className="text-xs text-muted-foreground">
                      {campaignCount === 0
                        ? 'This ad account has no campaigns yet. Build the first campaign and ad set in Ads Manager — after that you can duplicate it from here.'
                        : campaignCount && campaignCount > 0
                          ? `Found ${campaignCount} campaign${campaignCount === 1 ? '' : 's'} but no ad sets. Add an ad set in Ads Manager — it owns budget, targeting and schedule.`
                          : 'No ad sets found in this account — create a campaign & ad set in Ads Manager first.'}
                    </p>
                    {adAccountId && (
                      <p className="text-[11px] text-muted-foreground/70 mt-1 font-mono">{adAccountId}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <button type="button" onClick={reloadAdSets}
                        className="text-[11px] text-primary underline hover:no-underline">
                        Refresh
                      </button>
                      <a href="https://adsmanager.facebook.com/adsmanager" target="_blank" rel="noreferrer"
                        className="text-[11px] text-primary underline hover:no-underline">
                        Open Ads Manager
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Campaign</label>
                      <select value={form.metaCampaignId}
                        onChange={(e) => { set('metaCampaignId', e.target.value); set('metaAdSetId', ''); }}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="">Select campaign…</option>
                        {[...new Map(adSets.map((a) => [a.campaignId, a.campaignName])).entries()].map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium block mb-1.5">Ad Set</label>
                      <select value={form.metaAdSetId}
                        onChange={(e) => set('metaAdSetId', e.target.value)}
                        disabled={!form.metaCampaignId}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50">
                        <option value="">{form.metaCampaignId ? 'Select ad set…' : 'Pick a campaign first'}</option>
                        {adSets.filter((a) => a.campaignId === form.metaCampaignId).map((a) => (
                          <option key={a.id} value={a.id}>{a.name}{a.status !== 'ACTIVE' ? ` (${a.status.toLowerCase()})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Give a creative batch its own ad set without rebuilding targeting */}
                {metaConfigured && !adSetsLoading && form.metaAdSetId && (
                  dupOpen ? (
                    <div className="border border-border rounded-lg px-3 py-2.5 bg-muted/30 space-y-2">
                      <p className="text-[11px] text-muted-foreground">
                        Copies targeting, budget, placements and schedule from the selected ad set.
                        The copy is created <span className="font-medium">paused</span> and empty.
                      </p>
                      <input value={dupName} onChange={(e) => setDupName(e.target.value)}
                        placeholder="Name for the new ad set (optional)"
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setDupOpen(false); setDupName(''); }}
                          disabled={dupState === 'working'}
                          className="flex-1 border border-border rounded-lg py-1.5 text-xs hover:bg-secondary transition-colors disabled:opacity-40">
                          Cancel
                        </button>
                        <button type="button" onClick={duplicateAdSet} disabled={dupState === 'working'}
                          className="flex-1 bg-primary text-white rounded-lg py-1.5 text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5">
                          {dupState === 'working' ? (
                            <>
                              <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              Duplicating…
                            </>
                          ) : 'Create paused copy'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setDupOpen(true)}
                      className="text-[11px] text-primary hover:underline">
                      + Duplicate this ad set for a new batch
                    </button>
                  )
                )}

                {/* What will go live — the same preview as Ad Setup, read-only.
                    Copy, landing page and button are edited there, once. */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preview</p>
                  <div className="max-w-sm">
                    <AdPreview form={form} asset={previewAsset} />
                  </div>
                  {(!form.landingPage || !form.metaCTA || !form.primaryText || !form.headline) && (
                    <button type="button" onClick={() => setTab('copy')}
                      className="text-[11px] text-primary mt-2 hover:underline">
                      Finish the copy in Ad Setup →
                    </button>
                  )}
                </div>

                {/* ── Readiness checklist ── */}
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium">Launch Readiness</p>
                    <span className={cn('text-[10px] font-medium rounded-full px-2 py-0.5 border',
                      metaConfigured
                        ? 'bg-primary/5 border-primary/20 text-primary'
                        : 'bg-secondary border-border text-muted-foreground')}>
                      {metaConfigured === null ? 'Checking…' : metaConfigured ? 'Meta connected' : 'Meta not connected'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-4">
                    {readiness.map((r) => (
                      <div key={r.label} className="flex items-center gap-1.5">
                        {r.ok
                          ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          : <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                        <span className={cn('text-[11px]', r.ok ? 'text-foreground' : 'text-muted-foreground')}>{r.label}</span>
                      </div>
                    ))}
                  </div>

                  {launchState === 'error' && (
                    <div className="flex items-start gap-1.5 text-[11px] text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>{launchError}</span>
                    </div>
                  )}

                  {editItem?.metaAdId || launchState === 'done' ? (
                    <div className="flex items-center gap-2 text-primary text-xs font-medium justify-center py-2">
                      <Check className="w-4 h-4" />
                      Pushed to Meta (paused){editItem?.metaAdId ? ` · ${editItem.metaAdId}` : ''}
                    </div>
                  ) : (
                    <button type="button"
                      onClick={handlePush}
                      disabled={!launchReady || !metaConfigured || launchState === 'launching'}
                      title={!metaConfigured ? 'Connect Meta in your environment variables' : launchReady ? 'Create a paused ad on Meta' : 'Complete the checklist to enable'}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-medium py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      {launchState === 'launching' ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Pushing…
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" /> Push to Meta
                        </>
                      )}
                    </button>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-2 text-center">
                    {metaConfigured
                      ? 'Creates a PAUSED ad inside the ad set you picked — activate it in Ads Manager.'
                      : 'Connect Meta in Settings → Integrations to enable real pushes.'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer — what's left on this step, then a way forward */}
          <div className="sticky bottom-0 border-t border-border bg-card">
            {stepState[tab].missing.length > 0 && (
              <p className="px-6 pt-3 text-[11px] text-muted-foreground">
                Still needed here: <span className="text-foreground">{stepState[tab].missing.join(', ')}</span>
              </p>
            )}
            <div className="px-6 py-4 flex items-center gap-3">
              {stepIndex > 0 ? (
                <button type="button" onClick={() => setTab(STEPS[stepIndex - 1].id)}
                  className="border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary transition-colors">
                  Back
                </button>
              ) : (
                <button type="button" onClick={onClose}
                  className="border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary transition-colors">
                  Cancel
                </button>
              )}

              <div className="flex-1" />

              <button type="submit"
                className={cn(
                  'rounded-lg px-4 py-2 text-sm transition-colors',
                  stepIndex === STEPS.length - 1
                    ? 'flex-1 bg-primary text-white font-medium hover:bg-primary/90'
                    : 'border border-border hover:bg-secondary',
                )}>
                {editItem ? 'Save Changes' : 'Save Brief'}
              </button>

              {stepIndex < STEPS.length - 1 && (
                <button type="button" onClick={() => setTab(STEPS[stepIndex + 1].id)}
                  className="flex items-center gap-1.5 bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
                  Next: {STEPS[stepIndex + 1].label}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
