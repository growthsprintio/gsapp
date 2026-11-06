'use client';

import { useEffect } from 'react';
import { useAppStore } from './store';
import type { CreatorBrief, OutreachSubmission } from './types';

/**
 * Pull opens and returned work from the shared copies onto their briefs. New
 * work moves a creative still waiting on the creator into Review, which is what
 * hands it back to the strategist. A brief's status only moves forward.
 */
export function useCreatorSync() {
  useEffect(() => {
    fetch('/api/briefs/status').then((r) => r.json()).then((d: {
      briefs?: { briefId: string; token: string; viewedAt?: string; submissions: OutreachSubmission[] }[];
    }) => {
      const { roadmaps, updateItem, updateItemStatus } = useAppStore.getState();
      for (const row of d.briefs || []) {
        for (const roadmap of roadmaps) {
          const item = roadmap.items.find((i) => i.creatorBrief?.id === row.briefId && i.creatorBrief.shareToken === row.token);
          const cb = item?.creatorBrief;
          if (!item || !cb) continue;

          const u: Partial<CreatorBrief> = {};
          if (row.viewedAt && !cb.viewedAt) u.viewedAt = row.viewedAt;
          const hasNewWork = row.submissions.length > (cb.submissions?.length ?? 0);
          if (hasNewWork) {
            u.submissions = row.submissions;
            if (cb.status !== 'approved') u.status = 'submitted';
            if (item.status === 'idea' || item.status === 'briefed') updateItemStatus(roadmap.id, item.id, 'in_review');
          } else if (row.viewedAt && cb.status === 'sent') {
            u.status = 'viewed';
          }
          if (Object.keys(u).length) updateItem(roadmap.id, item.id, { creatorBrief: { ...cb, ...u } });
        }
      }
    }).catch(() => {});
  }, []);
}
