'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, Copy, Check, Search, Star, Pencil, Trash2, Columns3, Rows3, X, ExternalLink, ClipboardList,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import type { CopyBankEntry, CopyBankType, RoadmapItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  COPY_TYPES, COPY_LIMIT, TYPE_LABEL, TYPE_PLURAL, isCopyType, usageOf, splitPasted,
  type CopyType, type StrategyType,
} from '@/lib/copy-bank';

type Section = 'copy' | StrategyType;
type Sort = 'recent' | 'used' | 'az';

const INPUT = 'w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-muted-foreground/50';

/* ───────────────────────────── small pieces ───────────────────────────── */

/** n/limit against Meta's recommended length — amber, not red, when over. */
function Counter({ type, n }: { type: CopyBankType; n: number }) {
  const max = COPY_LIMIT[type];
  if (!max || n === 0) return null;
  return (
    <span title={n > max ? `Meta shows about ${max} characters before "See more"` : `Meta recommends up to ${max}`}
      className={cn('text-[11px] tabular-nums flex-shrink-0', n > max ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
      {n}/{max}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" title="Copy" aria-label="Copy"
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}
      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
      {done ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function Usage({ used, live }: { used: number; live: number }) {
  if (used === 0) return <span className="text-muted-foreground/70">Not used yet</span>;
  return (
    <span className="text-muted-foreground">
      Used in {used} {used === 1 ? 'ad' : 'ads'}
      {live > 0 && <span className="text-primary font-medium"> · {live} live</span>}
    </span>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center text-[11px] bg-secondary border border-border rounded px-1.5 py-0.5 max-w-[160px] truncate">{children}</span>;
}

/* ─────────────────────────────── quick add ─────────────────────────────── */

/**
 * Always on screen, because adding copy is the most common thing done here.
 * Type, angle and product stay selected between entries so a copywriter can
 * fire off ten headlines for one angle without reselecting anything. "Paste
 * many" turns a list — bullets, numbers and all — into one entry per line.
 */
function QuickAdd({ angles, products, initialType }: {
  angles: string[]; products: string[]; initialType: CopyType;
}) {
  const addCopyEntry = useAppStore((s) => s.addCopyEntry);
  const addCopyEntries = useAppStore((s) => s.addCopyEntries);
  const [type, setType] = useState<CopyType>(initialType);
  const [text, setText] = useState('');
  const [angle, setAngle] = useState('');
  const [product, setProduct] = useState('');
  const [many, setMany] = useState(false);
  const [flash, setFlash] = useState('');

  useEffect(() => setType(initialType), [initialType]);

  const lines = many ? splitPasted(text) : [];
  const canAdd = many ? lines.length > 0 : !!text.trim();

  const add = () => {
    if (!canAdd) return;
    const base = { type, tags: [] as string[], angle: angle || undefined, product: product || undefined };
    if (many) {
      addCopyEntries(lines.map((content) => ({ ...base, content })));
      setFlash(`Added ${lines.length} ${lines.length === 1 ? TYPE_LABEL[type].toLowerCase() : TYPE_PLURAL[type].toLowerCase()}`);
    } else {
      addCopyEntry({ ...base, content: text.trim() });
      setFlash(`Added ${TYPE_LABEL[type].toLowerCase()}`);
    }
    setText('');
    setTimeout(() => setFlash(''), 2000);
  };

  const multiline = many || type === 'primary_text';

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-0.5">
          {COPY_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={cn('text-xs px-3 py-1.5 rounded-md transition-colors',
                type === t ? 'bg-card shadow-sm font-medium text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {TYPE_LABEL[t]}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setMany((v) => !v)}
          className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
            many ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
          <ClipboardList className="w-3.5 h-3.5" /> Paste many
        </button>
      </div>

      {multiline ? (
        <textarea value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add(); } }}
          rows={many ? 5 : 3}
          placeholder={many
            ? `Paste ${TYPE_PLURAL[type].toLowerCase()}, one per line — bullets and numbering are stripped.`
            : 'Write the body copy…'}
          className={cn(INPUT, 'resize-none leading-relaxed')} />
      ) : (
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={type === 'headline' ? 'Write a headline…' : type === 'hook' ? 'Write an opening hook…' : 'Write a description…'}
          className={INPUT} />
      )}

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className="text-xs text-muted-foreground">For</span>
        <select value={angle} onChange={(e) => setAngle(e.target.value)}
          className="text-xs bg-card border border-border rounded-md px-2 py-1.5 max-w-[180px]">
          <option value="">Any angle</option>
          {angles.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={product} onChange={(e) => setProduct(e.target.value)}
          className="text-xs bg-card border border-border rounded-md px-2 py-1.5 max-w-[180px]">
          <option value="">Any product</option>
          {products.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>

        <div className="flex-1" />
        {flash && <span className="text-xs text-primary flex items-center gap-1"><Check className="w-3.5 h-3.5" />{flash}</span>}
        {!many && <Counter type={type} n={text.trim().length} />}
        <span className="text-[11px] text-muted-foreground hidden sm:inline">
          {multiline ? 'Ctrl + Enter' : 'Enter'} to add
        </span>
        <button type="button" onClick={add} disabled={!canAdd}
          className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" />
          {many ? `Add ${lines.length || ''} ${TYPE_PLURAL[type].toLowerCase()}`.replace('  ', ' ') : 'Add'}
        </button>
      </div>
    </div>
  );
}

/* ──────────────────────────────── copy line ─────────────────────────────── */

function CopyLine({ entry, usage, angles, products, onDelete, compact = false }: {
  entry: CopyBankEntry;
  usage: { used: number; live: number };
  angles: string[];
  products: string[];
  onDelete: (e: CopyBankEntry) => void;
  compact?: boolean;
}) {
  const updateCopyEntry = useAppStore((s) => s.updateCopyEntry);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ content: entry.content, angle: entry.angle ?? '', product: entry.product ?? '' });
  const ref = useRef<HTMLTextAreaElement>(null);

  const startEdit = () => {
    setDraft({ content: entry.content, angle: entry.angle ?? '', product: entry.product ?? '' });
    setEditing(true);
    setTimeout(() => ref.current?.focus(), 0);
  };
  const save = () => {
    if (!draft.content.trim()) return;
    updateCopyEntry(entry.id, {
      content: draft.content.trim(),
      angle: draft.angle || undefined,
      product: draft.product || undefined,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-card border border-primary/40 rounded-lg p-3 space-y-2">
        <textarea ref={ref} value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setEditing(false);
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); save(); }
          }}
          rows={entry.type === 'primary_text' ? 4 : 2}
          className={cn(INPUT, 'resize-none leading-relaxed')} />
        <div className="flex items-center gap-2 flex-wrap">
          <select value={draft.angle} onChange={(e) => setDraft({ ...draft, angle: e.target.value })}
            className="text-xs bg-card border border-border rounded-md px-2 py-1.5">
            <option value="">Any angle</option>
            {angles.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={draft.product} onChange={(e) => setDraft({ ...draft, product: e.target.value })}
            className="text-xs bg-card border border-border rounded-md px-2 py-1.5">
            <option value="">Any product</option>
            {products.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <Counter type={entry.type} n={draft.content.trim().length} />
          <div className="flex-1" />
          <button type="button" onClick={() => setEditing(false)}
            className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary transition-colors">Cancel</button>
          <button type="button" onClick={save}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors">Save</button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('group bg-card border rounded-lg transition-colors',
      entry.winner ? 'border-primary/30' : 'border-border hover:border-primary/25',
      compact ? 'p-3' : 'flex items-start gap-3 px-3 py-2.5')}>
      {!compact && (
        <button type="button" onClick={() => updateCopyEntry(entry.id, { winner: !entry.winner })}
          title={entry.winner ? 'Winner — click to unmark' : 'Mark as a winner'} aria-label="Toggle winner"
          className="pt-0.5 flex-shrink-0">
          <Star className={cn('w-4 h-4 transition-colors', entry.winner ? 'fill-primary text-primary' : 'text-border hover:text-primary/50')} />
        </button>
      )}

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-relaxed whitespace-pre-line', compact && 'line-clamp-4')}>{entry.content}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[11px]">
          {compact && entry.winner && <Star className="w-3 h-3 fill-primary text-primary" />}
          {entry.angle && <Chip>{entry.angle}</Chip>}
          {entry.product && <Chip>{entry.product}</Chip>}
          <Usage {...usage} />
        </div>
      </div>

      <div className={cn('flex items-center gap-0.5 flex-shrink-0', compact && 'mt-2 -mb-1 justify-end')}>
        <Counter type={entry.type} n={entry.content.length} />
        <div className={cn('flex items-center transition-opacity', !compact && 'opacity-0 group-hover:opacity-100 focus-within:opacity-100')}>
          {compact && (
            <button type="button" onClick={() => updateCopyEntry(entry.id, { winner: !entry.winner })}
              title="Toggle winner" aria-label="Toggle winner"
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors">
              <Star className={cn('w-3.5 h-3.5', entry.winner && 'fill-primary text-primary')} />
            </button>
          )}
          <CopyButton text={entry.content} />
          <button type="button" onClick={startEdit} title="Edit" aria-label="Edit"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => onDelete(entry)} title="Delete" aria-label="Delete"
            className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────── strategy banks ───────────────────────────── */

/**
 * Angles, products and landing pages are the strategy copy hangs off. Each
 * row shows where it's used and how much copy has been written for it, which
 * is the coverage question a strategist actually asks ("do we have enough
 * headlines for the Lifestyle angle?").
 */
function StrategyBank({ type, entries, items, copyLines, query, onDelete }: {
  type: StrategyType;
  entries: CopyBankEntry[];
  items: RoadmapItem[];
  copyLines: CopyBankEntry[];
  query: string;
  onDelete: (e: CopyBankEntry) => void;
}) {
  const addCopyEntry = useAppStore((s) => s.addCopyEntry);
  const updateCopyEntry = useAppStore((s) => s.updateCopyEntry);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ content: '', url: '' });
  const hasUrl = type !== 'angle';

  const add = () => {
    if (!name.trim()) return;
    addCopyEntry({ type, content: name.trim(), url: hasUrl && url.trim() ? url.trim() : undefined, tags: [] });
    setName(''); setUrl('');
  };

  const q = query.trim().toLowerCase();
  const shown = entries
    .filter((e) => !q || e.content.toLowerCase().includes(q) || (e.url ?? '').toLowerCase().includes(q))
    .sort((a, b) => a.content.localeCompare(b.content));

  const linkedCopy = (e: CopyBankEntry) =>
    copyLines.filter((c) => (type === 'angle' ? c.angle : c.product)?.toLowerCase() === e.content.toLowerCase()).length;

  return (
    <div>
      <div className="bg-card border border-border rounded-xl p-4 mb-6 flex items-center gap-2 flex-wrap">
        <input value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={type === 'angle' ? 'New angle, e.g. Before & After' : type === 'product' ? 'Product name' : 'Page name, e.g. Spring sale PDP'}
          className={cn(INPUT, 'flex-1 min-w-[200px]')} />
        {hasUrl && (
          <input value={url} onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="https://…" className={cn(INPUT, 'flex-1 min-w-[200px]')} />
        )}
        <button type="button" onClick={add} disabled={!name.trim()}
          className="flex items-center gap-1.5 bg-primary text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" /> Add {TYPE_LABEL[type].toLowerCase()}
        </button>
      </div>

      {shown.length === 0 ? (
        <Empty title={q ? 'Nothing matches that search.' : `No ${TYPE_PLURAL[type].toLowerCase()} yet.`}
          body={type === 'angle'
            ? 'Angles are the reasons someone buys. Tag copy to them and the brief can suggest the right lines.'
            : type === 'product'
              ? 'Products feed the brief and your ad names. Tag copy to a product to keep lines organised.'
              : 'Save the pages you send traffic to, and pick them in Ad Setup instead of pasting URLs.'} />
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
          {shown.map((e) => {
            const u = usageOf(e, items);
            const linked = type === 'landing_page' ? null : linkedCopy(e);
            if (editId === e.id) {
              return (
                <div key={e.id} className="p-3 flex items-center gap-2 flex-wrap bg-primary/5">
                  <input autoFocus value={draft.content} onChange={(ev) => setDraft({ ...draft, content: ev.target.value })}
                    className={cn(INPUT, 'flex-1 min-w-[180px]')} />
                  {hasUrl && (
                    <input value={draft.url} onChange={(ev) => setDraft({ ...draft, url: ev.target.value })}
                      placeholder="https://…" className={cn(INPUT, 'flex-1 min-w-[180px]')} />
                  )}
                  <button type="button" onClick={() => setEditId(null)}
                    className="text-xs px-3 py-2 rounded-lg border border-border hover:bg-secondary">Cancel</button>
                  <button type="button"
                    onClick={() => { if (draft.content.trim()) { updateCopyEntry(e.id, { content: draft.content.trim(), url: draft.url.trim() || undefined }); setEditId(null); } }}
                    className="text-xs px-3 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90">Save</button>
                </div>
              );
            }
            return (
              <div key={e.id} className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.content}</p>
                  {e.url && (
                    <a href={e.url} target="_blank" rel="noreferrer"
                      className="text-[11px] text-muted-foreground hover:text-primary truncate flex items-center gap-1 max-w-md">
                      {e.url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  )}
                </div>
                {linked !== null && (
                  <span className="text-[11px] text-muted-foreground flex-shrink-0 w-24 text-right">
                    {linked} {linked === 1 ? 'copy line' : 'copy lines'}
                  </span>
                )}
                <span className="text-[11px] flex-shrink-0 w-36 text-right">
                  {u.used === 0 ? <span className="text-muted-foreground/70">No briefs yet</span> : (
                    <span className="text-muted-foreground">In {u.used} {u.used === 1 ? 'brief' : 'briefs'}
                      {u.live > 0 && <span className="text-primary font-medium"> · {u.live} live</span>}
                    </span>
                  )}
                </span>
                <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <CopyButton text={e.url || e.content} />
                  <button type="button" title="Edit" aria-label="Edit"
                    onClick={() => { setDraft({ content: e.content, url: e.url ?? '' }); setEditId(e.id); }}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" title="Delete" aria-label="Delete" onClick={() => onDelete(e)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-xl">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{body}</p>
    </div>
  );
}

/* ───────────────────────────────── page ───────────────────────────────── */

export default function CopyBankPage() {
  const copyBank = useAppStore((s) => s.copyBank);
  const roadmaps = useAppStore((s) => s.roadmaps);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const deleteCopyEntry = useAppStore((s) => s.deleteCopyEntry);
  const restoreCopyEntry = useAppStore((s) => s.restoreCopyEntry);

  const [section, setSection] = useState<Section>('copy');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<CopyType | 'all'>('all');
  const [angleFilter, setAngleFilter] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [winnersOnly, setWinnersOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('recent');
  const [view, setView] = useState<'list' | 'columns'>('list');

  // Delete is instant, with Undo rather than a confirm dialog: no
  // interruption for the common case, a way back for the mistake.
  const [undo, setUndo] = useState<CopyBankEntry | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remove = (e: CopyBankEntry) => {
    deleteCopyEntry(e.id);
    setUndo(e);
    if (undoTimer.current) clearTimeout(undoTimer.current);
    undoTimer.current = setTimeout(() => setUndo(null), 6000);
  };
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current); }, []);

  const items = useMemo(
    () => roadmaps.filter((r) => !currentAccountId || r.accountId === currentAccountId).flatMap((r) => r.items),
    [roadmaps, currentAccountId],
  );

  const byType = (t: CopyBankType) => copyBank.filter((e) => e.type === t);
  const angles = byType('angle').map((e) => e.content).sort();
  const products = byType('product').map((e) => e.content).sort();
  const copyLines = copyBank.filter((e) => isCopyType(e.type));

  const usage = useMemo(() => {
    const m = new Map<string, { used: number; live: number }>();
    for (const e of copyBank) m.set(e.id, usageOf(e, items));
    return m;
  }, [copyBank, items]);

  const q = query.trim().toLowerCase();
  const visibleCopy = copyLines
    .filter((e) => typeFilter === 'all' || e.type === typeFilter)
    .filter((e) => !angleFilter || e.angle === angleFilter)
    .filter((e) => !productFilter || e.product === productFilter)
    .filter((e) => !winnersOnly || e.winner)
    .filter((e) => !q || e.content.toLowerCase().includes(q)
      || (e.angle ?? '').toLowerCase().includes(q) || (e.product ?? '').toLowerCase().includes(q))
    .sort((a, b) => {
      // Winners lead regardless of sort — they're the point of the bank.
      if (!!a.winner !== !!b.winner) return a.winner ? -1 : 1;
      if (sort === 'az') return a.content.localeCompare(b.content);
      if (sort === 'used') return (usage.get(b.id)?.used ?? 0) - (usage.get(a.id)?.used ?? 0);
      return (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt);
    });

  const groups = (typeFilter === 'all' ? COPY_TYPES : [typeFilter])
    .map((t) => ({ type: t, entries: visibleCopy.filter((e) => e.type === t) }));

  const filtersOn = !!(angleFilter || productFilter || winnersOnly || q);

  const SECTIONS: { id: Section; label: string; count: number }[] = [
    { id: 'copy', label: 'Copy', count: copyLines.length },
    { id: 'angle', label: 'Angles', count: angles.length },
    { id: 'product', label: 'Products', count: products.length },
    { id: 'landing_page', label: 'Landing pages', count: byType('landing_page').length },
  ];

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Copy Bank</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Every line you&rsquo;ve written, organised by the angle and product it&rsquo;s for — and pulled straight into briefs.
        </p>
      </div>

      {/* Sections: the words, then the strategy they hang off */}
      <div className="flex items-center gap-1 border-b border-border mb-6">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" onClick={() => { setSection(s.id); setQuery(''); }}
            className={cn('text-sm px-3 py-2 -mb-px border-b-2 transition-colors',
              section === s.id ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {s.label} <span className="text-xs text-muted-foreground ml-0.5">{s.count}</span>
          </button>
        ))}
      </div>

      {section === 'copy' ? (
        <>
          <QuickAdd angles={angles} products={products} initialType={typeFilter === 'all' ? 'headline' : typeFilter} />

          {/* Toolbar — two fixed rows rather than one that wraps unpredictably:
              find and arrange on top, narrow down underneath. */}
          <div className="space-y-2.5 mb-5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search copy, angles or products"
                  className={cn(INPUT, 'pl-8 py-1.5')} />
              </div>
              <div className="flex-1" />
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort"
                className="text-xs bg-card border border-border rounded-lg px-2 py-1.5">
                <option value="recent">Recent</option>
                <option value="used">Most used</option>
                <option value="az">A–Z</option>
              </select>
              <div className="flex items-center border border-border rounded-lg overflow-hidden bg-card">
                <button type="button" onClick={() => setView('list')} title="List, grouped by type" aria-label="List view"
                  className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1.5 transition-colors', view === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                  <Rows3 className="w-3.5 h-3.5" /> List
                </button>
                <button type="button" onClick={() => setView('columns')} title="A column per type" aria-label="Columns view"
                  className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1.5 transition-colors border-l border-border', view === 'columns' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}>
                  <Columns3 className="w-3.5 h-3.5" /> Columns
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                {(['all', ...COPY_TYPES] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTypeFilter(t)}
                    className={cn('text-xs px-2.5 py-1 rounded-full border transition-colors',
                      typeFilter === t ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
                    {t === 'all' ? 'All' : TYPE_PLURAL[t]}
                  </button>
                ))}
              </div>
              <span className="w-px h-5 bg-border mx-1" />
              <select value={angleFilter} onChange={(e) => setAngleFilter(e.target.value)} aria-label="Filter by angle"
                className={cn('text-xs bg-card border rounded-lg px-2 py-1', angleFilter ? 'border-primary text-primary' : 'border-border')}>
                <option value="">All angles</option>
                {angles.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} aria-label="Filter by product"
                className={cn('text-xs bg-card border rounded-lg px-2 py-1', productFilter ? 'border-primary text-primary' : 'border-border')}>
                <option value="">All products</option>
                {products.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button type="button" onClick={() => setWinnersOnly((v) => !v)}
                className={cn('flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition-colors',
                  winnersOnly ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}>
                <Star className={cn('w-3.5 h-3.5', winnersOnly && 'fill-primary')} /> Winners
              </button>
              {filtersOn && (
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground ml-1"
                  onClick={() => { setQuery(''); setAngleFilter(''); setProductFilter(''); setWinnersOnly(false); }}>
                  Clear
                </button>
              )}
            </div>
          </div>

          {copyLines.length === 0 ? (
            <Empty title="No copy yet."
              body="Write a line above, or switch on Paste many to drop in a whole list. Tag it to an angle and product and briefs will suggest it." />
          ) : visibleCopy.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground">Nothing matches those filters.</p>
              {filtersOn && (
                <button type="button" className="text-xs text-primary hover:underline mt-1"
                  onClick={() => { setQuery(''); setAngleFilter(''); setProductFilter(''); setWinnersOnly(false); }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : view === 'list' ? (
            // Grouped by type — all headlines together, then all primary
            // text — which is how Chris asked for the list to read.
            <div className="space-y-7">
              {groups.filter((g) => g.entries.length > 0).map((g) => (
                <section key={g.type}>
                  <h2 className="text-xs font-medium text-muted-foreground mb-2">
                    {TYPE_PLURAL[g.type]} <span className="font-normal">· {g.entries.length}</span>
                  </h2>
                  <div className="space-y-1.5">
                    {g.entries.map((e) => (
                      <CopyLine key={e.id} entry={e} usage={usage.get(e.id) ?? { used: 0, live: 0 }}
                        angles={angles} products={products} onDelete={remove} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            // One column per type, side by side, for mixing and matching a
            // headline with primary text the way a media buyer builds an ad.
            <div className={cn('grid gap-4',
              groups.length === 1 ? 'grid-cols-1 max-w-xl' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4')}>
              {groups.map((g) => (
                <section key={g.type} className="min-w-0 flex flex-col">
                  <h2 className="text-xs font-medium text-muted-foreground mb-2 px-1">
                    {TYPE_PLURAL[g.type]} <span className="font-normal">· {g.entries.length}</span>
                  </h2>
                  <div className="space-y-2 bg-muted/30 rounded-xl p-2 max-h-[70vh] overflow-y-auto [scrollbar-width:thin] flex-1">
                    {g.entries.length === 0
                      ? <p className="text-xs text-muted-foreground/70 text-center py-6">None yet</p>
                      : g.entries.map((e) => (
                        <CopyLine key={e.id} compact entry={e} usage={usage.get(e.id) ?? { used: 0, live: 0 }}
                          angles={angles} products={products} onDelete={remove} />
                      ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="relative max-w-xs mb-4">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${TYPE_PLURAL[section].toLowerCase()}`} className={cn(INPUT, 'pl-8 py-1.5')} />
          </div>
          <StrategyBank type={section} entries={byType(section)} items={items} copyLines={copyLines}
            query={query} onDelete={remove} />
        </>
      )}

      {undo && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-foreground text-background rounded-xl shadow-lg pl-4 pr-1.5 py-1.5 flex items-center gap-3 text-sm">
          <span className="max-w-[260px] truncate">Deleted &ldquo;{undo.content}&rdquo;</span>
          <button type="button" onClick={() => { restoreCopyEntry(undo); setUndo(null); }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-background/10 transition-colors">Undo</button>
          <button type="button" onClick={() => setUndo(null)} aria-label="Dismiss"
            className="p-1 rounded-md hover:bg-background/10 transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
    </div>
  );
}
