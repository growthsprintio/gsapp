'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
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

const TEAM_INITIALS = ['JM', 'SP', 'CL', 'AR'];

function lastUpdated(roadmap: Roadmap) {
  if (roadmap.items.length === 0) return null;
  const latest = roadmap.items.reduce((a, b) => a.updatedAt > b.updatedAt ? a : b);
  return formatDistanceToNow(new Date(latest.updatedAt), { addSuffix: true });
}

function RoadmapCard({ roadmap, onNew }: { roadmap: Roadmap; onNew?: () => void }) {
  const archiveRoadmap = useAppStore((s) => s.archiveRoadmap);
  const items = roadmap.items;
  const counts = Object.fromEntries(MINI_STAGES.map(({ key }) => [key, items.filter((i) => i.status === key).length]));
  const ago = lastUpdated(roadmap);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-primary/20 transition-colors">
      {/* Tag pill */}
      <div className="flex justify-center">
        <span className="bg-orange-50 text-primary text-xs font-medium px-4 py-1 rounded-full border border-orange-100">
          {roadmap.type === 'client' && roadmap.client
            ? `Client | ${roadmap.client}`
            : `${roadmap.type === 'monthly' ? 'DTC' : roadmap.type === 'quarterly' ? 'DTC' : 'Campaign'} | ${roadmap.period || roadmap.type}`}
        </span>
      </div>

      {/* Title & description */}
      <div>
        <h3 className="text-base font-bold mb-1">{roadmap.name}</h3>
        {roadmap.description && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{roadmap.description}</p>
        )}
      </div>

      {/* Edit / delete */}
      <div className="flex items-center gap-2">
        <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => archiveRoadmap(roadmap.id)}
          className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Pipeline health mini squares */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Pipeline health</p>
        <div className="flex items-end gap-1.5">
          {MINI_STAGES.map(({ key, label }) => {
            const count = counts[key] ?? 0;
            const isLive = key === 'launched';
            return (
              <div key={key}
                className={cn(
                  'flex-1 rounded-lg flex flex-col items-center justify-center py-2 gap-0.5 border',
                  isLive && count > 0
                    ? 'bg-primary border-primary text-white'
                    : count > 0
                    ? 'bg-secondary border-border text-foreground'
                    : 'bg-secondary border-border text-muted-foreground'
                )}>
                <span className="text-sm font-bold">{count}</span>
                <span className="text-[9px] leading-tight text-center opacity-60">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team + updated */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {TEAM_INITIALS.slice(0, 3).map((init, i) => (
            <div key={i}
              className="w-6 h-6 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-bold text-muted-foreground">
              {init[0]}
            </div>
          ))}
        </div>
        {ago && <p className="text-[11px] text-muted-foreground">Updated {ago}</p>}
      </div>

      {/* Single full-width action */}
      <Link href={`/roadmaps/${roadmap.id}`}
        className="flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-primary/90 transition-colors">
        Open roadmap →
      </Link>
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

  const STATS = [
    { label: 'Active Roadmaps', value: active.length, sub: `Across ${new Set(active.map((r) => r.client || r.type)).size} brands` },
    { label: 'Creatives In-Flight', value: inFlight, sub: 'Idea → In Review' },
    { label: 'Approved This Week', value: approved, sub: 'Ready to launch' },
    { label: 'Launched', value: launched, sub: 'Last 7 days' },
  ];

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Hero */}
      <div className="bg-card border border-border rounded-2xl p-8 mb-6 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div>
            <div className="inline-flex items-center bg-orange-50 border border-orange-100 rounded-full px-4 py-1 mb-4">
              <span className="text-xs font-medium text-primary tracking-wide uppercase text-[11px]">Creative Command Center</span>
            </div>
            <h1 className="text-4xl font-bold mb-3">{currentAccount?.name ?? 'Your Roadmaps'}</h1>
            <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
              Every brand, client, and product line gets its own self-contained creative roadmap —
              pipeline, briefs, approvals, and Meta launches in one electric workspace.
            </p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-colors flex-shrink-0">
            <Plus className="w-4 h-4" /> New Roadmap
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, sub }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-2">{label}</p>
            <p className="text-5xl font-bold text-foreground mb-2">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        ))}
      </div>

      {/* All Roadmaps header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">All Roadmaps</h2>
          <span className="text-xs font-medium bg-secondary border border-border text-muted-foreground px-2.5 py-1 rounded-full">
            {active.length} active
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Roadmaps"
              className="bg-card border border-border text-foreground placeholder:text-muted-foreground text-sm pl-9 pr-4 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary/30 w-52"
            />
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-2 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Roadmap
          </button>
        </div>
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl">
          <p className="text-sm text-muted-foreground mb-2">
            {search ? 'No roadmaps match your search.' : 'No active roadmaps yet.'}
          </p>
          <button onClick={() => setShowNew(true)} className="text-sm text-primary hover:underline">
            Create your first roadmap
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((r) => <RoadmapCard key={r.id} roadmap={r} />)}
        </div>
      )}

      <NewRoadmapDialog open={showNew} onClose={() => setShowNew(false)} />
    </div>
  );
}
