import { BRAND_MARKS } from './brand-marks';
import { cn } from '@/lib/utils';

/**
 * Integration logos.
 *
 * Meta and Slack ship as their real marks. Frame.io and Motion are not in any
 * of the open logo sets — not simple-icons (3,466 icons) and not SVG Logos
 * (2,227) — so rather than substitute an unrelated glyph and call it a logo,
 * they get a lettermark in their brand colour. It reads as deliberate, and
 * swapping in an official asset later is a one-line change here.
 */
const BRANDS: Record<string, { mark?: string; letter?: string; color: string; tint: string }> = {
  meta: { mark: 'meta-icon', color: '#0081FB', tint: 'bg-[#0081FB]/10' },
  slack: { mark: 'slack-icon', color: '#611f69', tint: 'bg-[#611f69]/10' },
  frameio: { letter: 'F', color: '#5B53FF', tint: 'bg-[#5B53FF]/10' },
  motion: { letter: 'M', color: '#1A1A1A', tint: 'bg-[#1A1A1A]/8' },
};

export function BrandIcon({ brand, className }: { brand: keyof typeof BRANDS | string; className?: string }) {
  const b = BRANDS[brand];
  const box = cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', className);

  if (!b) return <div className={cn(box, 'bg-secondary')} />;

  const mark = b.mark ? BRAND_MARKS[b.mark] : undefined;

  return (
    <div className={cn(box, b.tint)}>
      {mark ? (
        <svg
          viewBox={mark.viewBox}
          role="img"
          aria-hidden="true"
          className="w-[18px] h-[18px]"
          // Brand SVGs carry their own colours; rendering the body verbatim
          // keeps them unmodified, which the trademark guidelines require.
          dangerouslySetInnerHTML={{ __html: mark.body }}
        />
      ) : (
        <span className="text-sm font-bold leading-none" style={{ color: b.color }}>{b.letter}</span>
      )}
    </div>
  );
}
