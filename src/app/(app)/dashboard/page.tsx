'use client';

import { useAppStore } from '@/lib/store';
import { STATUS_CONFIG, type CreativeStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Rocket, ArrowRight, Plus, CalendarClock, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

const FUNNEL: { status: CreativeStatus; label: string }[] = [
  { status: 'idea', label: 'Idea' },
  { status: 'briefed', label: 'Briefed' },
  { status: 'in_review', label: 'Review' },
  { status: 'ready_to_launch', label: 'Approved' },
  { status: 'launched', label: 'Launched' },
];

const DAY = 86400000;

export default function DashboardPage() {
  const allRoadmaps = useAppStore((s) => s.roadmaps);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const user = useAppStore((s) => s.user);

  const roadmaps = allRoadmaps.filter((r) => r.accountId === currentAccountId);
  const activeRoadmaps = roadmaps.filter((r) => r.status === 'active');
  const allItems = roadmaps.flatMap((r) => r.items);

  const now = Date.now();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const inProgress = allItems.filter((i) => ['idea', 'briefed', 'in_review'].includes(i.status)).length;
  const launchedL7 = allItems.filter((i) => i.status === 'launched' && i.launchedAt && now - new Date(i.launchedAt).getTime() <= 7 * DAY).length;
  const launchedMTD = allItems.filter((i) => i.status === 'launched' && i.launchedAt && new Date(i.launchedAt).getTime() >= startOfMonth.getTime()).length;

  const funnelCounts = FUNNEL.map((f) => ({ ...f, count: allItems.filter((i) => i.status === f.status).length }));
  const funnelMax = Math.max(1, ...funnelCounts.map((f) => f.count));
  const launched30 = allItems.filter((i) => i.status === 'launched' && i.launchedAt && now - new Date(i.launchedAt).getTime() <= 30 * DAY).length;

  const recentRoadmaps = [...activeRoadmaps]
    .sort((a, b) => {
      const la = a.items.reduce((m, i) => (i.updatedAt > m ? i.updatedAt : m), a.createdAt);
      const lb = b.items.reduce((m, i) => (i.updatedAt > m ? i.updatedAt : m), b.createdAt);
      return lb.localeCompare(la);
    })
    .slice(0, 3);

  const recentlyLaunched = allItems
    .filter((i) => i.status === 'launched' && i.launchedAt)
    .sort((a, b) => new Date(b.launchedAt!).getTime() - new Date(a.launchedAt!).getTime())
    .slice(0, 4);

  const dueNext = allItems
    .filter((i) => i.status !== 'launched' && i.dueDate)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
    .slice(0, 3);

  const STATS = [
    { label: 'Active Roadmaps', value: activeRoadmaps.length, sub: `${roadmaps.length} total` },
    { label: 'Creative In Progress', value: inProgress, sub: 'Idea → Review' },
    { label: 'Launched · L7D', value: launchedL7, sub: 'Last 7 days' },
    { label: 'Launched · MTD', value: launchedMTD, sub: 'Month to date' },
  ];

  return (
    <div className="px-8 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{format(new Date(), 'EEEE, MMMM d')}</p>
        <h1 className="text-2xl font-semibold mt-0.5">Good morning, {user?.name?.split(' ')[0]} —</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {activeRoadmaps.length} active roadmap{activeRoadmaps.length !== 1 ? 's' : ''} · {inProgress} creative in progress
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {STATS.map(({ label, value, sub }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-5">
            <p className="text-xs text-muted-foreground mb-2">{label}</p>
            <p className="text-4xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-2">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: funnel + roadmaps */}
        <div className="col-span-2 space-y-6">
          {/* Pipeline funnel */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Creative Pipeline — Idea to Launch</h2>
              <span className="text-xs text-muted-foreground">{launched30} launched · last 30 days</span>
            </div>
            <div className="space-y-2.5">
              {funnelCounts.map((f) => (
                <div key={f.status} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-16 flex-shrink-0">{f.label}</span>
                  <div className="flex-1 bg-secondary rounded-md h-7 overflow-hidden">
                    <div
                      className={cn('h-full rounded-md flex items-center justify-end px-2 transition-all',
                        f.status === 'launched' ? 'bg-primary' : 'bg-primary/30')}
                      style={{ width: `${Math.max((f.count / funnelMax) * 100, f.count > 0 ? 8 : 0)}%` }}
                    >
                      {f.count > 0 && (
                        <span className={cn('text-xs font-bold', f.status === 'launched' ? 'text-white' : 'text-foreground')}>{f.count}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent roadmaps (3 most recent) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold">Recent Roadmaps</h2>
              <Link href="/roadmaps" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {recentRoadmaps.map((r) => {
                const items = r.items;
                const launched = items.filter((i) => i.status === 'launched').length;
                const rtl = items.filter((i) => i.status === 'ready_to_launch').length;
                return (
                  <Link key={r.id} href={`/roadmaps/${r.id}`}
                    className="flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-3.5 hover:border-primary/40 transition-colors group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 capitalize">{r.type} · {items.length} creative</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {rtl > 0 && (
                        <span className="flex items-center gap-1 text-primary">
                          <Rocket className="w-3 h-3" /> {rtl} ready
                        </span>
                      )}
                      <span>{launched} launched</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </Link>
                );
              })}
              {recentRoadmaps.length === 0 && (
                <Link href="/roadmaps"
                  className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="w-4 h-4" /> Create your first roadmap
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Right: Due next + Recently launched */}
        <div className="space-y-6">
          {/* Due Next */}
          <div>
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4 text-muted-foreground" /> Due Next
            </h2>
            {dueNext.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <div className="space-y-2">
                {dueNext.map((item) => (
                  <div key={item.id} className="bg-card border border-border rounded-lg px-3 py-2.5">
                    <p className="text-xs font-medium truncate">{item.concept || item.adName || 'Untitled'}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', STATUS_CONFIG[item.status].bg, STATUS_CONFIG[item.status].color)}>
                        {STATUS_CONFIG[item.status].label}
                      </span>
                      <span className="text-[11px] text-muted-foreground">Due {format(new Date(item.dueDate!), 'MMM d')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently Launched — thumbnails */}
          <div>
            <h2 className="text-sm font-semibold mb-4">Recently Launched</h2>
            {recentlyLaunched.length === 0 ? (
              <p className="text-xs text-muted-foreground">No launches yet.</p>
            ) : (
              <div className="space-y-2">
                {recentlyLaunched.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-card border border-border rounded-lg p-2">
                    <div className="w-11 h-11 rounded-md bg-secondary border border-border flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {item.creativeLink ? (
                        <img src={item.creativeLink} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.concept || item.adName || 'Untitled'}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {item.launchedAt ? format(new Date(item.launchedAt), 'MMM d') : '—'}
                        {item.metaAdId && <span className="text-primary font-medium"> · Meta</span>}
                      </p>
                    </div>
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
