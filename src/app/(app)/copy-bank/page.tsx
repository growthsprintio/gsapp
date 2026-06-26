'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Plus, Copy, Check, Type } from 'lucide-react';
import type { CopyBankEntry } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<CopyBankEntry['type'], string> = {
  primary_text: 'Primary Text',
  headline: 'Headline',
  description: 'Description',
  hook: 'Hook',
};

const TYPE_COLORS: Record<CopyBankEntry['type'], string> = {
  primary_text: 'bg-secondary text-foreground',
  headline: 'bg-secondary text-foreground',
  description: 'bg-secondary text-muted-foreground',
  hook: 'bg-orange-50 text-orange-700',
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
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
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

export default function CopyBankPage() {
  const copyBank = useAppStore((s) => s.copyBank);
  const addCopyEntry = useAppStore((s) => s.addCopyEntry);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<CopyBankEntry['type'] | 'all'>('all');
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
          <p className="text-sm text-muted-foreground mt-0.5">Reusable ad copy for your team.</p>
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

      {/* Filter */}
      <div className="flex items-center gap-2 mb-5">
        {(['all', 'primary_text', 'headline', 'hook', 'description'] as const).map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors',
              filter === t ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
            {t === 'all' ? `All (${copyBank.length})` : TYPE_LABELS[t as CopyBankEntry['type']]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Type className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No copy entries yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((e) => <CopyCard key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  );
}
