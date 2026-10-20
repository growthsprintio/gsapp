'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { applyNamingConvention, getBriefVariables } from '@/lib/utils';
import {
  FORMAT_OPTIONS, SIZE_OPTIONS, type RoadmapItem, type AdFormat,
  META_CTAS,
} from '@/lib/types';
import { X, Wand2, ExternalLink, ChevronDown, Search, Check, AlertCircle, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef } from 'react';
import { CreativeInput } from '@/components/asset-drop';

const DEFAULT_ANGLES = ['Pain Point', 'Social Proof', 'Hook', 'Curiosity', 'Urgency', 'Lifestyle', 'Before/After', 'Tutorial', 'Comparison', 'Testimonial', 'UGC Raw', 'Founder Story'];

function TagMultiSelect({ selected, onChange, options, placeholder, onCreate }: {
  selected: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder: string;
  onCreate?: (value: string) => void; // fired when a brand-new value is created (e.g. persist to a bank)
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
          'min-h-[38px] w-full border rounded-lg px-2 py-1.5 flex flex-wrap items-center gap-1 cursor-text bg-background transition-colors',
          isOpen ? 'border-primary ring-1 ring-primary/30' : 'border-border'
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
          className="flex-1 min-w-[100px] text-sm bg-transparent outline-none placeholder:text-muted-foreground py-0.5"
        />
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform flex-shrink-0', isOpen && 'rotate-180')} />
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

/** Small "Use from bank" dropdown that drops a saved entry into a copy field. */
function CopyBankPicker({ entries, onPick }: {
  entries: { id: string; content: string; url?: string; tags: string[] }[];
  onPick: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[11px] text-primary hover:underline">
        Use from bank <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-72 bg-card border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto py-1">
            {entries.map((e) => (
              <button key={e.id} type="button"
                onClick={() => { onPick(e.url || e.content); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-muted transition-colors">
                <p className="text-xs line-clamp-2">{e.content}</p>
                {e.url && <p className="text-[10px] text-primary truncate">{e.url}</p>}
                {e.tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {e.tags.slice(0, 3).map((t) => (
                      <span key={t} className="text-[9px] text-muted-foreground border border-border rounded-full px-1.5">{t}</span>
                    ))}
                  </div>
                )}
              </button>
            ))}
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
        inspirationLink: editItem.inspirationLink || '',
        creativeLink: editItem.creativeLink || '',
        frameioLink: editItem.frameioLink || '',
        referenceCreative: editItem.referenceCreative || '',
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
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
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
          <div className="px-6 py-5 space-y-4">
            {tab === 'brief' && (
              <>
                {/* Format + Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Ad Format *</label>
                    <select value={form.adFormat} onChange={(e) => set('adFormat', e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary capitalize">
                      {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Ad Size <span className="text-muted-foreground font-normal">(multi)</span></label>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {SIZE_OPTIONS.map((s) => (
                        <button type="button" key={s} onClick={() => toggleSize(s)}
                          className={cn('text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                            selectedSizes.includes(s)
                              ? 'border-primary bg-primary/5 text-primary font-medium'
                              : 'border-border text-muted-foreground hover:border-primary/30')}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Angle — multi-select, backed by the Angle bank */}
                <div>
                  <label className="text-xs font-medium block mb-1.5">Creative Angle</label>
                  <TagMultiSelect
                    selected={form.angle ? form.angle.split(', ').filter(Boolean) : []}
                    onChange={(angles) => set('angle', angles.join(', '))}
                    options={[...new Set([...DEFAULT_ANGLES, ...bankAngles])]}
                    placeholder="Search or create angles..."
                    onCreate={(v) => addCopyEntry({ type: 'angle', content: v, tags: [] })}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">New angles are saved to your Angle bank in Copy Bank.</p>
                </div>

                {/* Concept */}
                <div>
                  <label className="text-xs font-medium block mb-1.5">Concept</label>
                  <input value={form.concept} onChange={(e) => set('concept', e.target.value)}
                    placeholder="One-line concept summary"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-medium block mb-1.5">Creative Direction</label>
                  <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                    placeholder="Detailed creative direction, references, notes..."
                    rows={3}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                {/* Product (multi, backed by Product bank) + Due Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Product <span className="text-muted-foreground font-normal">(multi)</span></label>
                    <TagMultiSelect
                      selected={form.product ? form.product.split(', ').filter(Boolean) : []}
                      onChange={(products) => set('product', products.join(', '))}
                      options={bankProducts}
                      placeholder="Select or add products..."
                      onCreate={(v) => addCopyEntry({ type: 'product', content: v, tags: [] })}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">First product is used in the ad name.</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Product Category</label>
                    <input value={form.productCategory} onChange={(e) => set('productCategory', e.target.value)}
                      placeholder="e.g. grooming"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">Available as <span className="font-mono">{'{pc}'}</span> in ad names.</p>
                  </div>
                </div>

                {/* Due Date pairs with Ad Length when the format has one, so it
                    isn't left sitting alone at half width. */}
                <div className="grid grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Owner</label>
                    <input value={form.assignee} onChange={(e) => set('assignee', e.target.value)}
                      list="brief-owners"
                      placeholder="Who's making this?"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {/* The roadmap table has shown an Owner column all along,
                        but nothing ever set it — every row read "Unassigned". */}
                    <datalist id="brief-owners">
                      {teamOwners.map((o) => <option key={o} value={o} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Due Date</label>
                    <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {(form.adFormat === 'video' || form.adFormat === 'ugc') && (
                    <div>
                      <label className="text-xs font-medium block mb-1.5">
                        Ad Length <span className="text-muted-foreground font-normal">(optional)</span>
                      </label>
                      <select value={form.adLength} onChange={(e) => set('adLength', e.target.value)}
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                        <option value="">Select length</option>
                        {['0:06', '0:15', '0:30', '0:45', '1:00', '1:30', '2:00+'].map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Links */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Inspiration Link</label>
                    <input value={form.inspirationLink} onChange={(e) => set('inspirationLink', e.target.value)}
                      placeholder="https://..."
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Reference Creative</label>
                    <input value={form.referenceCreative} onChange={(e) => set('referenceCreative', e.target.value)}
                      placeholder="Asset the designer should use"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                {/* Creative gets its own row: it's the tallest control on the
                    tab, and pairing it with a one-line input left a dead gap
                    beside it. */}
                <div>
                  <label className="text-xs font-medium block mb-1.5">
                    Creative
                    {form.adFormat === 'carousel' && (
                      <span className="text-muted-foreground font-normal"> (2–10 cards)</span>
                    )}
                  </label>
                  <CreativeInput
                    value={form.creativeLink}
                    onChange={(v) => set('creativeLink', v)}
                    multiple={form.adFormat === 'carousel'}
                  />
                  {form.adFormat === 'carousel' && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {assetCount === 0
                        ? 'Add 2–10 cards.'
                        : `${assetCount} card${assetCount !== 1 ? 's' : ''}${assetCount < 2 ? ' — a carousel needs at least 2' : ''}`}
                    </p>
                  )}
                </div>

                {/* Two single-line link fields, so the row heights match */}
                <div className="grid grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Frame.io Link</label>
                    <input value={form.frameioLink} onChange={(e) => set('frameioLink', e.target.value)}
                      placeholder="Frame.io review link"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Final Deliverable</label>
                    <div className="flex gap-2">
                      <input value={form.finalDeliverable} onChange={(e) => set('finalDeliverable', e.target.value)}
                        placeholder="Finished asset link"
                        className="flex-1 min-w-0 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                      {form.finalDeliverable && (
                        <a href={form.finalDeliverable} target="_blank" rel="noreferrer"
                          title="View creative"
                          className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary transition-colors flex items-center flex-shrink-0">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Result ── the name is built from everything above, so it
                    comes last: fill the brief top to bottom and watch it assemble. */}
                <div className="border-t border-border" />
                {/* One field per naming variable, straight from the convention.
                    A variable added in Settings shows up here on its own —
                    the brief and the convention can't drift apart. */}
                {customVars.length > 0 && (
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Variables</label>
                    <div className={`grid gap-2 ${customVars.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {customVars.map((v) => {
                        // Older variables were seeded with a single blank
                        // option, which rendered as an empty dropdown you
                        // couldn't type into. Blank entries don't count.
                        const options = (v.values ?? []).filter((o) => o.match.trim());
                        return (
                          <div key={v.key}>
                            <label className="text-[11px] text-muted-foreground block mb-1">
                              {v.label}
                              {v.prefix && <span className="font-mono ml-1 opacity-60">{v.prefix}</span>}
                            </label>
                            {options.length > 0 ? (
                              <select
                                value={customValues[v.key] || ''}
                                onChange={(e) => setCustom(v.key, e.target.value)}
                                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                                <option value="">Select {v.label.toLowerCase()}…</option>
                                {options.map((opt: { match: string; output: string }) => (
                                  <option key={opt.match} value={opt.match}>{opt.match}</option>
                                ))}
                              </select>
                            ) : (
                              // No predefined list — free text, so a brand new
                              // variable is usable the moment it's created.
                              <input
                                value={customValues[v.key] || ''}
                                onChange={(e) => setCustom(v.key, e.target.value)}
                                placeholder={v.label}
                                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      These feed the ad name. Add or change them in Settings → Naming.
                    </p>
                  </div>
                )}

                {/* Ad Name */}
                <div>
                  <label className="text-xs font-medium block mb-1.5">Ad Name</label>
                  <div className="flex gap-2">
                    <input value={form.adName} onChange={(e) => { setNameEdited(true); set('adName', e.target.value); }}
                      placeholder="Auto-generated or enter manually"
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                    />
                    <button type="button" onClick={generateName}
                      title="Generate ad name"
                      className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                      <Wand2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {nameEdited
                      ? 'Custom name — the wand rebuilds it from your naming convention.'
                      : 'Building automatically as you fill in the brief.'}
                  </p>
                </div>

              </>
            )}

            {tab === 'copy' && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium">Primary Text</label>
                    <CopyBankPicker entries={bankPrimary} onPick={(v) => set('primaryText', v)} />
                  </div>
                  <textarea value={form.primaryText} onChange={(e) => set('primaryText', e.target.value)}
                    placeholder="The main body copy for this ad..."
                    rows={5}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">{form.primaryText.length} characters</p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium">Headline</label>
                    <CopyBankPicker entries={bankHeadlines} onPick={(v) => set('headline', v)} />
                  </div>
                  <input value={form.headline} onChange={(e) => set('headline', e.target.value)}
                    placeholder="Short, punchy headline"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium">Description (optional)</label>
                    <CopyBankPicker entries={bankDescriptions} onPick={(v) => set('adDescription', v)} />
                  </div>
                  <input value={form.adDescription} onChange={(e) => set('adDescription', e.target.value)}
                    placeholder="Ad link description"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                {/* ── Destination ── */}
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-2 border-t border-border">
                  Destination
                </p>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium">Landing Page</label>
                    <CopyBankPicker entries={bankLandingPages} onPick={(v) => set('landingPage', v)} />
                  </div>
                  <input value={form.landingPage} onChange={(e) => set('landingPage', e.target.value)}
                    placeholder="https://brand.com/product"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Where the ad sends people. Set once — Launch Setup reads it from here.</p>
                </div>

                <div>
                  <label className="text-xs font-medium block mb-1.5">Call to Action</label>
                  <select value={form.metaCTA} onChange={(e) => set('metaCTA', e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="">Select CTA</option>
                    {META_CTAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                  <p className="text-[11px] text-muted-foreground mt-1">The button on the ad.</p>
                </div>
              </>
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

                {/* ── Ad / Creative ── */}
                {/* ── What will go live ──
                    Read-only on purpose: copy, landing page and CTA are owned
                    by Ad Setup. Having editable duplicates here meant two
                    fields for one value, with no clue which one won. */}
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Preview</p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <div className="flex gap-3 p-3">
                    {previewAsset ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previewAsset} alt="" className="w-20 h-20 rounded-md object-cover bg-secondary flex-shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }} />
                    ) : (
                      <div className="w-20 h-20 rounded-md bg-secondary flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-foreground line-clamp-2">
                        {form.primaryText || <span className="text-muted-foreground italic">No primary text yet</span>}
                      </p>
                      <p className="text-sm font-semibold mt-1.5">
                        {form.headline || <span className="text-muted-foreground font-normal italic">No headline yet</span>}
                      </p>
                      {form.adDescription && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{form.adDescription}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-t border-border">
                    <p className="text-[11px] text-muted-foreground font-mono truncate flex-1 min-w-0">
                      {form.landingPage || 'No landing page set'}
                    </p>
                    <span className="text-[10px] font-semibold bg-secondary border border-border rounded px-2 py-1 flex-shrink-0">
                      {META_CTAS.find((c) => c.value === form.metaCTA)?.label ?? 'No CTA'}
                    </span>
                  </div>
                  {(!form.landingPage || !form.metaCTA || !form.primaryText || !form.headline) && (
                    <button type="button" onClick={() => setTab('copy')}
                      className="w-full text-[11px] text-primary px-3 py-2 border-t border-border hover:bg-muted/30 transition-colors text-left">
                      Finish this in Ad Setup →
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
