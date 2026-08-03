'use client';

import { useEffect, useState } from 'react';
import { X, Zap, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoadmapItem } from '@/lib/types';
import { META_CTAS } from '@/lib/types';

interface AdSetOption {
  id: string; name: string; status: string; campaignId: string; campaignName: string;
}

interface Result { id: string; ok: boolean; adId?: string; error?: string }

/** Pick one campaign + ad set, then push every selected creative into it. */
export function BulkLaunchModal({ open, onClose, items, onLaunched }: {
  open: boolean;
  onClose: () => void;
  items: RoadmapItem[];
  onLaunched: (results: Result[]) => void;
}) {
  const [adSets, setAdSets] = useState<AdSetOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [campaignId, setCampaignId] = useState('');
  const [adSetId, setAdSetId] = useState('');
  const [cta, setCta] = useState('');
  const [state, setState] = useState<'idle' | 'launching' | 'done'>('idle');
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setState('idle'); setResults([]); setError('');
    setLoading(true);
    fetch('/api/meta/adsets')
      .then((r) => r.json())
      .then((d) => {
        setAdSets(d.adsets || []);
        if (d.error) setError(d.error);
        if (!d.configured) setError('Meta is not connected for this workspace.');
      })
      .catch(() => setError('Could not load campaigns.'))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  // Anything missing the pieces Meta requires can't be included.
  const blocked = items.filter((i) => !i.creativeLink || !i.landingPage || !i.primaryText || !i.headline);
  const ready = items.filter((i) => !blocked.includes(i));

  const launch = async () => {
    setState('launching'); setError('');
    try {
      const res = await fetch('/api/meta/launch-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metaAdSetId: adSetId,
          items: ready.map((i) => ({
            id: i.id,
            adName: i.adName || i.concept || 'Untitled',
            primaryText: i.primaryText,
            headline: i.headline,
            adDescription: i.adDescription,
            landingPage: i.landingPage,
            creativeLink: i.creativeLink,
            adFormat: i.adFormat,
            metaCTA: cta || i.metaCTA,
          })),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Launch failed.');
      setResults(d.results || []);
      setState('done');
      onLaunched(d.results || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Launch failed.');
      setState('idle');
    }
  };

  const campaigns = [...new Map(adSets.map((a) => [a.campaignId, a.campaignName])).entries()];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-start justify-between px-6 py-5 border-b border-border">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Launch {items.length} creative{items.length !== 1 ? 's' : ''}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              All selected ads go into the same ad set, created paused.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {state === 'done' ? (
            <>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">
                  {results.filter((r) => r.ok).length} launched
                  {results.some((r) => !r.ok) && `, ${results.filter((r) => !r.ok).length} failed`}
                </p>
              </div>
              <div className="space-y-1.5">
                {results.map((r) => {
                  const item = items.find((i) => i.id === r.id);
                  return (
                    <div key={r.id} className="flex items-start gap-2 text-xs border border-border rounded-lg px-3 py-2">
                      {r.ok
                        ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                        : <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item?.concept || item?.adName || 'Untitled'}</p>
                        {r.ok
                          ? <p className="text-[11px] text-muted-foreground font-mono">{r.adId}</p>
                          : <p className="text-[11px] text-red-600">{r.error}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href="https://www.facebook.com/adsmanager/manage/ads" target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-2 border border-border rounded-lg py-2 text-sm hover:bg-secondary transition-colors">
                <ExternalLink className="w-4 h-4" /> Review in Ads Manager
              </a>
            </>
          ) : (
            <>
              {error && (
                <div className="flex items-start gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[11px] text-red-600">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1.5">Campaign</label>
                  <select value={campaignId} disabled={loading}
                    onChange={(e) => { setCampaignId(e.target.value); setAdSetId(''); }}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50">
                    <option value="">{loading ? 'Loading…' : 'Select campaign…'}</option>
                    {campaigns.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1.5">Ad Set</label>
                  <select value={adSetId} disabled={!campaignId}
                    onChange={(e) => setAdSetId(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50">
                    <option value="">{campaignId ? 'Select ad set…' : 'Pick a campaign first'}</option>
                    {adSets.filter((a) => a.campaignId === campaignId).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}{a.status !== 'ACTIVE' ? ` (${a.status.toLowerCase()})` : ''}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5">
                  Call to Action <span className="text-muted-foreground font-normal">(applies to all)</span>
                </label>
                <select value={cta} onChange={(e) => setCta(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">Use each creative&apos;s own CTA</option>
                  {META_CTAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              {/* What will actually go out */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 bg-muted/50 border-b border-border">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {ready.length} ready{blocked.length > 0 && ` · ${blocked.length} skipped`}
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-border">
                  {ready.map((i) => (
                    <div key={i.id} className="flex items-center gap-2 px-3 py-2">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      <p className="text-xs truncate">{i.concept || i.adName || 'Untitled'}</p>
                    </div>
                  ))}
                  {blocked.map((i) => (
                    <div key={i.id} className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                      <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <p className="text-xs truncate text-muted-foreground">{i.concept || i.adName || 'Untitled'}</p>
                      <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                        missing {[
                          !i.creativeLink && 'creative',
                          !i.primaryText && 'primary text',
                          !i.headline && 'headline',
                          !i.landingPage && 'landing page',
                        ].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3">
          <button onClick={onClose}
            className="flex-1 border border-border rounded-lg py-2 text-sm hover:bg-secondary transition-colors">
            {state === 'done' ? 'Done' : 'Cancel'}
          </button>
          {state !== 'done' && (
            <button onClick={launch}
              disabled={!adSetId || ready.length === 0 || state === 'launching'}
              className="flex-1 bg-primary text-white rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
              {state === 'launching' ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Launching {ready.length}…
                </>
              ) : (
                <><Zap className="w-4 h-4" /> Launch {ready.length} paused</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
