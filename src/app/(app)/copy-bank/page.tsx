'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Plus, Copy, Check, Type, LayoutGrid, List } from 'lucide-react';
import type { CopyBankEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<CopyBankEntry['type'], string> = {
  primary_text: 'Primary Text',
  headline: 'Headline',
  description: 'Description',
  hook: 'Hook',
  angle: 'Angle',
  product: 'Product',
};

const TYPE_COLORS: Record<CopyBankEntry['type'], string> = {
  primary_text: 'bg-secondary text-foreground',
  headline: 'bg-secondary text-foreground',
  description: 'bg-secondary text-muted-foreground',
  hook: 'bg-orange-50 text-orange-700',
  angle: 'bg-primary/10 text-primary',
  product: 'bg-stone-100 text-stone-700',
};

function CopyCard({ entry }: { entry: CopyBankEntry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 group">
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded', TYPE_COLORS[entry.type])}>
          {TYPE_LABELS[entry.type]}
        </span>
        <button onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      <p className="text-sm leading-relaxed">{entry.content}</p>
      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {entry.tags.map((tag) => (
            <span key={tag} className="text-[11px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{tag}</span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground mt-2">Used {entry.usageCount}×</p>
    </div>
  );
}

function CopyRow({ entry }: { entry: CopyBankEntry }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(entry.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-3 group hover:border-primary/30 transition-colors">
      <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded flex-shrink-0 w-24 text-center', TYPE_COLORS[entry.type])}>
        {TYPE_LABELS[entry.type]}
      </span>
      <p className="text-sm flex-1 min-w-0 truncate" title={entry.content}>{entry.content}</p>
      {entry.tags.length > 0 && (
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {entry.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{tag}</span>
          ))}
          {entry.tags.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{entry.tags.length - 2}</span>
          )}
        </div>
      )}
      <span className="text-[11px] text-muted-foreground flex-shrink-0 w-14 text-right">Used {entry.usageCount}×</span>
      <button onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground flex-shrink-0">
        {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

export default function CopyBankPage() {
  const copyBank = useAppStore((s) => s.copyBank);
  const addCopyEntry = useAppStore((s) => s.addCopyEntry);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<CopyBankEntry['type'] | 'all'>('all');
  const [view, setView] = useState<'tiles' | 'rows'>('tiles');
  const [form, setForm] = useState({ type: 'primary_text' as CopyBankEntry['type'], content: '', tags: '' });

  const filtered = filter === 'all' ? copyBank : copyBank.filter((e) => e.type === filter);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addCopyEntry({ type: form.type, content: form.content, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) });
    setForm({ type: 'primary_text', content: '', tags: '' });
    setShowNew(false);
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Copy Bank</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Reusable ad copy, angles, and products — angles &amp; products feed the brief and ad naming.</p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Copy
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleAdd} className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-sm font-semibold">New Copy Entry</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as CopyBankEntry['type'] })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Tags (comma-separated)</label>
              <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="e.g. ugc, pain point, skincare"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5">Copy</label>
            <textarea required value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              placeholder="Enter the ad copy..."
              rows={4}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowNew(false)}
              className="border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit"
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">Save</button>
          </div>
        </form>
      )}

      {/* Filter + view toggle */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'primary_text', 'headline', 'hook', 'description', 'angle', 'product'] as const).map((t) => (
            <button key={t} onClick={() => setFilter(t)}
              className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
                filter === t ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
              {t === 'all' ? `All (${copyBank.length})` : TYPE_LABELS[t as CopyBankEntry['type']]}
            </button>
          ))}
        </div>
        <div className="flex items-center border border-border rounded-lg overflow-hidden flex-shrink-0">
          <button onClick={() => setView('tiles')} title="Tile view"
            className={cn('p-2 transition-colors',
              view === 'tiles' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button onClick={() => setView('rows')} title="Row view"
            className={cn('p-2 transition-colors border-l border-border',
              view === 'rows' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Type className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No copy entries yet.</p>
        </div>
      ) : view === 'tiles' ? (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((e) => <CopyCard key={e.id} entry={e} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => <CopyRow key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  );
}
