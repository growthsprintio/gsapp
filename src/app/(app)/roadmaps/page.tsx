'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ownersOf } from '@/lib/ownership';
import { cn } from '@/lib/utils';
import { NewRoadmapDialog } from '@/components/new-roadmap-dialog';
import type { Roadmap } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

// Mini pipeline health squares on the card
const MINI_STAGES = [
  { key: 'idea', label: 'Idea' },
  { key: 'briefed', label: 'Briefed' },
  { key: 'in_review', label: 'Review' },
  { key: 'ready_to_launch', label: 'Approved' },
  { key: 'launched', label: 'Live' },
] as const;


function lastUpdated(roadmap: Roadmap) {
  if (roadmap.items.length === 0) return null;
  const latest = roadmap.items.reduce((a, b) => a.updatedAt > b.updatedAt ? a : b);
  return formatDistanceToNow(new Date(latest.updatedAt), { addSuffix: true });
}

function RoadmapCard({ roadmap, isAgency }: { roadmap: Roadmap; isAgency?: boolean }) {
  const archiveRoadmap = useAppStore((s) => s.archiveRoadmap);
  const items = roadmap.items;
  const counts = Object.fromEntries(MINI_STAGES.map(({ key }) => [key, items.filter((i) => i.status === key).length]));
  const ago = lastUpdated(roadmap);

  // Agency workspaces surface the client name; brand/personal just show the period/type.
  const tag = isAgency && roadmap.client
    ? `Client · ${roadmap.client}`
    : roadmap.period || roadmap.type.charAt(0).toUpperCase() + roadmap.type.slice(1);

  // Whoever actually owns work in this roadmap.
  const people = [...new Set(items.flatMap((i) => Object.values(ownersOf(i)).filter(Boolean) as string[]))];

  return (
    <div className="group relative bg-card border border-border rounded-xl p-5 flex flex-col gap-4 hover:-translate-y-0.5 hover:shadow-md transition-all">
      {/* Title, tag and archive. The title's link covers the whole card. */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold">
              <Link href={`/roadmaps/${roadmap.id}`} className="after:absolute after:inset-0 after:rounded-xl focus:outline-none">
                {roadmap.name}
              </Link>
            </h3>
            <span className="bg-primary/8 text-primary text-xs font-medium px-2 py-0.5 rounded-full capitalize">{tag}</span>
          </div>
          {roadmap.description && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-1">{roadmap.description}</p>
          )}
        </div>
        <button
          onClick={() => { if (window.confirm(`Archive "${roadmap.name}"?`)) archiveRoadmap(roadmap.id); }}
          title="Archive roadmap" aria-label="Archive roadmap"
          className="relative z-10 p-1.5 -m-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all flex-shrink-0">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Creatives by stage */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Creatives by stage</p>
        <div className="flex items-end gap-1.5">
          {MINI_STAGES.map(({ key, label }) => {
            const count = counts[key] ?? 0;
            const isLive = key === 'launched';
            return (
              <div key={key}
                title={`${count} creative${count !== 1 ? 's' : ''} in ${label}`}
                className={cn(
                  'flex-1 rounded-lg flex flex-col items-center justify-center py-2 gap-0.5 border',
                  isLive && count > 0
                    ? 'bg-primary border-primary text-white'
                    : count > 0
                    ? 'bg-secondary border-border text-foreground'
                    : 'bg-secondary border-border text-muted-foreground'
                )}>
                <span className="text-sm font-semibold tabular-nums">{count}</span>
                <span className="text-[11px] leading-tight text-center opacity-70">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team, updated, and where a click goes */}
      <div className="flex items-center gap-3 mt-auto">
        {people.length > 0 && (
          <div className="flex -space-x-2" title={people.join(', ')}>
            {people.slice(0, 3).map((name) => (
              <div key={name}
                className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                {name[0].toUpperCase()}
              </div>
            ))}
          </div>
        )}
        {ago && <p className="text-[11px] text-muted-foreground truncate min-w-0" title={`Updated ${ago}`}>Updated {ago}</p>}
        <span className="ml-auto text-xs font-medium text-foreground group-hover:text-primary transition-colors whitespace-nowrap">
          Open roadmap →
        </span>
      </div>
    </div>
  );
}

export default function RoadmapsPage() {
  const roadmaps = useAppStore((s) => s.roadmaps);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const currentAccount = useAppStore((s) => s.currentAccount)();
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');

  const active = roadmaps.filter((r) => r.accountId === currentAccountId && r.status === 'active');
  const allItems = active.flatMap((r) => r.items);
  const inFlight = allItems.filter((i) => ['idea', 'briefed', 'in_review'].includes(i.status)).length;
  const approved = allItems.filter((i) => i.status === 'ready_to_launch').length;
  const launched = allItems.filter((i) => i.status === 'launched').length;

  const filtered = active.filter((r) =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase())
  );

  const isAgency = currentAccount?.type === 'agency';
  const clientCount = new Set(active.map((r) => r.client).filter(Boolean)).size;

  const STATS = [
    {
      label: 'Active roadmaps',
      value: active.length,
      sub: isAgency ? `Across ${clientCount} client${clientCount !== 1 ? 's' : ''}` : 'In this workspace',
    },
    { label: 'Creatives in progress', value: inFlight, sub: 'Idea → Review' },
    { label: 'Approved', value: approved, sub: 'Ready to launch' },
    { label: 'Launched', value: launched, sub: 'In these roadmaps' },
  ];

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[26px] leading-tight font-semibold mb-2">{currentAccount?.name ?? 'Your roadmaps'}</h1>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              {isAgency
                ? 'Every client and campaign gets its own self-contained creative roadmap — pipeline, briefs, approvals, and Meta launches in one workspace.'
                : 'Every campaign and product line gets its own creative roadmap — from idea to briefed, reviewed, approved, and launched to Meta.'}
            </p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="btn btn-primary flex-shrink-0">
            <Plus className="w-4 h-4" /> New roadmap
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, sub }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-2">{label}</p>
            <p className="text-4xl font-semibold tabular-nums tracking-tight text-foreground mb-2">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* All Roadmaps header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold">All roadmaps</h2>
          <span className="text-xs font-medium bg-secondary border border-border text-muted-foreground px-2.5 py-1 rounded-full">
            {active.length} active
          </span>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roadmaps"
            className="bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/30 w-52"
          />
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <p className="text-sm text-muted-foreground mb-2">
            {search ? 'No roadmaps match your search.' : 'No active roadmaps yet.'}
          </p>
          <button onClick={() => setShowNew(true)} className="text-sm text-primary hover:underline">
            Create your first roadmap
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((r) => <RoadmapCard key={r.id} roadmap={r} isAgency={isAgency} />)}
        </div>
      )}

      <NewRoadmapDialog open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
