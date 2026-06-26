'use client';

import { useAppStore } from '@/lib/store';
import { STATUS_CONFIG, type CreativeStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Lightbulb, FileText, Eye, Rocket, CheckCircle2, Clock, ArrowRight, Plus } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

const STAT_DEFS: { status: CreativeStatus; label: string; icon: React.ElementType; iconColor: string }[] = [
  { status: 'idea', label: 'Ideas', icon: Lightbulb, iconColor: STATUS_CONFIG.idea.color },
  { status: 'briefed', label: 'Briefed', icon: FileText, iconColor: 'text-muted-foreground' },
  { status: 'in_review', label: 'In Review', icon: Eye, iconColor: STATUS_CONFIG.in_review.color },
  { status: 'ready_to_launch', label: 'Ready to Launch', icon: Rocket, iconColor: STATUS_CONFIG.ready_to_launch.color },
  { status: 'launched', label: 'Launched', icon: CheckCircle2, iconColor: 'text-primary' },
];

export default function DashboardPage() {
  const allRoadmaps = useAppStore((s) => s.roadmaps);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const user = useAppStore((s) => s.user);

  const roadmaps = allRoadmaps.filter((r) => r.accountId === currentAccountId);
  const allItems = roadmaps.flatMap((r) => r.items);
  const activeRoadmaps = roadmaps.filter((r) => r.status === 'active');

  const counts = Object.fromEntries(
    STAT_DEFS.map(({ status }) => [status, allItems.filter((i) => i.status === status).length])
  ) as Record<CreativeStatus, number>;

  const recentlyLaunched = allItems
    .filter((i) => i.status === 'launched' && i.launchedAt)
    .sort((a, b) => new Date(b.launchedAt!).getTime() - new Date(a.launchedAt!).getTime())
    .slice(0, 5);

  const backlog = allItems.filter((i) => i.status === 'idea' || i.status === 'briefed').slice(0, 8);

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
        <h1 className="text-2xl font-semibold mt-0.5">
          Good morning, {user?.name?.split(' ')[0]} —
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {activeRoadmaps.length} active roadmap{activeRoadmaps.length !== 1 ? 's' : ''}  ·  {allItems.length} total creative
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-8">
        {STAT_DEFS.map(({ status, label, icon: Icon, iconColor }) => (
          <div key={status} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Icon className={cn('w-4 h-4', iconColor)} />
              <span className={cn('text-xs font-medium px-1.5 py-0.5 rounded', STATUS_CONFIG[status].bg, STATUS_CONFIG[status].color)}>
                {STATUS_CONFIG[status].label}
              </span>
            </div>
            <p className="text-3xl font-semibold">{counts[status] ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Active Roadmaps */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Active Roadmaps</h2>
            <Link href="/roadmaps" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {activeRoadmaps.map((r) => {
              const items = r.items;
              const launched = items.filter((i) => i.status === 'launched').length;
              const rtl = items.filter((i) => i.status === 'ready_to_launch').length;
              const inReview = items.filter((i) => i.status === 'in_review').length;
              return (
                <Link key={r.id} href={`/roadmaps/${r.id}`}
                  className="flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-3.5 hover:border-primary/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.type} · {items.length} creative</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {rtl > 0 && (
                      <span className="flex items-center gap-1 text-primary">
                        <Rocket className="w-3 h-3" /> {rtl} ready
                      </span>
                    )}
                    {inReview > 0 && (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Eye className="w-3 h-3" /> {inReview} review
                      </span>
                    )}
                    <span>{launched} launched</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </Link>
              );
            })}
            <Link href="/roadmaps"
              className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
              <Plus className="w-4 h-4" /> New roadmap
            </Link>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Recently Launched */}
          <div>
            <h2 className="text-sm font-semibold mb-4">Recently Launched</h2>
            {recentlyLaunched.length === 0 ? (
              <p className="text-xs text-muted-foreground">No launches yet.</p>
            ) : (
              <div className="space-y-2">
                {recentlyLaunched.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-lg px-3 py-2.5">
                    <p className="text-xs font-medium truncate">{item.adName || 'Unnamed'}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <p className="text-[11px] text-muted-foreground">
                        {item.launchedAt ? format(new Date(item.launchedAt), 'MMM d') : '—'}
                      </p>
                      {item.metaAdId && (
                        <span className="text-[11px] text-primary font-medium">· Meta</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Backlog */}
          <div>
            <h2 className="text-sm font-semibold mb-4">Backlog</h2>
            {backlog.length === 0 ? (
              <p className="text-xs text-muted-foreground">Backlog is clear.</p>
            ) : (
              <div className="space-y-1.5">
                {backlog.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-lg">
                    <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', STATUS_CONFIG[item.status].bg.replace('bg-', 'bg-').replace('-50', '-400'))} />
                    <p className="text-xs truncate flex-1">{item.concept || item.adName || 'Untitled'}</p>
                    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', STATUS_CONFIG[item.status].bg, STATUS_CONFIG[item.status].color)}>
                      {STATUS_CONFIG[item.status].label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
