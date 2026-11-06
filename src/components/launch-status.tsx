'use client';

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MetaAdStatus } from '@/lib/types';

const OPTIONS: { value: MetaAdStatus; label: string }[] = [
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ACTIVE', label: 'Active' },
];

/**
 * Whether an ad goes to Meta paused or active. Always starts on Paused, per
 * launch: going active spends money, so it's never a remembered default.
 */
export function LaunchStatusToggle({ value, onChange, adSetStatus, campaignStatus }: {
  value: MetaAdStatus;
  onChange: (v: MetaAdStatus) => void;
  /** Of the chosen ad set and its campaign, once one is picked. */
  adSetStatus?: string;
  campaignStatus?: string;
}) {
  // An active ad only delivers if everything above it is active too.
  const stopped = [
    campaignStatus && campaignStatus !== 'ACTIVE' && 'campaign',
    adSetStatus && adSetStatus !== 'ACTIVE' && 'ad set',
  ].filter(Boolean);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium">Launch as</span>
        <div className="flex items-center bg-muted rounded-full p-0.5" role="radiogroup" aria-label="Launch as">
          {OPTIONS.map((o) => (
            <button key={o.value} type="button" role="radio" aria-checked={value === o.value}
              onClick={() => onChange(o.value)}
              className={cn('h-7 px-3 rounded-full text-xs font-medium transition-colors',
                value === o.value
                  ? o.value === 'ACTIVE' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground')}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
      {value === 'ACTIVE' && (
        <p className={cn('flex items-start gap-1.5 text-[11px] mt-2 rounded-lg px-3 py-2 border',
          stopped.length ? 'text-amber-800 bg-amber-50 border-amber-100' : 'text-foreground bg-primary/5 border-primary/15')}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {stopped.length
            ? `This ${stopped.join(' and ')} ${stopped.length > 1 ? 'are' : 'is'} not active, so the ad won’t run until you turn ${stopped.length > 1 ? 'them' : 'it'} on in Ads Manager.`
            : 'Starts spending this ad set’s budget as soon as Meta approves the ad.'}
        </p>
      )}
    </div>
  );
}
