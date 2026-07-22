'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Plus, Copy, Check, Link2, ExternalLink, Trash2, LayoutGrid, List, Clapperboard } from 'lucide-react';
import { FORMAT_OPTIONS, type CreativeBankEntry, type AdFormat } from '@/lib/types';
import { cn } from '@/lib/utils';

/** Preview an external link — renders the image when the URL is a direct image, otherwise a link placeholder. */
function Thumb({ url, className }: { url: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className={cn('bg-secondary flex items-center justify-center', className)}>
        <Link2 className="w-5 h-5 text-muted-foreground" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" onError={() => setErr(true)} className={cn('object-cover', className)} />;
}

function useCopyLink(url: string) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return { copied, copy };
}

function CreativeTile({ entry }: { entry: CreativeBankEntry }) {
  const deleteCreativeEntry = useAppStore((s) => s.deleteCreativeEntry);
  const { copied, copy } = useCopyLink(entry.url);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden group hover:border-primary/30 transition-colors">
      <Thumb url={entry.url} className="w-full h-40" />
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug">{entry.title}</p>
          <span className="text-[10px] font-medium border border-border rounded-full px-2 py-0.5 capitalize flex-shrink-0 text-muted-foreground">
            {entry.format}
          </span>
        </div>
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.tags.map((tag) => (
              <span key={tag} className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{tag}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <a href={entry.url} target="_blank" rel="noreferrer" title="Open link"
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={copy} title="Copy link"
            className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => deleteCreativeEntry(entry.id)} title="Remove"
            className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors ml-auto">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CreativeRow({ entry }: { entry: CreativeBankEntry }) {
  const deleteCreativeEntry = useAppStore((s) => s.deleteCreativeEntry);
  const { copied, copy } = useCopyLink(entry.url);

  return (
    <div className="flex items-center gap-4 bg-card border border-border rounded-lg px-3 py-2.5 group hover:border-primary/30 transition-colors">
      <Thumb url={entry.url} className="w-12 h-12 rounded-md border border-border flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.title}</p>
        <p className="text-[11px] text-muted-foreground truncate">{entry.url}</p>
      </div>
      <span className="text-[10px] font-medium border border-border rounded-full px-2 py-0.5 capitalize flex-shrink-0 text-muted-foreground">
        {entry.format}
      </span>
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <a href={entry.url} target="_blank" rel="noreferrer" title="Open link"
          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button onClick={copy} title="Copy link"
          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => deleteCreativeEntry(entry.id)} title="Remove"
          className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function CreativeBankPage() {
  const creativeBank = useAppStore((s) => s.creativeBank) || [];
  const addCreativeEntry = useAppStore((s) => s.addCreativeEntry);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<AdFormat | 'all'>('all');
  const [view, setView] = useState<'tiles' | 'rows'>('tiles');
  const [form, setForm] = useState({ title: '', url: '', format: 'static' as AdFormat, tags: '' });

  const filtered = filter === 'all' ? creativeBank : creativeBank.filter((e) => e.format === filter);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    addCreativeEntry({
      title: form.title,
      url: form.url,
      format: form.format,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    });
    setForm({ title: '', url: '', format: 'static', tags: '' });
    setShowNew(false);
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Creative Bank</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your creative library, referenced by link — Drive, Frame.io, CDN. Nothing is hosted here.
          </p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Add by Link
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleAdd} className="bg-card border border-border rounded-xl p-5 mb-6 space-y-4">
          <h3 className="text-sm font-semibold">Add Creative by Link</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1.5">Title *</label>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. UGC Testimonial — Sarah"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1.5">Format</label>
              <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value as AdFormat })}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary capitalize">
                {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5">Link *</label>
            <input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://drive.google.com/… or a direct image URL"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Direct image URLs get a preview thumbnail; other links show a link tile.</p>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1.5">Tags (comma-separated)</label>
            <input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. ugc, testimonial, 9:16"
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowNew(false)}
              className="border border-border rounded-lg px-4 py-2 text-sm hover:bg-secondary transition-colors">Cancel</button>
            <button type="submit"
              className="bg-primary text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors">Add Creative</button>
          </div>
        </form>
      )}

      {/* Filter + view toggle */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setFilter('all')}
            className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors capitalize',
              filter === 'all' ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
            All ({creativeBank.length})
          </button>
          {FORMAT_OPTIONS.filter((f) => creativeBank.some((e) => e.format === f)).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('text-xs px-3 py-1.5 rounded-full border transition-colors capitalize',
                filter === f ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:text-foreground')}>
              {f}
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
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <Clapperboard className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium mb-1">No creatives yet</p>
          <p className="text-xs text-muted-foreground mb-4">Add your first creative by pasting a link.</p>
          <button onClick={() => setShowNew(true)} className="text-sm text-primary hover:underline">Add by Link</button>
        </div>
      ) : view === 'tiles' ? (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((e) => <CreativeTile key={e.id} entry={e} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => <CreativeRow key={e.id} entry={e} />)}
        </div>
      )}
    </div>
  );
}
