'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Video, Send, Inbox, Trash2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { BriefDrawer } from '@/components/brief-drawer';
import { OUTREACH_STATUS, formatDue } from '@/lib/outreach';
import { creatorBriefsIn } from '@/lib/creator-brief';
import { useCreatorSync } from '@/lib/use-creator-sync';
import type { OutreachBrief, RoadmapItem } from '@/lib/types';

/** Every creator brief across your roadmaps. Each one opens in the brief popup. */
export function BriefsTab() {
  const roadmaps = useAppStore((s) => s.roadmaps);
  const currentAccountId = useAppStore((s) => s.currentAccountId);
  const legacy = useAppStore((s) => s.outreach) || [];
  const active = useMemo(
    () => roadmaps.filter((r) => r.accountId === currentAccountId && r.status === 'active'),
    [roadmaps, currentAccountId],
  );
  const briefs = useMemo(() => creatorBriefsIn(active), [active]);
  useCreatorSync();

  const [drawer, setDrawer] = useState<{ roadmapId: string; item: RoadmapItem | null } | null>(null);
  const [choosing, setChoosing] = useState(false);

  const start = () => {
    // One roadmap needs no question.
    if (active.length === 1) setDrawer({ roadmapId: active[0].id, item: null });
    else setChoosing((c) => !c);
  };

  const waiting = briefs.filter((b) => b.item.creatorBrief.status === 'submitted').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <p className="text-sm text-muted-foreground">
          {waiting > 0
            ? <><span className="text-foreground font-medium">{waiting} creator{waiting === 1 ? ' has' : 's have'} sent work back.</span> Open a brief to review it.</>
            : 'Brief a creator, send them the link, and their content comes back to the roadmap. They don’t need an account.'}
        </p>
        <div className="relative flex-shrink-0">
          <button onClick={start} disabled={active.length === 0} className="btn btn-primary">
            <Plus className="w-4 h-4" /> New creator brief
          </button>
          {choosing && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setChoosing(false)} />
              <div className="absolute right-0 top-11 z-30 w-64 bg-card border border-border rounded-xl shadow-lg p-1.5">
                <p className="px-3 py-1.5 text-xs text-muted-foreground">Which roadmap is it for?</p>
                <div className="max-h-64 overflow-y-auto">
                  {active.map((r) => (
                    <button key={r.id} onClick={() => { setChoosing(false); setDrawer({ roadmapId: r.id, item: null }); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors truncate">
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {active.length === 0 ? (
        <div className="text-center px-6 py-12 rounded-xl border border-dashed border-border bg-card/60">
          <Video className="w-5 h-5 text-primary mx-auto" />
          <p className="text-base font-semibold mt-3">Creator briefs live on a roadmap</p>
          <p className="text-sm text-muted-foreground mt-1">Create a roadmap first, then brief a creator from here.</p>
          <Link href="/roadmaps" className="text-sm font-medium text-primary hover:underline mt-2 inline-block">Go to roadmaps</Link>
        </div>
      ) : briefs.length === 0 ? (
        <button onClick={start}
          className="w-full text-center px-6 py-12 rounded-xl border border-dashed border-border bg-card/60 hover:bg-card hover:border-primary/40 transition-colors">
          <Video className="w-5 h-5 text-primary mx-auto" />
          <p className="text-base font-semibold mt-3">Write your first creator brief</p>
          <p className="text-sm text-muted-foreground mt-1">For influencers and UGC creators filming content.</p>
        </button>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-xs divide-y divide-border">
          {briefs.map(({ roadmap, item }) => {
            const cb = item.creatorBrief;
            const st = OUTREACH_STATUS[cb.status];
            const pieces = cb.deliverables.filter((d) => d.label).length;
            return (
              <button key={item.id} onClick={() => setDrawer({ roadmapId: roadmap.id, item })}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/40 transition-colors first:rounded-t-xl last:rounded-b-xl">
                <span className="w-9 h-9 rounded-full bg-primary/8 text-primary flex items-center justify-center flex-shrink-0">
                  <Video className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.concept || 'Untitled brief'}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {[cb.recipientName || cb.recipientEmail || 'No creator yet', cb.recipientHandle,
                      `${pieces} deliverable${pieces === 1 ? '' : 's'}`, roadmap.name].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {item.dueDate && <span className="text-xs text-muted-foreground flex-shrink-0">Due {formatDue(item.dueDate)}</span>}
                {cb.status === 'submitted' && <Inbox className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                {cb.status === 'sent' && <Send className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full w-[104px] text-center flex-shrink-0', st.className)}>
                  {st.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {legacy.length > 0 && <Unfiled briefs={legacy} roadmaps={active} />}

      {drawer && (
        <BriefDrawer open onClose={() => setDrawer(null)} roadmapId={drawer.roadmapId} editItem={drawer.item} startAsCreator />
      )}
    </div>
  );
}

/**
 * Briefs written before creator briefs lived on roadmaps. Moving one keeps its
 * id and share link, so a creator holding the link can still send work back.
 */
function Unfiled({ briefs, roadmaps }: { briefs: OutreachBrief[]; roadmaps: { id: string; name: string }[] }) {
  const addItem = useAppStore((s) => s.addItem);
  const remove = useAppStore((s) => s.deleteOutreach);

  const move = (b: OutreachBrief, roadmapId: string) => {
    addItem(roadmapId, {
      status: b.status === 'draft' ? 'idea' : b.status === 'submitted' ? 'in_review' : 'briefed',
      adName: '', adFormat: 'ugc', maker: 'creator',
      concept: b.title, description: b.overview, product: b.product, angle: b.angle, dueDate: b.dueDate,
      inspirationLink: b.references.join('\n'),
      owners: b.recipientName ? { maker: b.recipientName } : undefined,
      creatorBrief: {
        id: b.id, status: b.status, recipientName: b.recipientName, recipientEmail: b.recipientEmail,
        recipientHandle: b.recipientHandle, keyMessages: b.keyMessages, hooks: b.hooks, dos: b.dos, donts: b.donts,
        deliverables: b.deliverables, compensation: b.compensation, usageRights: b.usageRights,
        shareToken: b.shareToken, sentAt: b.sentAt, viewedAt: b.viewedAt, submissions: b.submissions,
      },
    });
    remove(b.id);
  };

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold">Not on a roadmap yet</h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">Move these to a roadmap to keep working on them. Links you already sent keep working.</p>
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {briefs.map((b) => (
          <div key={b.id} className="flex items-center gap-3 px-5 py-3">
            <p className="text-sm font-medium truncate flex-1 min-w-0">{b.title || 'Untitled brief'}</p>
            <select value="" onChange={(e) => { if (e.target.value) move(b, e.target.value); }} aria-label={`Move ${b.title} to a roadmap`}
              className="h-8 text-xs bg-card border border-border rounded-full pl-3 flex-shrink-0">
              <option value="">Move to…</option>
              {roadmaps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={() => { if (window.confirm(`Delete "${b.title || 'Untitled brief'}"?`)) remove(b.id); }}
              aria-label="Delete brief" title="Delete"
              className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
