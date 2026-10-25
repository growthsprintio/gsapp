import type { CopyBankEntry, CopyBankType, RoadmapItem } from './types';

/** The words that go in an ad. */
export const COPY_TYPES = ['primary_text', 'headline', 'description', 'hook'] as const;
/** The strategy copy is organised around. */
export const STRATEGY_TYPES = ['angle', 'product', 'landing_page'] as const;

export type CopyType = (typeof COPY_TYPES)[number];
export type StrategyType = (typeof STRATEGY_TYPES)[number];

export const TYPE_LABEL: Record<CopyBankType, string> = {
  primary_text: 'Primary text',
  headline: 'Headline',
  description: 'Description',
  hook: 'Hook',
  angle: 'Angle',
  product: 'Product',
  landing_page: 'Landing page',
};

export const TYPE_PLURAL: Record<CopyBankType, string> = {
  primary_text: 'Primary text',
  headline: 'Headlines',
  description: 'Descriptions',
  hook: 'Hooks',
  angle: 'Angles',
  product: 'Products',
  landing_page: 'Landing pages',
};

/**
 * Meta's recommended lengths. Going over isn't rejected — Meta truncates
 * behind "See more" — so these drive an amber warning, not an error.
 */
export const COPY_LIMIT: Partial<Record<CopyBankType, number>> = {
  primary_text: 125,
  headline: 40,
  description: 30,
};

export const isCopyType = (t: CopyBankType): t is CopyType =>
  (COPY_TYPES as readonly string[]).includes(t);

const norm = (s?: string) => (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const listHas = (list: string | undefined, value: string) =>
  (list ?? '').split(',').map(norm).includes(norm(value));

/** Does this brief use this bank entry? */
export function itemUses(entry: CopyBankEntry, item: RoadmapItem): boolean {
  const c = norm(entry.content);
  if (!c) return false;
  switch (entry.type) {
    case 'primary_text': return norm(item.primaryText) === c;
    case 'headline': return norm(item.headline) === c;
    case 'description': return norm(item.adDescription) === c;
    // A hook opens the primary text, or is set as the {h} naming variable.
    case 'hook': return norm(item.primaryText).startsWith(c) || norm(item.variables?.h) === c;
    case 'angle': return listHas(item.angle, entry.content);
    case 'product': return listHas(item.product, entry.content);
    case 'landing_page':
      return !!item.landingPage && (norm(item.landingPage) === norm(entry.url) || norm(item.landingPage) === c);
    default: return false;
  }
}

/**
 * How often an entry is actually used, read from the briefs themselves.
 *
 * Replaces the stored usageCount, which nothing ever incremented. Computing
 * it means it's always right — including copy that was typed straight into
 * a brief rather than picked from the bank.
 */
export function usageOf(entry: CopyBankEntry, items: RoadmapItem[]): { used: number; live: number } {
  let used = 0;
  let live = 0;
  for (const item of items) {
    if (!itemUses(entry, item)) continue;
    used++;
    if (item.status === 'launched') live++;
  }
  return { used, live };
}

/**
 * Bank entries ranked for a brief: ones written for this brief's product and
 * angle first, then winners, then the rest — so the picker shows the most
 * relevant copy without anyone filtering.
 */
export function rankForBrief(
  entries: CopyBankEntry[],
  brief: { product?: string; angle?: string },
): CopyBankEntry[] {
  const score = (e: CopyBankEntry) =>
    (e.product && listHas(brief.product, e.product) ? 4 : 0)
    + (e.angle && listHas(brief.angle, e.angle) ? 2 : 0)
    + (e.winner ? 1 : 0);
  return [...entries].sort((a, b) => score(b) - score(a));
}

/** Split pasted text into one entry per line, dropping blanks and duplicates. */
export function splitPasted(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const t = line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim(); // strip list bullets
    if (!t || seen.has(norm(t))) continue;
    seen.add(norm(t));
    out.push(t);
  }
  return out;
}
