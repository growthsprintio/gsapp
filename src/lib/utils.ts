import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function nanoid() {
  return Math.random().toString(36).slice(2, 11);
}

export function generateAdName(opts: {
  brand?: string;
  format?: string;
  size?: string;
  angle?: string;
  concept?: string;
  product?: string;
  index?: number;
}): string {
  const brand = (opts.brand || 'BRD').toUpperCase().slice(0, 3);
  const format = (opts.format || 'GEN').toUpperCase().slice(0, 3);
  const size = (opts.size || '1X1').replace(':', 'X').replace('.', '');
  const angle = (opts.angle || 'GEN').toUpperCase().replace(/\s+/g, '').slice(0, 5);
  const idx = String(opts.index || 1).padStart(3, '0');
  return `${brand}_${format}_${size}_${angle}_${idx}`;
}

import type { NamingConvention, NamingVariable, RoadmapItem } from './types';

export const DEFAULT_NAMING_CONVENTION: NamingConvention = {
  formula: '{b}{sep}{f}{sep}{s}{sep}{a}{sep}{#}',
  separator: '_',
  variables: [
    { key: 'b', label: 'Brand', source: 'custom', fallback: 'BRD', maxLength: 5, values: [] },
    { key: 'f', label: 'Format', source: 'field', field: 'adFormat', fallback: 'GEN', maxLength: 5, values: [
      { match: 'static', output: 'STA' }, { match: 'video', output: 'VID' },
      { match: 'carousel', output: 'CAR' }, { match: 'ugc', output: 'UGC' },
      { match: 'motion', output: 'MOT' }, { match: 'collection', output: 'COL' },
    ]},
    { key: 's', label: 'Size', source: 'field', field: 'adSize', fallback: '1X1', maxLength: 5, values: [
      { match: '1:1', output: '1x1' }, { match: '4:5', output: '4x5' },
      { match: '9:16', output: '9x16' }, { match: '16:9', output: '16x9' },
      { match: '1.91:1', output: '191x1' },
    ]},
    { key: 'a', label: 'Angle', source: 'field', field: 'angle', fallback: 'GEN', maxLength: 8, values: [
      { match: 'Pain Point', output: 'PAIN' }, { match: 'Social Proof', output: 'SOCIAL' },
      { match: 'Hook', output: 'HOOK' }, { match: 'Curiosity', output: 'CURIOSITY' },
      { match: 'Urgency', output: 'URGENCY' }, { match: 'Before/After', output: 'BA' },
      { match: 'Lifestyle', output: 'LIFE' }, { match: 'Testimonial', output: 'TESTI' },
    ]},
    { key: 'c', label: 'Concept', source: 'field', field: 'concept', fallback: '', maxLength: 10, values: [] },
    { key: 'p', label: 'Product', source: 'field', field: 'product', fallback: '', maxLength: 8, values: [] },
    { key: 'pc', label: 'Product Category', source: 'field', field: 'productCategory', fallback: '', maxLength: 8, values: [] },
    // Presets without a dedicated column — they live in item.variables and the
    // brief renders a field for each automatically.
    { key: 'pe', label: 'Persona', source: 'custom', fallback: '', maxLength: 8, values: [] },
    { key: 'h', label: 'Hook', source: 'custom', fallback: '', maxLength: 10, values: [] },
    { key: 'i', label: 'Influencer', source: 'custom', fallback: '', maxLength: 10, values: [] },
    { key: 'o', label: 'Offer', source: 'custom', fallback: '', maxLength: 10, values: [] },
    { key: 'lp', label: 'Landing Page', source: 'custom', fallback: '', maxLength: 12, values: [] },
    { key: '#', label: 'Index', source: 'custom', fallback: '001', values: [] },
  ],
};

/**
 * The prefixed, human-readable scheme from the 9/29 review:
 *   af: Video | f: before and after | p: cat spray | a: softer fur
 * Offered as a preset rather than the default so existing ad names keep
 * resolving the way they always have.
 *
 * Note the prefixes are display labels, not storage keys — {f} stays "format"
 * internally and simply renders as "af:".
 */
export const READABLE_NAMING_CONVENTION: NamingConvention = {
  style: 'readable',
  separator: ' | ',
  // {#} is included so sibling creatives in a batch don't collide — ad names
  // have to stay distinguishable in Meta's ad-level reporting. It carries no
  // prefix: the review defined af:/f:/p: but left i:, o: and lp: undefined,
  // and inventing a meaning for them would defeat the point of a convention.
  formula: '{f}{sep}{c}{sep}{p}{sep}{a}{sep}{#}',
  variables: DEFAULT_NAMING_CONVENTION.variables.map((v) => {
    // af:, f:, p: and a: come from the 9/29 example; i:, o: and lp: were
    // confirmed on 10/15 as influencer, offer and landing page. pe: and h:
    // follow the same shape but were never stated — change them if Chris
    // meant something else.
    const prefix: Record<string, string> = {
      f: 'af:', c: 'f:', p: 'p:', pc: 'pc:', a: 'a:', s: 's:', b: 'b:',
      i: 'i:', o: 'o:', lp: 'lp:', pe: 'pe:', h: 'h:',
    };

    // Shortcode mappings are a compact-style device — keeping them here would
    // render "af: VID" instead of "af: Video". Formats still map, but to words.
    const values = v.key === 'f'
      ? [
        { match: 'static', output: 'Static' }, { match: 'video', output: 'Video' },
        { match: 'carousel', output: 'Carousel' }, { match: 'ugc', output: 'UGC' },
        { match: 'motion', output: 'Motion' }, { match: 'collection', output: 'Collection' },
      ]
      : [];

    return { ...v, prefix: prefix[v.key] ?? '', values };
  }),
};

export function applyNamingConvention(
  convention: NamingConvention,
  item: Partial<RoadmapItem>,
  extra?: { brand?: string; index?: number; customValues?: Record<string, string> }
): string {
  const style = convention.style ?? 'compact';
  let result = convention.formula;
  result = result.replace(/\{sep\}/g, convention.separator);

  // "af:" + "Video" → "af: Video". Prefixes are a readable-style device; in
  // compact names they'd inject colons into shortcodes and sidestep maxLength.
  // An empty value drops its prefix too, so we don't emit a bare "f:".
  const withPrefix = (v: NamingVariable, value: string) =>
    v.prefix && style === 'readable' && value ? `${v.prefix} ${value}` : value;

  for (const v of convention.variables) {
    const placeholder = `{${v.key}}`;
    if (!result.includes(placeholder)) continue;

    if (v.key === '#') {
      const n = String(extra?.index ?? 1).padStart(3, '0');
      result = result.replace(placeholder, withPrefix(v, n));
      continue;
    }

    let raw = '';
    if (extra?.customValues?.[v.key]) {
      raw = extra.customValues[v.key];
    } else if (item.variables?.[v.key]) {
      // Stored on the item, so names resolve outside the open drawer too.
      raw = item.variables[v.key];
    } else if (v.key === 'b') {
      raw = extra?.brand || v.fallback;
    } else if (v.source === 'field' && v.field) {
      // Multi-select fields store comma-joined values — name from the first selection.
      raw = ((item[v.field] as string) || '').split(',')[0].trim();
    }

    const mapping = v.values?.find((m) => m.match.toLowerCase() === raw.toLowerCase());
    let output = mapping ? mapping.output : raw;
    if (!output) output = v.fallback;

    if (style === 'readable') {
      // Keep the words. maxLength is a compact-style device — applying it here
      // would cut "before and after" to "before and".
      output = output.trim().replace(/\s+/g, ' ');
    } else {
      output = output.toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
      if (v.maxLength) output = output.slice(0, v.maxLength);
    }

    // Function replacement, not a string: a value containing $&, $1 or $`
    // would otherwise be read as a replacement pattern. Compact style used to
    // strip "$" so this was unreachable; readable style keeps it.
    result = result.replace(placeholder, () => withPrefix(v, output));
  }

  // Variables that resolved to nothing leave their separators behind
  // ("af: Video |  | p: cat spray"). Collapse the runs and trim the ends.
  const sep = convention.separator;
  if (sep) {
    const esc = sep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result
      .replace(new RegExp(`(?:${esc}){2,}`, 'g'), sep)
      .replace(new RegExp(`^(?:${esc})+|(?:${esc})+$`, 'g'), '');
  }

  return result.trim();
}

/**
 * The content of a duplicated creative, so the same asset and copy can go into
 * another campaign or ad set.
 *
 * Pure so it can be tested on its own; the store supplies ids and timestamps.
 */
export function buildDuplicateFields(
  source: RoadmapItem,
  convention: NamingConvention,
  extra?: { brand?: string; index?: number },
): Partial<RoadmapItem> {
  return {
    // The copy has not been pushed, and is attached to nothing.
    metaAdId: undefined,
    metaCampaignId: undefined,
    metaAdSetId: undefined,
    launchedAt: undefined,
    // Copying a live ad gives you an approved draft, not a second live ad.
    status: source.status === 'launched' ? 'ready_to_launch' : source.status,
    // Two ads sharing a name are indistinguishable in Meta's ad-level
    // reporting, so rebuild it from the convention with a fresh index.
    adName: source.adName
      ? applyNamingConvention(convention, source, {
        brand: extra?.brand,
        index: extra?.index ?? 1,
        customValues: source.variables,
      }) || `${source.adName} copy`
      : '',
  };
}

/** Keys the app computes rather than asking the user for. */
const COMPUTED_KEYS = new Set(['#', 'b']);

/**
 * Every variable the brief has to collect a value for.
 *
 * This is what makes a convention and a brief the same thing: anything a
 * workspace adds in Settings appears in the brief, instead of silently having
 * nowhere to be filled in. Previously only variables that already carried a
 * list of options were shown, so a newly added variable was unreachable.
 */
export function getBriefVariables(convention: NamingConvention): NamingVariable[] {
  return convention.variables.filter((v) => v.source === 'custom' && !COMPUTED_KEYS.has(v.key));
}

/** @deprecated use getBriefVariables — kept so older imports don't break. */
export const getCustomVariables = getBriefVariables;

