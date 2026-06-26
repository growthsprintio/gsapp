'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { applyNamingConvention, getCustomVariables } from '@/lib/utils';
import { FORMAT_OPTIONS, SIZE_OPTIONS, type RoadmapItem, type AdFormat } from '@/lib/types';
import { X, Wand2, ExternalLink, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRef } from 'react';

const DEFAULT_ANGLES = ['Pain Point', 'Social Proof', 'Hook', 'Curiosity', 'Urgency', 'Lifestyle', 'Before/After', 'Tutorial', 'Comparison', 'Testimonial', 'UGC Raw', 'Founder Story'];

function AngleMultiSelect({ selected, onChange }: { selected: string[]; onChange: (angles: string[]) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const allOptions = [...new Set([...DEFAULT_ANGLES, ...selected])];
  const filtered = allOptions.filter(
    (a) => !selected.includes(a) && a.toLowerCase().includes(query.toLowerCase())
  );
  const canCreate = query.trim() && !allOptions.some((a) => a.toLowerCase() === query.trim().toLowerCase());

  const addAngle = (angle: string) => {
    onChange([...selected, angle]);
    setQuery('');
    inputRef.current?.focus();
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
        addAngle(query.trim());
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
          placeholder={selected.length === 0 ? 'Search or create angles...' : 'Add more...'}
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
              onClick={() => addAngle(query.trim())}
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
  product: '', dueDate: '', adLength: '',
};

export function BriefDrawer({ open, onClose, roadmapId, editItem }: Props) {
  const addItem = useAppStore((s) => s.addItem);
  const updateItem = useAppStore((s) => s.updateItem);
  const namingConvention = useAppStore((s) => s.namingConvention);
  const currentAccount = useAppStore((s) => s.currentAccount)();
  const [form, setForm] = useState<typeof EMPTY>({ ...EMPTY });
  const [tab, setTab] = useState<'brief' | 'copy' | 'launch'>('brief');
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const customVars = getCustomVariables(namingConvention);

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
        landingPage: editItem.landingPage || '',
        product: editItem.product || '',
        dueDate: editItem.dueDate || '',
        adLength: editItem.adLength || '',
      });
    } else {
      setForm({ ...EMPTY });
    }
    setTab('brief');
  }, [editItem, open]);

  if (!open) return null;

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const setCustom = (key: string, val: string) => setCustomValues((cv) => ({ ...cv, [key]: val }));

  const generateName = () => {
    const name = applyNamingConvention(namingConvention, form, {
      brand: currentAccount?.name?.slice(0, 3) || 'BRD',
      index: Math.floor(Math.random() * 99) + 1,
      customValues,
    });
    set('adName', name);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editItem) {
      updateItem(roadmapId, editItem.id, form as Partial<RoadmapItem>);
    } else {
      addItem(roadmapId, { ...form, status: 'idea' });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[560px] h-full bg-card border-l border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h2 className="font-semibold">{editItem ? 'Edit Brief' : 'New Creative Brief'}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          {(['brief', 'copy', 'launch'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 text-xs py-2.5 font-medium border-b-2 -mb-px transition-colors capitalize ${
                tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              {t === 'launch' ? 'Launch Setup' : t === 'copy' ? 'Ad Copy' : 'Brief'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-4">
            {tab === 'brief' && (
              <>
                {/* Custom Identifiers */}
                {customVars.length > 0 && (
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Custom Identifiers</label>
                    <div className={`grid gap-2 ${customVars.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                      {customVars.map((v) => (
                        <div key={v.key}>
                          <label className="text-[11px] text-muted-foreground block mb-1">{v.label}</label>
                          <select
                            value={customValues[v.key] || ''}
                            onChange={(e) => setCustom(v.key, e.target.value)}
                            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                            <option value="">Select {v.label.toLowerCase()}...</option>
                            {v.values?.map((opt: { match: string; output: string }) => (
                              <option key={opt.match} value={opt.match}>
                                {opt.match} → {opt.output}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">Set in Settings → Naming convention.</p>
                  </div>
                )}

                {/* Ad Name */}
                <div>
                  <label className="text-xs font-medium block mb-1.5">Ad Name</label>
                  <div className="flex gap-2">
                    <input value={form.adName} onChange={(e) => set('adName', e.target.value)}
                      placeholder="Auto-generated or enter manually"
                      className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
                    />
                    <button type="button" onClick={generateName}
                      title="Generate ad name"
                      className="border border-border rounded-lg px-3 py-2 text-muted-foreground hover:text-primary hover:border-primary transition-colors">
                      <Wand2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">Fill Format, Size, and Angle first, then use the wand to auto-generate.</p>
                </div>

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
                    <label className="text-xs font-medium block mb-1.5">Ad Size</label>
                    <select value={form.adSize} onChange={(e) => set('adSize', e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                      {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Angle — multi-select */}
                <div>
                  <label className="text-xs font-medium block mb-1.5">Creative Angle</label>
                  <AngleMultiSelect
                    selected={form.angle ? form.angle.split(', ').filter(Boolean) : []}
                    onChange={(angles) => set('angle', angles.join(', '))}
                  />
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
                  <label className="text-xs font-medium block mb-1.5">Description / Direction</label>
                  <textarea value={form.description} onChange={(e) => set('description', e.target.value)}
                    placeholder="Detailed creative direction, references, notes..."
                    rows={3}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                {/* Product + Due Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Product</label>
                    <input value={form.product} onChange={(e) => set('product', e.target.value)}
                      placeholder="e.g. Serum Pro"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Due Date</label>
                    <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Ad Length (optional for video) */}
                {(form.adFormat === 'video' || form.adFormat === 'ugc') && (
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Ad Length (optional)</label>
                    <select value={form.adLength} onChange={(e) => set('adLength', e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="">Select length</option>
                      {['0:06', '0:15', '0:30', '0:45', '1:00', '1:30', '2:00+'].map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                )}

                {/* Links */}
                <div>
                  <label className="text-xs font-medium block mb-1.5">Inspiration Link</label>
                  <input value={form.inspirationLink} onChange={(e) => set('inspirationLink', e.target.value)}
                    placeholder="https://..."
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Creative Link</label>
                    <input value={form.creativeLink} onChange={(e) => set('creativeLink', e.target.value)}
                      placeholder="Drive / Dropbox..."
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1.5">Frame.io Link</label>
                    <input value={form.frameioLink} onChange={(e) => set('frameioLink', e.target.value)}
                      placeholder="Frame.io review link"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </>
            )}

            {tab === 'copy' && (
              <>
                <div>
                  <label className="text-xs font-medium block mb-1.5">Primary Text</label>
                  <textarea value={form.primaryText} onChange={(e) => set('primaryText', e.target.value)}
                    placeholder="The main body copy for this ad..."
                    rows={5}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">{form.primaryText.length} characters</p>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5">Headline</label>
                  <input value={form.headline} onChange={(e) => set('headline', e.target.value)}
                    placeholder="Short, punchy headline"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5">Description (optional)</label>
                  <input value={form.adDescription} onChange={(e) => set('adDescription', e.target.value)}
                    placeholder="Ad link description"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </>
            )}

            {tab === 'launch' && (
              <>
                <div className="bg-secondary/60 border border-border rounded-lg p-4 mb-4">
                  <p className="text-xs font-medium mb-1">Meta Launch Setup</p>
                  <p className="text-xs text-muted-foreground">Configure launch settings before pushing to Meta Ads Manager.</p>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5">Landing Page URL</label>
                  <input value={form.landingPage} onChange={(e) => set('landingPage', e.target.value)}
                    placeholder="https://yourbrand.com/product"
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium">Launch to Meta</p>
                    <span className="text-xs text-muted-foreground border border-border rounded px-2 py-0.5">
                      {editItem?.metaAdId ? `Active: ${editItem.metaAdId}` : 'Not yet launched'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    Creative must be in <span className="font-medium text-primary">Ready to Launch</span> status before pushing to Meta.
                  </p>
                  <button type="button"
                    disabled={editItem?.status !== 'ready_to_launch'}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white text-sm font-medium py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <ExternalLink className="w-4 h-4" />
                    {editItem?.metaAdId ? 'View in Meta Ads Manager' : 'Push to Meta'}
                  </button>
                  {editItem?.status !== 'ready_to_launch' && (
                    <p className="text-[11px] text-muted-foreground mt-2 text-center">
                      Change status to "Ready to Launch" to enable push.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 px-6 py-4 border-t border-border bg-card flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-secondary transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors">
              {editItem ? 'Save Changes' : 'Save Brief'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
