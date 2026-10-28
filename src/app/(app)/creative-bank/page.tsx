'use client';

import { useAppStore } from '@/lib/store';
import { CreativeInput } from '@/components/asset-drop';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BriefsTab } from './briefs-tab';
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
          <span className="text-[11px] font-medium border border-border rounded-full px-2 py-0.5 capitalize flex-shrink-0 text-muted-foreground">
            {entry.format}
          </span>
        </div>
        {entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {entry.tags.map((tag) => (
              <span key={tag} className="text-[11px] text-muted-foreground border border-border rounded-full px-2 py-0.5">{tag}</span>
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
      <span className="text-[11px] font-medium border border-border rounded-full px-2 py-0.5 capitalize flex-shrink-0 text-muted-foreground">
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

function LibraryTab() {
  const creativeBank = useAppStore((s) => s.creativeBank) || [];
  const addCreativeEntry = useAppStore((s) => s.addCreativeEntry);
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<AdFormat | 'all'>('all');
  const [view, setView] = useState<'tiles' | 'rows'>('rows');
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">
          Finished ads and reference assets. Upload files or link to Drive, Frame.io or a CDN.
        </p>
        <button onClick={() => setShowNew(!showNew)}
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium pl-3.5 pr-4 h-9 rounded-full shadow-sm hover:bg-primary/90 transition-colors flex-shrink-0">
          <Plus className="w-4 h-4" /> Add creative
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
            <label className="text-xs font-medium block mb-1.5">Creative *</label>
            <CreativeInput
              value={form.url}
              onChange={(url) => setForm((f) => ({
                ...f,
                url,
                title: f.title || (url.split('/').pop() || '').replace(/-[a-z0-9]+\.[a-z0-9]+$/i, '') || '',
              }))}
            />
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

type Tab = 'library' | 'briefs';

export default function CreativesPage() {
  // useSearchParams needs a Suspense boundary in this Next version.
  return <Suspense><Creatives /></Suspense>;
}

function Creatives() {
  // The URL is the source of truth so the sidebar's Library / Briefs links
  // and these tabs always agree.
  const params = useSearchParams();
  const router = useRouter();
  const tab: Tab = params.get('tab') === 'briefs' ? 'briefs' : 'library';
  const briefCount = useAppStore((s) => (s.outreach || []).length);

  const choose = (t: Tab) => router.replace(t === 'briefs' ? '/creative-bank?tab=briefs' : '/creative-bank', { scroll: false });

  return (
    <div className="px-8 pt-7 pb-10 max-w-5xl">
      <h1 className="text-[26px] leading-tight font-semibold">Creatives</h1>
      <p className="text-sm text-muted-foreground mt-1">Your creative library, and the briefs you send to creators and designers.</p>

      <div className="flex items-center gap-6 border-b border-border mt-6 mb-6">
        {([['library', 'Library', null], ['briefs', 'Briefs', briefCount]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => choose(key)}
            className={cn('relative h-10 text-sm font-medium transition-colors',
              tab === key ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {label}
            {count ? <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{count}</span> : null}
            {tab === key && <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        ))}
      </div>

      {tab === 'library' ? <LibraryTab /> : <BriefsTab />}
    </div>
  );
}
