'use client';

import { useEffect, useState } from 'react';
import { STATUS_CONFIG, type RoadmapItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { X, Zap, ExternalLink, BarChart3 } from 'lucide-react';
import { format } from 'date-fns';

interface Metrics {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
}

// Deterministic sample metrics per ad so the demo doesn't reshuffle on every open.
function sampleMetrics(seedStr: string): Metrics {
  let seed = [...seedStr].reduce((a, c) => a + c.charCodeAt(0), 7);
  const rand = (min: number, max: number) => {
    seed = (seed * 9301 + 49297) % 233280;
    return min + (seed / 233280) * (max - min);
  };
  const impressions = Math.round(rand(40_000, 220_000));
  const ctr = rand(0.8, 2.4);
  const clicks = Math.round((impressions * ctr) / 100);
  const spend = rand(400, 2400);
  return {
    impressions,
    reach: Math.round(impressions * rand(0.55, 0.8)),
    clicks,
    ctr,
    spend,
    cpc: spend / Math.max(clicks, 1),
  };
}

const fmtInt = (n: number) => n.toLocaleString('en-US');
const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Props {
  open: boolean;
  onClose: () => void;
  item: RoadmapItem | null;
}

export function AdReportDrawer({ open, onClose, item }: Props) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [source, setSource] = useState<'live' | 'sample' | 'pending'>('pending');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !item) return;
    setSource('pending');
    setMetrics(null);
    setNote('');

    const fallback = () => {
      setMetrics(sampleMetrics(item.id));
      setSource('sample');
    };

    if (!item.metaAdId) { fallback(); return; }

    fetch(`/api/meta/insights?adId=${encodeURIComponent(item.metaAdId)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.configured && d.insights) {
          setMetrics(d.insights);
          setSource('live');
        } else {
          if (d.configured && !d.insights) setNote('No delivery data yet — the ad may still be paused or in review.');
          fallback();
        }
      })
      .catch(fallback);
  }, [open, item]);

  if (!open || !item) return null;

  const cfg = STATUS_CONFIG[item.status];
  const cards: { label: string; value: string }[] = metrics ? [
    { label: 'Spend', value: fmtMoney(metrics.spend) },
    { label: 'Impressions', value: fmtInt(metrics.impressions) },
    { label: 'Reach', value: fmtInt(metrics.reach) },
    { label: 'Clicks', value: fmtInt(metrics.clicks) },
    { label: 'CTR', value: `${metrics.ctr.toFixed(2)}%` },
    { label: 'CPC', value: fmtMoney(metrics.cpc) },
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-[440px] h-full bg-card border-l border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-border">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Ad Report</h2>
            </div>
            <p className="text-xs text-muted-foreground truncate">{item.concept || item.adName || 'Untitled'}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex-shrink-0 mt-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Ad summary */}
          <div className="bg-secondary/60 border border-border rounded-xl p-4 space-y-2">
            {item.adName && (
              <p className="text-xs font-mono">{item.adName}</p>
            )}
            <div className="flex items-center flex-wrap gap-2">
              <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', cfg.bg, cfg.color)}>{cfg.label}</span>
              {item.adFormat && (
                <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5 capitalize">{item.adFormat}</span>
              )}
              {item.launchedAt && (
                <span className="text-[10px] text-muted-foreground">Launched {format(new Date(item.launchedAt), 'MMM d, yyyy')}</span>
              )}
            </div>
            {item.metaAdId && (
              <div className="flex items-center gap-1 text-[11px] text-primary font-medium">
                <Zap className="w-3 h-3" /> {item.metaAdId}
              </div>
            )}
          </div>

          {/* Source badge */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Performance</h3>
            <span className={cn('text-[10px] font-medium rounded-full px-2 py-0.5 border',
              source === 'live'
                ? 'bg-primary/5 border-primary/20 text-primary'
                : 'bg-secondary border-border text-muted-foreground')}>
              {source === 'pending' ? 'Loading…' : source === 'live' ? 'Meta Insights · last 30 days' : 'Sample data'}
            </span>
          </div>

          {note && <p className="text-[11px] text-muted-foreground -mt-2">{note}</p>}

          {/* Metrics grid */}
          {metrics ? (
            <div className="grid grid-cols-2 gap-3">
              {cards.map(({ label, value }) => (
                <div key={label} className="bg-card border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">{label}</p>
                  <p className="text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-secondary/50 border border-border rounded-xl p-4 h-20 animate-pulse" />
              ))}
            </div>
          )}

          {source === 'sample' && (
            <p className="text-[11px] text-muted-foreground">
              Sample numbers for layout preview — connect Meta (env credentials) and launch this ad to pull live insights.
            </p>
          )}

          {/* Open in Ads Manager */}
          <a href="https://www.facebook.com/adsmanager/manage/ads" target="_blank" rel="noreferrer"
            className="flex items-center justify-center gap-2 border border-border rounded-lg py-2 text-sm hover:bg-secondary transition-colors">
            <ExternalLink className="w-4 h-4" /> Open in Ads Manager
          </a>
        </div>
      </div>
    </div>
  );
}
