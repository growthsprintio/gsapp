'use client';

import { useEffect, useState } from 'react';
import { Plus, Video, PenTool, Send, Inbox } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { OutreachEditor } from '@/components/outreach-editor';
import { KIND_LABEL, KIND_HINT, OUTREACH_STATUS, emptyOutreach, formatDue } from '@/lib/outreach';
import type { OutreachKind, OutreachBrief, OutreachSubmission } from '@/lib/types';

const KIND_ICON = { creator: Video, design: PenTool } as const;

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
  const [choosing, setChoosing] = useState(false);
  useSyncStatus();

  const create = (kind: OutreachKind) => {
    setChoosing(false);
    setOpenId(add(emptyOutreach(kind)));
  };

  const waiting = briefs.filter((b) => b.status === 'submitted').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <p className="text-sm text-muted-foreground">
          {waiting > 0
            ? <><span className="text-foreground font-medium">{waiting} brief{waiting === 1 ? ' has' : 's have'} work waiting for review.</span> Open one to approve it.</>
            : 'Write a brief, send the link, and the work comes back here. Recipients don’t need an account.'}
        </p>
        <div className="relative flex-shrink-0">
          <button onClick={() => setChoosing((c) => !c)}
            className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium pl-3.5 pr-4 h-9 rounded-full shadow-sm hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New brief
          </button>
          {choosing && <KindMenu onPick={create} onClose={() => setChoosing(false)} />}
        </div>
      </div>

      {briefs.length === 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {(['creator', 'design'] as OutreachKind[]).map((k) => {
            const Icon = KIND_ICON[k];
            return (
              <button key={k} onClick={() => create(k)}
                className="text-left p-6 rounded-xl border border-dashed border-border bg-card/60 hover:bg-card hover:border-primary/40 hover:shadow-sm transition-all">
                <Icon className="w-5 h-5 text-primary" />
                <p className="text-base font-semibold mt-3">{KIND_LABEL[k]}</p>
                <p className="text-sm text-muted-foreground mt-1">{KIND_HINT[k]}</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl shadow-xs divide-y divide-border">
          {briefs.map((b) => {
            const Icon = KIND_ICON[b.kind];
            const st = OUTREACH_STATUS[b.status];
            return (
              <button key={b.id} onClick={() => setOpenId(b.id)}
                className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/40 transition-colors first:rounded-t-xl last:rounded-b-xl">
                <span className="w-9 h-9 rounded-full bg-primary/8 text-primary flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{b.title || 'Untitled brief'}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {[b.recipientName || b.recipientEmail || 'No recipient yet', b.recipientHandle,
                      `${b.deliverables.filter((d) => d.label).length || 0} deliverable${b.deliverables.filter((d) => d.label).length === 1 ? '' : 's'}`]
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

function KindMenu({ onPick, onClose }: { onPick: (k: OutreachKind) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div className="absolute right-0 top-11 z-30 w-72 bg-card border border-border rounded-xl shadow-lg p-1.5">
        {(['creator', 'design'] as OutreachKind[]).map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <button key={k} onClick={() => onPick(k)}
              className="w-full flex items-start gap-3 text-left px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors">
              <Icon className="w-4 h-4 text-primary mt-0.5" />
              <span>
                <span className="block text-sm font-medium">{KIND_LABEL[k]}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">{KIND_HINT[k]}</span>
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
