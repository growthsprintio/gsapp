'use client';

import { useEffect, useState } from 'react';
import { Plus, Video, Send, Inbox } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { OutreachEditor } from '@/components/outreach-editor';
import { OUTREACH_STATUS, emptyOutreach, formatDue } from '@/lib/outreach';
import type { OutreachBrief, OutreachSubmission } from '@/lib/types';

/**
 * Pull opens and returned work from the shared copies. A brief only moves
 * forward: new work makes it "Work received" again unless it's already
 * approved, and an open only matters while it's still just "Sent".
 */
function useSyncStatus() {
  const update = useAppStore((s) => s.updateOutreach);
  useEffect(() => {
    fetch('/api/briefs/status').then((r) => r.json()).then((d: {
      briefs?: { briefId: string; token: string; viewedAt?: string; submissions: OutreachSubmission[] }[];
    }) => {
      const local = useAppStore.getState().outreach || [];
      for (const row of d.briefs || []) {
        const b = local.find((x) => x.id === row.briefId && x.shareToken === row.token);
        if (!b) continue;
        const u: Partial<OutreachBrief> = {};
        if (row.viewedAt && !b.viewedAt) u.viewedAt = row.viewedAt;
        if (row.submissions.length > (b.submissions?.length ?? 0)) {
          u.submissions = row.submissions;
          if (b.status !== 'approved') u.status = 'submitted';
        } else if (row.viewedAt && b.status === 'sent') {
          u.status = 'viewed';
        }
        if (Object.keys(u).length) update(b.id, u);
      }
    }).catch(() => {});
  }, [update]);
}

export function BriefsTab() {
  const briefs = useAppStore((s) => s.outreach) || [];
  const add = useAppStore((s) => s.addOutreach);
  const [openId, setOpenId] = useState<string | null>(null);
  useSyncStatus();

  const create = () => setOpenId(add(emptyOutreach('creator')));
  const waiting = briefs.filter((b) => b.status === 'submitted').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <p className="text-sm text-muted-foreground">
          {waiting > 0
            ? <><span className="text-foreground font-medium">{waiting} creator{waiting === 1 ? ' has' : 's have'} sent work back.</span> Open a brief to review it.</>
            : 'Brief a creator, send them the link, and their content comes back here. They don’t need an account.'}
        </p>
        <button onClick={create} className="btn btn-primary flex-shrink-0">
          <Plus className="w-4 h-4" /> New creator brief
        </button>
      </div>

      {briefs.length === 0 ? (
        <button onClick={create}
          className="w-full text-center px-6 py-12 rounded-xl border border-dashed border-border bg-card/60 hover:bg-card hover:border-primary/40 transition-colors">
          <Video className="w-5 h-5 text-primary mx-auto" />
          <p className="text-base font-semibold mt-3">Write your first creator brief</p>
          <p className="text-sm text-muted-foreground mt-1">For influencers and UGC creators filming content.</p>
        </button>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-xs divide-y divide-border">
          {briefs.map((b) => {
            const st = OUTREACH_STATUS[b.status];
            const count = b.deliverables.filter((d) => d.label).length;
            return (
              <button key={b.id} onClick={() => setOpenId(b.id)}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/40 transition-colors first:rounded-t-xl last:rounded-b-xl">
                <span className="w-9 h-9 rounded-full bg-primary/8 text-primary flex items-center justify-center flex-shrink-0">
                  <Video className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.title || 'Untitled brief'}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {[b.recipientName || b.recipientEmail || 'No creator yet', b.recipientHandle,
                      `${count} deliverable${count === 1 ? '' : 's'}`]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                {b.dueDate && <span className="text-xs text-muted-foreground flex-shrink-0">Due {formatDue(b.dueDate)}</span>}
                {b.status === 'submitted' && <Inbox className="w-4 h-4 text-amber-600 flex-shrink-0" />}
                {b.status === 'sent' && <Send className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full w-[104px] text-center flex-shrink-0', st.className)}>
                  {st.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {openId && <OutreachEditor briefId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
