'use client';

import { useMemo, useState } from 'react';
import { GripVertical, Plus, Trash2, X, ChevronRight, Check, Copy, ChevronDown } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn, applyNamingConvention, DEFAULT_NAMING_CONVENTION, READABLE_NAMING_CONVENTION } from '@/lib/utils';
import { NAMING_SEPARATORS, type NamingConvention, type NamingVariable, type NamingStyle, type RoadmapItem } from '@/lib/types';

/**
 * Naming convention settings, modelled on Motion's: an ordered list of
 * properties, each with an identifier (i:, o:, lp:…) and the values it takes,
 * joined by one separator. The stored shape is unchanged — the order here is
 * the formula, so names already generated keep resolving the same way.
 */

const FIELD_OPTIONS: { value: keyof RoadmapItem; label: string }[] = [
  { value: 'adFormat', label: 'Ad format' },
  { value: 'adSize', label: 'Size' },
  { value: 'adLength', label: 'Length' },
  { value: 'angle', label: 'Angle' },
  { value: 'concept', label: 'Concept' },
  { value: 'product', label: 'Product' },
  { value: 'productCategory', label: 'Product category' },
  { value: 'landingPage', label: 'Landing page' },
];
const fieldLabel = (f?: string) => FIELD_OPTIONS.find((o) => o.value === f)?.label ?? f ?? '';

// One tint per position so a property and its part of the example name match.
const TINTS = [
  'bg-orange-100 text-orange-900', 'bg-sky-100 text-sky-900', 'bg-emerald-100 text-emerald-900',
  'bg-violet-100 text-violet-900', 'bg-amber-100 text-amber-900', 'bg-rose-100 text-rose-900',
  'bg-teal-100 text-teal-900', 'bg-indigo-100 text-indigo-900', 'bg-lime-100 text-lime-900',
  'bg-fuchsia-100 text-fuchsia-900',
];
// The same hues, solid, for the dot beside each property.
const DOTS = [
  'bg-orange-400', 'bg-sky-400', 'bg-emerald-400', 'bg-violet-400', 'bg-amber-400',
  'bg-rose-400', 'bg-teal-400', 'bg-indigo-400', 'bg-lime-500', 'bg-fuchsia-400',
];

const INPUT = 'w-full h-9 bg-card border border-border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50';

const keysIn = (formula: string) =>
  [...formula.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]).filter((k) => k !== 'sep');
const isPlainFormula = (formula: string) => formula.replace(/\{[^}]+\}/g, '').trim() === '';
const buildFormula = (keys: string[]) => keys.map((k) => `{${k}}`).join('{sep}');

function sourceLabel(v: NamingVariable) {
  if (v.key === '#') return 'Numbered automatically';
  if (v.key === 'b') return 'Workspace name';
  if (v.source === 'field') return `From the brief: ${fieldLabel(v.field)}`;
  return 'Picked in the brief';
}

export function NamingSettings() {
  const convention = useAppStore((s) => s.namingConvention);
  const save = useAppStore((s) => s.updateNamingConvention);
  const account = useAppStore((s) => s.currentAccount)();
  const roadmaps = useAppStore((s) => s.roadmaps);

  const [formula, setFormula] = useState(convention.formula);
  const [separator, setSeparator] = useState(convention.separator);
  const [variables, setVariables] = useState<NamingVariable[]>(convention.variables);
  const [style, setStyle] = useState<NamingStyle>(convention.style ?? 'compact');
  const [editing, setEditing] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [drag, setDrag] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const draft: NamingConvention = { formula, separator, variables, style };
  const dirty = JSON.stringify(draft) !== JSON.stringify({ ...convention, style: convention.style ?? 'compact' });

  const items = useMemo(() => roadmaps.flatMap((r) => r.items), [roadmaps]);
  // Motion previews a real ad name. Use the newest brief when there is one.
  const latest = useMemo(
    () => [...items].sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))[0],
    [items],
  );
  const sample: Partial<RoadmapItem> = latest ?? {
    adFormat: 'video', adSize: '9:16', angle: 'softer fur', concept: 'before and after',
    product: 'cat spray', productCategory: 'grooming',
  };
  const extra = { brand: account?.name?.slice(0, 3) || 'BRD', index: 1, customValues: sample.variables };

  const order = keysIn(formula);
  const inName = order.map((k) => variables.find((v) => v.key === k)).filter(Boolean) as NamingVariable[];
  const notInName = variables.filter((v) => !order.includes(v.key));
  const tintOf = (key: string) => TINTS[Math.max(0, order.indexOf(key)) % TINTS.length];

  // Each property resolved on its own, so the example can be shown in parts.
  const segment = (key: string) =>
    applyNamingConvention({ ...draft, formula: `{${key}}` }, sample, extra);
  const segments = order.map((k) => ({ key: k, text: segment(k) })).filter((s) => s.text);
  const fullName = applyNamingConvention(draft, sample, extra);

  /** Values seen in briefs for this property — Motion's "values detected". */
  const detected = (v: NamingVariable) => {
    const counts = new Map<string, number>();
    for (const it of items) {
      const raw = v.source === 'field' && v.field
        ? String(it[v.field] ?? '').split(',')[0].trim()
        : (it.variables?.[v.key] ?? '').trim();
      if (raw) counts.set(raw, (counts.get(raw) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([value, n]) => ({ value, n }));
  };

  const setOrder = (keys: string[]) => setFormula(buildFormula(keys));
  const toggle = (key: string) => setOrder(order.includes(key) ? order.filter((k) => k !== key) : [...order, key]);
  const patch = (key: string, u: Partial<NamingVariable>) =>
    setVariables((vs) => vs.map((v) => (v.key === key ? { ...v, ...u } : v)));

  const addProperty = () => {
    const used = new Set(variables.map((v) => v.key));
    let n = 1;
    while (used.has(`x${n}`)) n++;
    const key = `x${n}`;
    setVariables((vs) => [...vs, { key, label: '', source: 'custom', fallback: '', maxLength: 8, values: [], prefix: '' }]);
    setOrder([...order, key]);
    setEditing(key);
  };

  const removeProperty = (key: string) => {
    setVariables((vs) => vs.filter((v) => v.key !== key));
    setOrder(order.filter((k) => k !== key));
    setEditing(null);
  };

  const applyPreset = (p: NamingConvention) => {
    setFormula(p.formula); setSeparator(p.separator); setVariables(p.variables);
    setStyle(p.style ?? 'compact'); setPresetsOpen(false);
  };

  const onDragOver = (over: string) => {
    if (!drag || drag === over) return;
    const next = order.filter((k) => k !== drag);
    next.splice(next.indexOf(over), 0, drag);
    setOrder(next);
  };

  const editingVar = variables.find((v) => v.key === editing);

  return (
    <div className="space-y-5">
      {/* ── Example ad name ── */}
      <section className="bg-card border border-border rounded-xl shadow-xs p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Example ad name</h3>
          <span className="text-xs text-muted-foreground">{latest ? `From your latest brief: ${latest.concept || 'untitled'}` : 'Sample brief'}</span>
        </div>
        <ExampleName segments={segments} separator={separator} tintOf={tintOf} hover={hover} full={fullName} />

        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-5">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Separator</span>
            <div className="flex items-center bg-muted rounded-full p-0.5">
              {NAMING_SEPARATORS.map((s) => (
                <button key={s.value} type="button" onClick={() => setSeparator(s.value)} title={s.label.split(/\s{2,}/)[1]}
                  className={cn('h-7 min-w-8 px-2 rounded-full text-sm font-mono transition-colors',
                    separator === s.value ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {s.label.split(/\s{2,}/)[0]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Values</span>
            <div className="flex items-center bg-muted rounded-full p-0.5">
              {([['readable', 'With identifiers', 'af: Video'], ['compact', 'Short codes', 'VID']] as const).map(([v, label, eg]) => (
                <button key={v} type="button" onClick={() => setStyle(v)} title={`e.g. ${eg}`}
                  className={cn('h-7 px-3 rounded-full text-xs font-medium transition-colors',
                    style === v ? 'bg-card shadow-xs text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Properties ── */}
      <section className="bg-card border border-border rounded-xl shadow-xs">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h3 className="text-sm font-semibold">Properties</h3>
            <p className="text-xs text-muted-foreground mt-0.5">In the order they appear in the name. Drag to reorder.</p>
          </div>
          <button type="button" onClick={addProperty}
            className="flex items-center gap-1.5 h-8 px-3 rounded-full border border-border text-sm font-medium hover:bg-foreground/5 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add property
          </button>
        </div>

        <div className="grid grid-cols-[20px_1fr_96px_1.2fr_44px_20px] gap-x-3 px-5 pb-2 text-xs text-muted-foreground border-b border-border">
          <span /><span>Property</span><span>Identifier</span><span>Values</span><span className="text-center">In name</span><span />
        </div>

        <div className="divide-y divide-border">
          {inName.map((v) => (
            <PropertyRow key={v.key} v={v} tint={tintOf(v.key)} on style={style}
              values={(v.values || []).map((m) => m.output || m.match).filter(Boolean)}
              detected={detected(v).map((d) => d.value)}
              dragging={drag === v.key}
              onHover={setHover} onEdit={() => setEditing(v.key)} onToggle={() => toggle(v.key)}
              onDragStart={() => setDrag(v.key)} onDragEnd={() => setDrag(null)} onDragOver={() => onDragOver(v.key)} />
          ))}
        </div>

        {notInName.length > 0 && (
          <>
            <p className="px-5 pt-4 pb-2 text-xs text-muted-foreground border-t border-border">Not in the name</p>
            <div className="divide-y divide-border">
              {notInName.map((v) => (
                <PropertyRow key={v.key} v={v} on={false} style={style}
                  values={(v.values || []).map((m) => m.output || m.match).filter(Boolean)}
                  detected={detected(v).map((d) => d.value)}
                  onHover={setHover} onEdit={() => setEditing(v.key)} onToggle={() => toggle(v.key)} />
              ))}
            </div>
          </>
        )}
      </section>

      {!isPlainFormula(convention.formula) && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Your saved pattern has text between properties. Reordering here rebuilds it as properties joined by the separator.
        </p>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <button type="button" onClick={() => setPresetsOpen((o) => !o)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-border text-sm font-medium hover:bg-foreground/5 transition-colors">
            Start from a preset <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {presetsOpen && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setPresetsOpen(false)} />
              <div className="absolute left-0 bottom-11 z-30 w-80 bg-card border border-border rounded-xl shadow-lg p-1.5">
                {[
                  { p: READABLE_NAMING_CONVENTION, title: 'With identifiers', eg: 'af: Video | f: before and after | p: cat spray' },
                  { p: DEFAULT_NAMING_CONVENTION, title: 'Short codes', eg: 'BRD_VID_9X16_SOFTERF_001' },
                ].map(({ p, title, eg }) => (
                  <button key={title} type="button" onClick={() => applyPreset(p)}
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors">
                    <span className="block text-sm font-medium">{title}</span>
                    <span className="block text-xs text-muted-foreground font-mono truncate mt-0.5">{eg}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <span className="flex-1" />
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
        <button type="button" onClick={() => { save(draft); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          disabled={!dirty && !saved}
          className="flex items-center gap-1.5 h-9 pl-3.5 pr-4 rounded-full bg-primary text-white text-sm font-medium shadow-sm hover:bg-primary/90 disabled:opacity-40 transition-colors">
          <Check className="w-4 h-4" /> {saved ? 'Saved' : 'Save'}
        </button>
      </div>

      {editingVar && (
        <EditProperty v={editingVar} style={style} inName={order.includes(editingVar.key)}
          detected={detected(editingVar)}
          example={<ExampleName segments={segments} separator={separator} tintOf={tintOf} hover={editingVar.key} />}
          onChange={(u) => patch(editingVar.key, u)}
          onRemove={['b', '#'].includes(editingVar.key) ? undefined : () => removeProperty(editingVar.key)}
          onClose={() => {
            // A property nobody named is just clutter.
            if (!editingVar.label.trim() && editingVar.key.startsWith('x')) removeProperty(editingVar.key);
            else setEditing(null);
          }} />
      )}
    </div>
  );
}

function ExampleName({ segments, separator, tintOf, hover, full }: {
  segments: { key: string; text: string }[]; separator: string;
  tintOf: (k: string) => string; hover: string | null; full?: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group/ex relative mt-3 bg-background border border-border rounded-lg px-4 py-3.5 pr-12">
      <p className="font-mono text-sm leading-7 break-all">
        {segments.length === 0 ? <span className="text-muted-foreground">Add a property to start the name</span>
          : segments.map((s, i) => (
            <span key={s.key}>
              {i > 0 && <span className="text-muted-foreground">{separator}</span>}
              <span className={cn('rounded px-0.5 -mx-0.5 transition-colors',
                hover === s.key ? tintOf(s.key) : hover ? 'opacity-40' : '')}>{s.text}</span>
            </span>
          ))}
      </p>
      {full && (
        <button type="button" onClick={() => { navigator.clipboard.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          title="Copy" aria-label="Copy example name"
          className="absolute top-3 right-3 p-1.5 rounded-md text-muted-foreground hover:bg-foreground/5 opacity-0 group-hover/ex:opacity-100 transition-opacity">
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

function PropertyRow({ v, tint, on, style, values, detected, dragging, onHover, onEdit, onToggle, onDragStart, onDragEnd, onDragOver }: {
  v: NamingVariable; tint?: string; on: boolean; style: NamingStyle; values: string[]; detected: string[];
  dragging?: boolean; onHover: (k: string | null) => void; onEdit: () => void; onToggle: () => void;
  onDragStart?: () => void; onDragEnd?: () => void; onDragOver?: () => void;
}) {
  // Defined options first; otherwise what briefs have actually used.
  const shown = values.length ? values : detected;
  return (
    <div
      draggable={on}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(); }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(); }}
      onMouseEnter={() => onHover(v.key)} onMouseLeave={() => onHover(null)}
      className={cn('grid grid-cols-[20px_1fr_96px_1.2fr_44px_20px] gap-x-3 items-center px-5 py-3 group hover:bg-muted/40 transition-colors',
        dragging && 'bg-primary/5', !on && 'opacity-60')}>
      <span className={cn('text-muted-foreground/50', on ? 'cursor-grab active:cursor-grabbing group-hover:text-muted-foreground' : 'invisible')}>
        <GripVertical className="w-4 h-4" />
      </span>
      <button type="button" onClick={onEdit} className="text-left min-w-0">
        <span className="flex items-center gap-2">
          {tint && <span className={cn('w-2 h-2 rounded-full flex-shrink-0', DOTS[TINTS.indexOf(tint)])} />}
          <span className="text-sm font-medium truncate">{v.label || 'Untitled property'}</span>
        </span>
        <span className="block text-xs text-muted-foreground truncate mt-0.5">{sourceLabel(v)}</span>
      </button>
      <button type="button" onClick={onEdit} className="text-left">
        {v.prefix ? (
          <span className={cn('font-mono text-xs px-1.5 py-0.5 rounded border border-border bg-background', style !== 'readable' && 'opacity-50')}
            title={style !== 'readable' ? 'Identifiers show when values are set to “With identifiers”' : undefined}>
            {v.prefix}
          </span>
        ) : <span className="text-xs text-muted-foreground">None</span>}
      </button>
      <button type="button" onClick={onEdit} className="flex items-center gap-1 min-w-0 overflow-hidden text-left">
        {v.key === '#' ? <span className="text-xs text-muted-foreground font-mono">001, 002, 003…</span>
          : v.key === 'b' ? <span className="text-xs text-muted-foreground">Your workspace</span>
          : shown.length === 0 ? <span className="text-xs text-muted-foreground">Any value</span>
          : <>
            {shown.slice(0, 3).map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted truncate max-w-[120px] flex-shrink-0">{t}</span>
            ))}
            {shown.length > 3 && <span className="text-xs text-muted-foreground flex-shrink-0">+{shown.length - 3}</span>}
          </>}
      </button>
      <span className="flex justify-center">
        <Switch on={on} onChange={onToggle} label={`Include ${v.label || 'property'} in the name`} />
      </span>
      <button type="button" onClick={onEdit} aria-label={`Edit ${v.label}`} className="text-muted-foreground hover:text-foreground">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={onChange}
      className={cn('relative w-8 h-[18px] rounded-full transition-colors', on ? 'bg-primary' : 'bg-foreground/15')}>
      <span className={cn('absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform', on ? 'translate-x-3.5' : 'translate-x-0')} />
    </button>
  );
}

function EditProperty({ v, style, inName, detected, example, onChange, onRemove, onClose }: {
  v: NamingVariable; style: NamingStyle; inName: boolean; detected: { value: string; n: number }[];
  example: React.ReactNode; onChange: (u: Partial<NamingVariable>) => void;
  onRemove?: () => void; onClose: () => void;
}) {
  const auto = v.key === '#' || v.key === 'b';
  const values = v.values || [];
  const setValues = (next: NonNullable<NamingVariable['values']>) => onChange({ values: next });
  const known = new Set(values.map((m) => m.match.toLowerCase()));
  const unlisted = detected.filter((d) => !known.has(d.value.toLowerCase()));
  const custom = v.source === 'custom';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/25" onClick={onClose} />
      <div className="relative w-full max-w-[560px] max-h-[88vh] flex flex-col bg-card rounded-2xl shadow-xl border border-border">
        <div className="flex items-center justify-between px-6 h-14 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold">Edit property</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-full hover:bg-foreground/5 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-[1fr_120px] gap-3">
            <label className="block">
              <span className="text-sm font-medium">Property name</span>
              <input value={v.label} onChange={(e) => onChange({ label: e.target.value })} autoFocus={!v.label}
                placeholder="e.g. Influencer" className={cn(INPUT, 'mt-1.5')} />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Identifier</span>
              <input value={v.prefix || ''} onChange={(e) => onChange({ prefix: e.target.value.trim() })}
                placeholder="i:" className={cn(INPUT, 'mt-1.5 font-mono')} />
            </label>
          </div>
          {style !== 'readable' && v.prefix && (
            <p className="text-xs text-muted-foreground -mt-3">Identifiers appear when values are set to &ldquo;With identifiers&rdquo;.</p>
          )}

          {!auto && (
            <label className="block">
              <span className="text-sm font-medium">Value comes from</span>
              <select value={custom ? '' : v.field || ''}
                onChange={(e) => onChange(e.target.value
                  ? { source: 'field', field: e.target.value as keyof RoadmapItem }
                  : { source: 'custom', field: undefined })}
                className={cn(INPUT, 'mt-1.5')}>
                <option value="">Picked in the brief</option>
                {FIELD_OPTIONS.map((f) => <option key={f.value} value={f.value}>The brief&rsquo;s {f.label.toLowerCase()} field</option>)}
              </select>
            </label>
          )}

          {!auto && (
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">{custom ? 'Options' : 'Values'}</span>
                <span className="text-xs text-muted-foreground">
                  {custom ? 'Shown as a dropdown in the brief. Leave empty for free text.' : 'Rename a value as it appears in the name.'}
                </span>
              </div>
              {values.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <div className="grid grid-cols-[1fr_1fr_28px] gap-2 text-xs text-muted-foreground px-0.5">
                    <span>{custom ? 'Option' : 'When the brief says'}</span><span>Written in the name as</span><span />
                  </div>
                  {values.map((m, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_28px] gap-2 items-center">
                      <input value={m.match} placeholder={custom ? 'Before & after' : 'video'}
                        onChange={(e) => setValues(values.map((x, j) => (j === i ? { ...x, match: e.target.value } : x)))}
                        className={cn(INPUT, 'h-8')} />
                      <input value={m.output} placeholder={m.match || (style === 'readable' ? 'Video' : 'VID')}
                        onChange={(e) => setValues(values.map((x, j) => (j === i ? { ...x, output: e.target.value } : x)))}
                        className={cn(INPUT, 'h-8 font-mono')} />
                      <button type="button" onClick={() => setValues(values.filter((_, j) => j !== i))} aria-label="Remove value"
                        className="p-1.5 rounded-full text-muted-foreground hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button type="button" onClick={() => setValues([...values, { match: '', output: '' }])}
                className="flex items-center gap-1 text-sm text-primary font-medium hover:underline mt-2">
                <Plus className="w-3.5 h-3.5" /> Add {custom ? 'option' : 'value'}
              </button>

              {unlisted.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Values detected in your briefs</p>
                  <div className="flex flex-wrap gap-1.5">
                    {unlisted.slice(0, 12).map((d) => (
                      <button key={d.value} type="button" title="Add to the list"
                        onClick={() => setValues([...values, { match: d.value, output: d.value }])}
                        className="flex items-center gap-1 text-xs h-7 pl-2.5 pr-2 rounded-full border border-dashed border-border hover:border-primary/40 hover:bg-primary/5 transition-colors">
                        {d.value} <span className="text-muted-foreground tabular-nums">{d.n}</span> <Plus className="w-3 h-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!auto && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium">If empty</span>
                <input value={v.fallback} onChange={(e) => onChange({ fallback: e.target.value })}
                  placeholder="Leave out" className={cn(INPUT, 'mt-1.5 font-mono')} />
              </label>
              {style === 'compact' && (
                <label className="block">
                  <span className="text-sm font-medium">Max characters</span>
                  <input type="number" min={1} value={v.maxLength || ''} placeholder="No limit"
                    onChange={(e) => onChange({ maxLength: parseInt(e.target.value) || undefined })}
                    className={cn(INPUT, 'mt-1.5')} />
                </label>
              )}
            </div>
          )}

          <div>
            <span className="text-sm font-medium">Example of an ad name</span>
            {inName ? example : <p className="text-xs text-muted-foreground mt-1.5">This property is not in the name. Switch it on in the list to include it.</p>}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 h-16 border-t border-border flex-shrink-0">
          {onRemove ? (
            <button type="button" onClick={onRemove} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-600">
              <Trash2 className="w-3.5 h-3.5" /> Delete property
            </button>
          ) : <span />}
          <button type="button" onClick={onClose}
            className="h-9 px-5 rounded-full bg-foreground text-background text-sm font-medium hover:bg-foreground/90">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
