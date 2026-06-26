'use client';

import { useAppStore } from '@/lib/store';
import { useState } from 'react';
import { Zap, CheckCircle2, ExternalLink, AlertCircle, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LaunchPage() {
  const roadmaps = useAppStore((s) => s.roadmaps);
  const updateItem = useAppStore((s) => s.updateItem);
  const updateItemStatus = useAppStore((s) => s.updateItemStatus);

  const [metaConnected] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);
  const [launched, setLaunched] = useState<string[]>([]);

  const readyItems = roadmaps.flatMap((r) =>
    r.items
      .filter((i) => i.status === 'ready_to_launch')
      .map((i) => ({ ...i, roadmapName: r.name, roadmapId: r.id }))
  );

  const handleLaunch = async (item: typeof readyItems[0]) => {
    setLaunching(item.id);
    await new Promise((res) => setTimeout(res, 1800));
    const fakeAdId = `act_${Math.random().toString(36).slice(2, 11)}`;
    updateItem(item.roadmapId, item.id, { metaAdId: fakeAdId });
    updateItemStatus(item.roadmapId, item.id, 'launched');
    setLaunched((l) => [...l, item.id]);
    setLaunching(null);
  };

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Meta Launch</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Push approved creative directly to Meta Ads Manager.
        </p>
      </div>

      {/* Connection status */}
      <div className={cn(
        'flex items-center justify-between rounded-xl border p-5 mb-8',
        metaConnected ? 'bg-primary/5 border-primary/20' : 'bg-muted/40 border-border'
      )}>
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', metaConnected ? 'bg-primary' : 'bg-border')}>
            <Zap className={cn('w-4 h-4', metaConnected ? 'text-white' : 'text-muted-foreground')} />
          </div>
          <div>
            <p className="text-sm font-medium">Meta Ads Manager</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {metaConnected ? 'Connected — ready to push creative' : 'Not connected — connect your Meta account to enable launch'}
            </p>
          </div>
        </div>
        {metaConnected ? (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        ) : (
          <button className="flex items-center gap-2 bg-foreground text-background text-sm font-medium px-4 py-2 rounded-lg hover:bg-foreground/90 transition-colors">
            <Link2 className="w-4 h-4" /> Connect Meta
          </button>
        )}
      </div>

      {/* Ready to launch queue */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold">Ready to Launch</h2>
          <span className="text-xs text-muted-foreground bg-secondary border border-border rounded-full px-2 py-0.5">
            {readyItems.length}
          </span>
        </div>

        {readyItems.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-xl">
            <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">No creative ready to launch</p>
            <p className="text-xs text-muted-foreground">
              Mark items as "Ready to Launch" in your roadmap to queue them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {readyItems.map((item) => {
              const isLaunching = launching === item.id;
              const isLaunched = launched.includes(item.id);
              return (
                <div key={item.id} className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium font-mono">{item.adName || 'Untitled'}</p>
                        <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 capitalize">{item.adFormat}</span>
                        {item.adSize && <span className="text-xs text-muted-foreground">{item.adSize}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">{item.roadmapName}</p>
                      {item.concept && <p className="text-xs text-muted-foreground mt-1">{item.concept}</p>}
                    </div>
                    {isLaunched ? (
                      <div className="flex items-center gap-2 text-primary">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Launched</span>
                      </div>
                    ) : (
                      <button onClick={() => handleLaunch(item)} disabled={isLaunching}
                        className="flex items-center gap-2 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60 min-w-32 justify-center">
                        {isLaunching ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Pushing...
                          </span>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" /> Push to Meta
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Launch details */}
                  <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground mb-1">Primary Text</p>
                      <p className="line-clamp-2">{item.primaryText || <span className="text-muted-foreground italic">Not set</span>}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Headline</p>
                      <p>{item.headline || <span className="text-muted-foreground italic">Not set</span>}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Landing Page</p>
                      {item.landingPage ? (
                        <a href={item.landingPage} target="_blank" rel="noreferrer"
                          className="text-primary flex items-center gap-1 hover:underline">
                          <ExternalLink className="w-3 h-3" /> View page
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic">Not set</span>
                      )}
                    </div>
                  </div>

                  {(!item.primaryText || !item.headline) && (
                    <div className="mt-3 flex items-center gap-2 text-muted-foreground text-xs">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Missing copy — add primary text and headline in the brief before launching.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Launched recently */}
      {roadmaps.flatMap((r) => r.items.filter((i) => i.status === 'launched' && i.metaAdId)).length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold mb-4">Recently Launched via GrowthSprint</h2>
          <div className="space-y-2">
            {roadmaps.flatMap((r) =>
              r.items
                .filter((i) => i.status === 'launched' && i.metaAdId)
                .map((i) => (
                  <div key={i.id} className="flex items-center gap-4 bg-card border border-border rounded-lg px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-sm font-mono flex-1 truncate">{i.adName}</p>
                    <span className="text-xs text-muted-foreground font-mono">{i.metaAdId}</span>
                    <span className="text-xs text-primary font-medium">Launched</span>
                  </div>
                ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
